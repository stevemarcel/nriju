import asyncHandler from "express-async-handler";
import crypto from "crypto";
import https from "https";
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import { createOrderStatusNotification } from "../services/notificationService.js";

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  throw error;
};

const paystackRequest = ({ path, method = "GET", body }) =>
  new Promise((resolve, reject) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return reject(new Error("Paystack is not configured."));

    const request = https.request(
      {
        hostname: "api.paystack.co",
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Paystack returned an unreadable response."));
          }
        });
      },
    );
    request.on("error", reject);
    if (body) request.write(JSON.stringify(body));
    request.end();
  });

const callbackUrlFor = (req, requestedUrl) => {
  const allowedOrigins = [
    req.get("origin"),
    req.get("referer"),
    process.env.CLIENT_URL,
    process.env.APP_URL,
  ]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (requestedUrl) {
    try {
      const callback = new URL(requestedUrl);
      if (
        ["http:", "https:"].includes(callback.protocol) &&
        callback.pathname === "/checkout/result" &&
        allowedOrigins.includes(callback.origin)
      ) {
        callback.search = "";
        callback.hash = "";
        return callback.toString();
      }
    } catch {
      // Fall through to the configured application URL.
    }
  }

  const configuredBase = process.env.CLIENT_URL || process.env.APP_URL;
  const base = configuredBase || `${req.protocol}://${req.get("host")}`;
  return `${base.replace(/\/$/, "")}/checkout/result`;
};

const isMatchingCharge = (payment, order, data) =>
  data?.status === "success" &&
  Number(data.amount) === order.total &&
  String(data.currency || "").toUpperCase() === "NGN" &&
  (!data.metadata?.orderId || String(data.metadata.orderId) === String(order._id)) &&
  String(data.reference) === payment.paystackRef;

const applySuccessfulCharge = async (payment, paystackData) => {
  const session = await mongoose.startSession();
  let confirmedOrder = null;

  try {
    await session.withTransaction(async () => {
      const freshPayment = await Payment.findById(payment._id).session(session);
      const order = await Order.findById(payment.order?._id || payment.order).session(session);
      if (!freshPayment || !order) fail("Payment order was not found.", 404);
      if (!isMatchingCharge(freshPayment, order, paystackData)) {
        freshPayment.status = "failed";
        freshPayment.metadata = paystackData;
        await freshPayment.save({ session });
        fail("Payment details do not match this order.", 409);
      }

      freshPayment.status = "success";
      freshPayment.channel = paystackData.channel;
      freshPayment.paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date();
      freshPayment.metadata = paystackData;
      await freshPayment.save({ session });

      if (order.paymentStatus !== "paid") {
        const changedToConfirmed = order.status === "pending";
        if (changedToConfirmed) order.status = "confirmed";
        order.paymentStatus = "paid";
        order.paymentRef = freshPayment.paystackRef;
        order.paymentExpiresAt = null;

        if (order.coupon && !order.couponRedeemedAt) {
          await Coupon.updateOne({ _id: order.coupon }, { $inc: { usedCount: 1 } }, { session });
          order.couponRedeemedAt = new Date();
        }
        await order.save({ session });

        if (changedToConfirmed) {
          await createOrderStatusNotification(order, "confirmed", { session });
        }
      }
      confirmedOrder = order;
    });
  } finally {
    await session.endSession();
  }

  return confirmedOrder;
};

// Paystack's hosted checkout displays the channels enabled on the merchant
// account, keeping card details and channel-specific flows off this server.
const initializePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!mongoose.isValidObjectId(orderId)) fail("Invalid order ID.");

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) fail("Order not found.", 404);
  if (order.paymentMethod !== "paystack") fail("This order is not an online-payment order.", 409);
  if (["paid", "collected", "reconciled"].includes(order.paymentStatus)) {
    fail("This order has already been paid.", 409);
  }
  if (order.status === "cancelled" || order.paymentExpiresAt?.getTime() <= Date.now()) {
    fail("This payment session has expired. Please place the order again.", 409);
  }

  const reference = `NRJ-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const paystackRes = await paystackRequest({
    path: "/transaction/initialize",
    method: "POST",
    body: {
      email: req.user.email,
      amount: order.total,
      currency: "NGN",
      reference,
      callback_url: callbackUrlFor(req, req.body.callbackUrl),
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: req.user._id.toString(),
      },
    },
  });

  if (!paystackRes.status) fail(paystackRes.message || "Paystack initialization failed.");

  await Payment.create({
    order: order._id,
    paystackRef: reference,
    provider: "paystack",
    amount: order.total,
    status: "pending",
    customerEmail: req.user.email,
    metadata: paystackRes.data,
  });

  res.json({
    success: true,
    data: { authorization_url: paystackRes.data.authorization_url, reference },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    paystackRef: req.params.reference,
  }).populate("order");
  if (!payment) fail("Payment not found.", 404);
  if (!payment.order || String(payment.order.user) !== String(req.user._id)) {
    fail("Not authorized to verify this payment.", 403);
  }

  const verifyRes = await paystackRequest({
    path: `/transaction/verify/${encodeURIComponent(req.params.reference)}`,
  });
  if (!verifyRes.status) {
    payment.status = "failed";
    payment.metadata = verifyRes;
    await payment.save();
    fail(verifyRes.message || "Payment verification failed.");
  }

  const order = await applySuccessfulCharge(payment, verifyRes.data);
  res.json({
    success: true,
    data: { status: "success", paidAt: verifyRes.data.paid_at, order },
  });
});

const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.get("x-paystack-signature") || "";
  const expected =
    secret && req.rawBody
      ? crypto.createHmac("sha512", secret).update(req.rawBody).digest("hex")
      : "";
  const signatureIsValid =
    signature.length === expected.length &&
    signature.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!signatureIsValid) fail("Invalid Paystack webhook signature.", 401);

  if (req.body.event === "charge.success") {
    const payment = await Payment.findOne({
      paystackRef: req.body.data.reference,
    });
    if (payment) await applySuccessfulCharge(payment, req.body.data);
  }

  res.status(200).json({ received: true });
});

export { initializePayment, verifyPayment, handleWebhook };
