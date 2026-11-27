import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Setting from "../models/Setting.js";
import User from "../models/User.js";
import { createOrderStatusNotification } from "../services/notificationService.js";
import { deriveHandoffOtp, issueHandoffOtp } from "../services/handoffOtpService.js";
import { syncOrderProductSales } from "../services/productSalesService.js";
import {
  getUnreviewedOrderItems,
  scheduleReviewReminders,
} from "../services/reviewReminderService.js";

const COLLECTION_METHODS = ["cash", "pos", "transfer"];

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  throw error;
};

const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const listCourierOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    assignedCourier: req.user._id,
    status: { $in: ["confirmed", "preparing", "on_the_way"] },
  })
    .populate("items.product", "name images")
    .populate("user", "name phone email")
    .sort({ courierAssignedAt: -1, createdAt: -1 });
  res.json({ success: true, data: orders });
});

const assignCourier = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.body.courierId)) {
    fail("A valid order and courier are required.");
  }
  const [order, courier] = await Promise.all([
    Order.findById(req.params.id),
    User.findOne({ _id: req.body.courierId, role: "courier", isActive: true }),
  ]);
  if (!order) fail("Order not found.", 404);
  if (!courier) fail("Active courier not found.", 404);
  if (order.deliveryMethod !== "own")
    fail("Only own-fleet orders can be assigned to a courier.", 409);
  if (!["confirmed", "preparing"].includes(order.status)) {
    fail("The order must be confirmed before a courier can be assigned.", 409);
  }
  if (order.paymentMethod === "paystack" && !["paid", "reconciled"].includes(order.paymentStatus)) {
    fail("Online payment must be confirmed before courier assignment.", 409);
  }
  if (["cancelled", "refunded", "delivered", "picked_up"].includes(order.status)) {
    fail("This order can no longer be assigned.", 409);
  }

  order.assignedCourier = courier._id;
  order.courierAssignedAt = new Date();
  await order.save();
  await order.populate("assignedCourier", "name email phone");
  res.json({ success: true, data: order });
});

const startDelivery = asyncHandler(async (req, res) => {
  const delivery = await runInTransaction(async (session) => {
    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    })
      .select("+handoffOtpVersion")
      .session(session);
    if (!order) fail("Assigned order not found.", 404);
    if (order.deliveryMethod !== "own") fail("This is not an own-fleet delivery.", 409);
    if (!["confirmed", "preparing", "on_the_way"].includes(order.status)) {
      fail("This order cannot be started from its current status.", 409);
    }
    if (
      order.paymentMethod === "paystack" &&
      !["paid", "reconciled"].includes(order.paymentStatus)
    ) {
      fail("Online payment must be confirmed before delivery starts.", 409);
    }

    const setting = await Setting.findOne({ key: "handoff_otp_expiry_minutes" })
      .session(session)
      .lean();
    const expiryMinutes = Math.max(15, Number(setting?.value) || 240);
    const statusChanged = order.status !== "on_the_way";
    order.status = "on_the_way";
    issueHandoffOtp(order, expiryMinutes);
    await order.save({ session });

    if (statusChanged) {
      await createOrderStatusNotification(order, "on_the_way", { session });
    }
    return { orderId: order._id, expiresAt: order.handoffOtpExpiresAt };
  });
  res.json({ success: true, data: delivery });
});

const getHandoffCode = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("+handoffOtpVersion");
  if (!order) fail("Order not found.", 404);
  if (!order.handoffOtpVersion || !order.handoffOtpExpiresAt) {
    fail("The handoff code has not been issued yet.", 409);
  }
  if (order.handoffOtpVerifiedAt) fail("This handoff code has already been used.", 409);
  if (order.handoffOtpExpiresAt.getTime() <= Date.now())
    fail("This handoff code has expired.", 409);

  res.json({
    success: true,
    data: {
      code: deriveHandoffOtp(order),
      expiresAt: order.handoffOtpExpiresAt,
    },
  });
});

const confirmCollection = asyncHandler(async (req, res) => {
  const { otp, method, amount, reference = "" } = req.body;
  if (!COLLECTION_METHODS.includes(method)) fail("Select cash, POS, or transfer.");
  if (!Number.isSafeInteger(amount) || amount < 0) fail("Collected amount must be integer kobo.");
  if (method !== "cash" && !String(reference).trim()) {
    fail("A POS or transfer reference is required.");
  }

  const order = await Order.findOne({
    _id: req.params.id,
    assignedCourier: req.user._id,
  }).select("+handoffOtpVersion");
  if (!order) fail("Assigned order not found.", 404);
  if (order.paymentMethod !== "pay_on_delivery")
    fail("This order is not payment on delivery.", 409);
  if (order.paymentStatus !== "unpaid") fail("Payment has already been recorded.", 409);
  if (order.status !== "on_the_way") fail("Start the delivery before confirming handoff.", 409);
  if (!order.handoffOtpVersion || order.handoffOtpExpiresAt?.getTime() <= Date.now()) {
    fail(
      "The handoff code is missing or expired. Start the delivery again to issue a new code.",
      409,
    );
  }
  if (order.handoffOtpAttemptCount >= 5)
    fail("Too many incorrect attempts. Issue a new code.", 429);
  if (amount !== order.total) fail("The collected amount must match the order total.", 409);

  const expected = deriveHandoffOtp(order);
  if (!/^\d{6}$/.test(String(otp)) || String(otp) !== expected) {
    order.handoffOtpAttemptCount += 1;
    await order.save();
    fail("The handoff code is incorrect.", 409);
  }

  const completedOrder = await runInTransaction(async (session) => {
    const currentOrder = await Order.findOne({
      _id: order._id,
      assignedCourier: req.user._id,
      status: "on_the_way",
      paymentStatus: "unpaid",
    })
      .select("+handoffOtpVersion")
      .session(session);
    if (!currentOrder) fail("The order changed before handoff could be recorded.", 409);
    if (String(otp) !== deriveHandoffOtp(currentOrder)) {
      fail("The handoff code changed. Ask the customer for the latest code.", 409);
    }

    const now = new Date();
    currentOrder.handoffOtpVerifiedAt = now;
    currentOrder.collectedAmount = amount;
    currentOrder.collectionMethod = method;
    currentOrder.collectionReference = String(reference).trim();
    currentOrder.collectedBy = req.user._id;
    currentOrder.collectedAt = now;
    currentOrder.paymentStatus = "collected";
    currentOrder.reconciliationStatus = "pending";
    currentOrder.status = "delivered";
    const reviewItems = await getUnreviewedOrderItems(currentOrder, {
      session,
    });
    await scheduleReviewReminders(currentOrder, reviewItems, {
      session,
      completedAt: now,
    });
    await syncOrderProductSales(currentOrder, "delivered", session);
    await currentOrder.save({ session });

    await Payment.create(
      [
        {
          order: currentOrder._id,
          provider: "offline",
          amount: currentOrder.total,
          channel: method,
          status: "collected",
          paidAt: now,
          collectedAmount: amount,
          collectedBy: req.user._id,
          collectedAt: now,
          collectionReference: currentOrder.collectionReference,
          reconciliationStatus: "pending",
          customerEmail: currentOrder.guestEmail,
        },
      ],
      { session },
    );
    await createOrderStatusNotification(currentOrder, "delivered", {
      session,
      reviewItems,
      includeReviewInvitation: reviewItems.length > 0,
    });
    return currentOrder;
  });
  res.json({ success: true, data: completedOrder });
});

const confirmPrepaidHandoff = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    assignedCourier: req.user._id,
  }).select("+handoffOtpVersion");
  if (!order) fail("Assigned order not found.", 404);
  if (!["paid", "reconciled"].includes(order.paymentStatus)) {
    fail("This order has not been paid online.", 409);
  }
  if (order.status !== "on_the_way") fail("Start the delivery before confirming handoff.", 409);
  if (!order.handoffOtpVersion || order.handoffOtpExpiresAt?.getTime() <= Date.now()) {
    fail(
      "The handoff code is missing or expired. Start the delivery again to issue a new code.",
      409,
    );
  }
  if (order.handoffOtpAttemptCount >= 5)
    fail("Too many incorrect attempts. Issue a new code.", 429);
  if (!/^\d{6}$/.test(String(req.body.otp)) || String(req.body.otp) !== deriveHandoffOtp(order)) {
    order.handoffOtpAttemptCount += 1;
    await order.save();
    fail("The handoff code is incorrect.", 409);
  }

  const completedOrder = await runInTransaction(async (session) => {
    const currentOrder = await Order.findOne({
      _id: order._id,
      assignedCourier: req.user._id,
      status: "on_the_way",
      paymentStatus: { $in: ["paid", "reconciled"] },
    })
      .select("+handoffOtpVersion")
      .session(session);
    if (!currentOrder) fail("The order changed before handoff could be recorded.", 409);
    if (String(req.body.otp) !== deriveHandoffOtp(currentOrder)) {
      fail("The handoff code changed. Ask the customer for the latest code.", 409);
    }

    const completedAt = new Date();
    currentOrder.handoffOtpVerifiedAt = completedAt;
    currentOrder.status = "delivered";
    const reviewItems = await getUnreviewedOrderItems(currentOrder, {
      session,
    });
    await scheduleReviewReminders(currentOrder, reviewItems, {
      session,
      completedAt,
    });
    await syncOrderProductSales(currentOrder, "delivered", session);
    await currentOrder.save({ session });
    await createOrderStatusNotification(currentOrder, "delivered", {
      session,
      reviewItems,
      includeReviewInvitation: reviewItems.length > 0,
    });
    return currentOrder;
  });
  res.json({ success: true, data: completedOrder });
});

const reconcileCollection = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) fail("Order not found.", 404);
  if (order.paymentStatus !== "collected" || order.reconciliationStatus !== "pending") {
    fail("This order has no pending collection to reconcile.", 409);
  }

  const now = new Date();
  order.paymentStatus = "reconciled";
  order.reconciliationStatus = "reconciled";
  await order.save();
  await Payment.updateMany(
    { order: order._id, provider: "offline", status: "collected" },
    {
      $set: {
        status: "reconciled",
        reconciliationStatus: "reconciled",
        reconciledBy: req.user._id,
        reconciledAt: now,
      },
    },
  );
  res.json({ success: true, data: order });
});

const confirmPickupCollection = asyncHandler(async (req, res) => {
  const { otp, method, amount, reference = "" } = req.body;
  if (!COLLECTION_METHODS.includes(method)) fail("Select cash, POS, or transfer.");
  if (!Number.isSafeInteger(amount) || amount < 0) fail("Collected amount must be integer kobo.");
  if (method !== "cash" && !String(reference).trim()) {
    fail("A POS or transfer reference is required.");
  }

  const order = await Order.findById(req.params.id).select("+handoffOtpVersion");
  if (!order) fail("Order not found.", 404);
  if (order.deliveryMethod !== "pickup" || order.paymentMethod !== "pay_at_pickup") {
    fail("This order is not payable at pickup.", 409);
  }
  if (order.status !== "ready_for_pickup") fail("Mark the order ready for pickup first.", 409);
  if (order.paymentStatus !== "unpaid") fail("Payment has already been recorded.", 409);
  if (!order.handoffOtpVersion || order.handoffOtpExpiresAt?.getTime() <= Date.now()) {
    fail(
      "The pickup handoff code is missing or expired. Mark the order ready again to issue a new code.",
      409,
    );
  }
  if (order.handoffOtpAttemptCount >= 5)
    fail("Too many incorrect attempts. Issue a new code.", 429);
  if (amount !== order.total) fail("The collected amount must match the order total.", 409);
  if (!/^\d{6}$/.test(String(otp)) || String(otp) !== deriveHandoffOtp(order)) {
    order.handoffOtpAttemptCount += 1;
    await order.save();
    fail("The handoff code is incorrect.", 409);
  }

  const completedOrder = await runInTransaction(async (session) => {
    const currentOrder = await Order.findOne({
      _id: order._id,
      status: "ready_for_pickup",
      paymentStatus: "unpaid",
      deliveryMethod: "pickup",
      paymentMethod: "pay_at_pickup",
    })
      .select("+handoffOtpVersion")
      .session(session);
    if (!currentOrder) fail("The order changed before pickup could be recorded.", 409);
    if (String(otp) !== deriveHandoffOtp(currentOrder)) {
      fail("The handoff code changed. Ask the customer for the latest code.", 409);
    }

    const now = new Date();
    currentOrder.handoffOtpVerifiedAt = now;
    currentOrder.collectedAmount = amount;
    currentOrder.collectionMethod = method;
    currentOrder.collectionReference = String(reference).trim();
    currentOrder.collectedBy = req.user._id;
    currentOrder.collectedAt = now;
    currentOrder.paymentStatus = "collected";
    currentOrder.reconciliationStatus = "pending";
    currentOrder.status = "picked_up";
    const reviewItems = await getUnreviewedOrderItems(currentOrder, {
      session,
    });
    await scheduleReviewReminders(currentOrder, reviewItems, {
      session,
      completedAt: now,
    });
    await syncOrderProductSales(currentOrder, "picked_up", session);
    await currentOrder.save({ session });

    await Payment.create(
      [
        {
          order: currentOrder._id,
          provider: "offline",
          amount: currentOrder.total,
          channel: method,
          status: "collected",
          paidAt: now,
          collectedAmount: amount,
          collectedBy: req.user._id,
          collectedAt: now,
          collectionReference: currentOrder.collectionReference,
          reconciliationStatus: "pending",
        },
      ],
      { session },
    );
    await createOrderStatusNotification(currentOrder, "picked_up", {
      session,
      reviewItems,
      includeReviewInvitation: reviewItems.length > 0,
    });
    return currentOrder;
  });
  res.json({ success: true, data: completedOrder });
});

export {
  assignCourier,
  confirmCollection,
  confirmPickupCollection,
  confirmPrepaidHandoff,
  getHandoffCode,
  listCourierOrders,
  reconcileCollection,
  startDelivery,
};
