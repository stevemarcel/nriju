import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Setting from "../models/Setting.js";
import User from "../models/User.js";
import { createOrderStatusNotification } from "../services/notificationService.js";
import { deriveHandoffOtp, issueHandoffOtp } from "../services/handoffOtpService.js";
import { syncOrderProductSales } from "../services/productSalesService.js";

const COLLECTION_METHODS = ["cash", "pos", "transfer"];

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  throw error;
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
  const order = await Order.findOne({
    _id: req.params.id,
    assignedCourier: req.user._id,
  }).select("+handoffOtpVersion");
  if (!order) fail("Assigned order not found.", 404);
  if (order.deliveryMethod !== "own") fail("This is not an own-fleet delivery.", 409);
  if (!["confirmed", "preparing", "on_the_way"].includes(order.status)) {
    fail("This order cannot be started from its current status.", 409);
  }

  const setting = await Setting.findOne({ key: "handoff_otp_expiry_minutes" }).lean();
  const expiryMinutes = Math.max(15, Number(setting?.value) || 240);
  const statusChanged = order.status !== "on_the_way";
  order.status = "on_the_way";
  issueHandoffOtp(order, expiryMinutes);
  await order.save();

  if (statusChanged) {
    createOrderStatusNotification(order, "on_the_way").catch((error) =>
      console.error("Could not create delivery notification:", error.message),
    );
  }
  res.json({ success: true, data: { orderId: order._id, expiresAt: order.handoffOtpExpiresAt } });
});

const getHandoffCode = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).select(
    "+handoffOtpVersion",
  );
  if (!order) fail("Order not found.", 404);
  if (!order.handoffOtpVersion || !order.handoffOtpExpiresAt) {
    fail("The handoff code has not been issued yet.", 409);
  }
  if (order.handoffOtpVerifiedAt) fail("This handoff code has already been used.", 409);
  if (order.handoffOtpExpiresAt.getTime() <= Date.now())
    fail("This handoff code has expired.", 409);

  res.json({
    success: true,
    data: { code: deriveHandoffOtp(order), expiresAt: order.handoffOtpExpiresAt },
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

  const now = new Date();
  order.handoffOtpVerifiedAt = now;
  order.collectedAmount = amount;
  order.collectionMethod = method;
  order.collectionReference = String(reference).trim();
  order.collectedBy = req.user._id;
  order.collectedAt = now;
  order.paymentStatus = "collected";
  order.reconciliationStatus = "pending";
  order.status = "delivered";
  order.completedAt = now;
  await syncOrderProductSales(order, "delivered");
  await order.save();

  await Payment.create({
    order: order._id,
    provider: "offline",
    amount: order.total,
    channel: method,
    status: "collected",
    paidAt: now,
    collectedAmount: amount,
    collectedBy: req.user._id,
    collectedAt: now,
    collectionReference: order.collectionReference,
    reconciliationStatus: "pending",
    customerEmail: order.guestEmail,
  });

  createOrderStatusNotification(order, "delivered").catch((error) =>
    console.error("Could not create delivery notification:", error.message),
  );
  res.json({ success: true, data: order });
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

  order.handoffOtpVerifiedAt = new Date();
  order.status = "delivered";
  order.completedAt = new Date();
  await syncOrderProductSales(order, "delivered");
  await order.save();
  createOrderStatusNotification(order, "delivered").catch((error) =>
    console.error("Could not create delivery notification:", error.message),
  );
  res.json({ success: true, data: order });
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

  const now = new Date();
  order.handoffOtpVerifiedAt = now;
  order.collectedAmount = amount;
  order.collectionMethod = method;
  order.collectionReference = String(reference).trim();
  order.collectedBy = req.user._id;
  order.collectedAt = now;
  order.paymentStatus = "collected";
  order.reconciliationStatus = "pending";
  order.status = "picked_up";
  order.completedAt = now;
  await syncOrderProductSales(order, "picked_up");
  await order.save();

  await Payment.create({
    order: order._id,
    provider: "offline",
    amount: order.total,
    channel: method,
    status: "collected",
    paidAt: now,
    collectedAmount: amount,
    collectedBy: req.user._id,
    collectedAt: now,
    collectionReference: order.collectionReference,
    reconciliationStatus: "pending",
  });
  createOrderStatusNotification(order, "picked_up").catch((error) =>
    console.error("Could not create pickup notification:", error.message),
  );
  res.json({ success: true, data: order });
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
