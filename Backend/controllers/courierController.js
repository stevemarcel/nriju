import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Setting from "../models/Setting.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import {
  createHandoffCodeReissuedNotification,
  createOrderStatusNotification,
} from "../services/notificationService.js";
import { deriveHandoffOtp, issueHandoffOtp } from "../services/handoffOtpService.js";
import { syncOrderProductSales } from "../services/productSalesService.js";
import {
  getUnreviewedOrderItems,
  scheduleReviewReminders,
} from "../services/reviewReminderService.js";
import { formatNairaFromKobo, recordActivity } from "../utils/activityUtils.js";

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

const logRejectedHandoffAttempt = async ({ req, order, context }) => {
  const previousAttempts = Math.max(0, order.handoffOtpAttemptCount - 1);
  try {
    await ActivityLog.create({
      user: req.user._id,
      actorRole: req.user.role,
      action: "order.handoff_code_rejected",
      entity: "order",
      entityId: order._id,
      entityName: `Order #${order.orderNumber}`,
      actionType: "update",
      description: `${req.user.name} submitted an incorrect handoff code for ${context} on order #${order.orderNumber}.`,
      changes: [
        {
          field: "Failed handoff attempts",
          from: previousAttempts,
          to: order.handoffOtpAttemptCount,
        },
      ],
      ip: req.ip,
      userAgent: req.get("User-Agent") || "",
    });
  } catch (error) {
    console.error("Could not record rejected handoff attempt:", error.message);
  }
};

const listCourierOrders = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [orders, completed] = await Promise.all([
    Order.find({
      assignedCourier: req.user._id,
      status: { $in: ["confirmed", "preparing", "on_the_way"] },
    })
      .populate("items.product", "name images")
      .populate("user", "name phone email")
      .sort({ courierAssignedAt: -1, createdAt: -1 }),
    Order.find({
      assignedCourier: req.user._id,
      status: { $in: ["delivered", "picked_up"] },
      updatedAt: { $gte: startOfToday },
    })
      .select("orderNumber status total collectedAmount collectionMethod updatedAt")
      .sort({ updatedAt: -1 })
      .limit(5),
  ]);
  res.json({ success: true, data: orders, completed });
});

const assignCourier = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.body.courierId)) {
    fail("A valid order and courier are required.");
  }
  const [order, courier] = await Promise.all([
    Order.findById(req.params.id).populate("assignedCourier", "name"),
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

  const previousCourier = order.assignedCourier?.name || "Unassigned";
  order.assignedCourier = courier._id;
  order.courierAssignedAt = new Date();
  await order.save();
  await order.populate("assignedCourier", "name email phone");
  recordActivity(req, {
    action: "order.courier_assigned",
    entity: "order",
    entityId: order._id,
    entityName: `Order #${order.orderNumber}`,
    actionType: "update",
    changes: [{ field: "Assigned courier", from: previousCourier, to: courier.name }],
    description: `assigned ${courier.name} to order #${order.orderNumber}`,
  });
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
    if (!["confirmed", "preparing"].includes(order.status)) {
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
    const previousStatus = order.status;
    order.status = "on_the_way";
    issueHandoffOtp(order, expiryMinutes);
    await order.save({ session });

    await createOrderStatusNotification(order, "on_the_way", { session });
    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousStatus,
      expiresAt: order.handoffOtpExpiresAt,
    };
  });
  recordActivity(req, {
    action: "order.delivery_started",
    entity: "order",
    entityId: delivery.orderId,
    entityName: `Order #${delivery.orderNumber}`,
    actionType: "status_toggle",
    changes: [
      { field: "Order status", from: delivery.previousStatus, to: "on_the_way" },
      { field: "Handoff code", from: "Not active", to: "Issued" },
    ],
    description: `started delivery for order #${delivery.orderNumber} and issued its handoff code`,
  });
  res.json({
    success: true,
    data: { orderId: delivery.orderId, expiresAt: delivery.expiresAt },
  });
});

const reissueHandoffCode = asyncHandler(async (req, res) => {
  const result = await runInTransaction(async (session) => {
    const order = await Order.findOne({
      _id: req.params.id,
      assignedCourier: req.user._id,
    })
      .select("+handoffOtpVersion")
      .session(session);
    if (!order) fail("Assigned order not found.", 404);
    if (order.deliveryMethod !== "own" || order.status !== "on_the_way") {
      fail("A handoff code can only be reissued for an active own-fleet delivery.", 409);
    }
    if (
      order.handoffOtpGeneratedAt &&
      order.handoffOtpGeneratedAt.getTime() > Date.now() - 60 * 1000
    ) {
      fail("Please wait one minute before issuing another handoff code.", 429);
    }

    const previousExpiry = order.handoffOtpExpiresAt;
    const setting = await Setting.findOne({ key: "handoff_otp_expiry_minutes" })
      .session(session)
      .lean();
    const expiryMinutes = Math.max(15, Number(setting?.value) || 240);
    issueHandoffOtp(order, expiryMinutes);
    await order.save({ session });
    await createHandoffCodeReissuedNotification(order, { session });

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousExpiry,
      issuedAt: order.handoffOtpGeneratedAt,
      expiresAt: order.handoffOtpExpiresAt,
    };
  });

  recordActivity(req, {
    action: "order.handoff_code_reissued",
    entity: "order",
    entityId: result.orderId,
    entityName: `Order #${result.orderNumber}`,
    actionType: "update",
    changes: [
      { field: "Previous handoff code", from: "Active or expired", to: "Invalidated" },
      { field: "Handoff code", from: "Previous code", to: "Reissued" },
      { field: "Code expiry", from: result.previousExpiry, to: result.expiresAt },
    ],
    description: `reissued the handoff code for order #${result.orderNumber} and notified the customer`,
  });

  res.json({
    success: true,
    message: "A new handoff code was issued and the customer was notified.",
    data: {
      orderId: result.orderId,
      issuedAt: result.issuedAt,
      expiresAt: result.expiresAt,
    },
  });
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
      "The handoff code is missing or expired. Reissue the handoff code before continuing.",
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
    await logRejectedHandoffAttempt({ req, order, context: "delivery payment collection" });
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
  recordActivity(req, {
    action: "order.delivery_payment_collected",
    entity: "order",
    entityId: completedOrder._id,
    entityName: `Order #${completedOrder.orderNumber}`,
    actionType: "status_toggle",
    changes: [
      { field: "Order status", from: "on_the_way", to: "delivered" },
      { field: "Payment status", from: "unpaid", to: "collected" },
      { field: "Collection method", from: "Not recorded", to: method },
      { field: "Handoff code", from: "Issued", to: "Verified" },
    ],
    description: `collected ${formatNairaFromKobo(amount)} by ${method.toUpperCase()} and confirmed handoff for order #${completedOrder.orderNumber}`,
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
      "The handoff code is missing or expired. Reissue the handoff code before continuing.",
      409,
    );
  }
  if (order.handoffOtpAttemptCount >= 5)
    fail("Too many incorrect attempts. Issue a new code.", 429);
  if (!/^\d{6}$/.test(String(req.body.otp)) || String(req.body.otp) !== deriveHandoffOtp(order)) {
    order.handoffOtpAttemptCount += 1;
    await order.save();
    await logRejectedHandoffAttempt({ req, order, context: "prepaid delivery handoff" });
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
  recordActivity(req, {
    action: "order.prepaid_handoff_confirmed",
    entity: "order",
    entityId: completedOrder._id,
    entityName: `Order #${completedOrder.orderNumber}`,
    actionType: "status_toggle",
    changes: [
      { field: "Order status", from: "on_the_way", to: "delivered" },
      { field: "Handoff code", from: "Issued", to: "Verified" },
    ],
    description: `confirmed the prepaid customer handoff for order #${completedOrder.orderNumber}`,
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
  recordActivity(req, {
    action: "order.collection_reconciled",
    entity: "order",
    entityId: order._id,
    entityName: `Order #${order.orderNumber}`,
    actionType: "status_toggle",
    changes: [
      { field: "Payment status", from: "collected", to: "reconciled" },
      { field: "Reconciliation status", from: "pending", to: "reconciled" },
    ],
    description: `reconciled the offline collection for order #${order.orderNumber}`,
  });
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
    await logRejectedHandoffAttempt({ req, order, context: "store pickup" });
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
  recordActivity(req, {
    action: "order.pickup_payment_collected",
    entity: "order",
    entityId: completedOrder._id,
    entityName: `Order #${completedOrder.orderNumber}`,
    actionType: "status_toggle",
    changes: [
      { field: "Order status", from: "ready_for_pickup", to: "picked_up" },
      { field: "Payment status", from: "unpaid", to: "collected" },
      { field: "Collection method", from: "Not recorded", to: method },
      { field: "Handoff code", from: "Issued", to: "Verified" },
    ],
    description: `collected ${formatNairaFromKobo(amount)} by ${method.toUpperCase()} and confirmed pickup for order #${completedOrder.orderNumber}`,
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
  reissueHandoffCode,
  reconcileCollection,
  startDelivery,
};
