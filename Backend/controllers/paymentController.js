import asyncHandler from "express-async-handler";
import https from "https";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";

// @DESCRIPTION Initialize a Paystack payment
// @ROUTE       POST /api/v1/payments/initialize
// @ACCESS      Authenticated
const initializePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Generate unique reference
  const reference = `NRJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const payload = JSON.stringify({
    email: req.user.email,
    amount: order.total, // already in kobo
    reference,
    metadata: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    },
  });

  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/transaction/initialize",
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
  };

  const paystackRes = await new Promise((resolve, reject) => {
    const reqHttps = https.request(options, (resHttps) => {
      let data = "";
      resHttps.on("data", (chunk) => (data += chunk));
      resHttps.on("end", () => resolve(JSON.parse(data)));
    });
    reqHttps.on("error", reject);
    reqHttps.write(payload);
    reqHttps.end();
  });

  if (!paystackRes.status) {
    res.status(400);
    throw new Error(paystackRes.message || "Paystack initialization failed");
  }

  // Create pending payment record
  await Payment.create({
    order: order._id,
    paystackRef: reference,
    amount: order.total,
    status: "pending",
    customerEmail: req.user.email,
    metadata: paystackRes.data,
  });

  res.json({
    success: true,
    data: {
      authorization_url: paystackRes.data.authorization_url,
      reference,
    },
  });
});

// @DESCRIPTION Verify a Paystack payment
// @ROUTE       POST /api/v1/payments/verify/:reference
// @ACCESS      Public (called after redirect from Paystack)
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const payment = await Payment.findOne({ paystackRef: reference }).populate("order");
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  // Call Paystack verify endpoint
  const verifyRes = await new Promise((resolve, reject) => {
    https.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    }, (resHttps) => {
      let data = "";
      resHttps.on("data", (chunk) => (data += chunk));
      resHttps.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });

  if (!verifyRes.status) {
    payment.status = "failed";
    await payment.save();
    res.status(400);
    throw new Error(verifyRes.message || "Payment verification failed");
  }

  const paystackData = verifyRes.data;

  // Update payment record
  payment.status = paystackData.status;
  payment.channel = paystackData.channel;
  payment.paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : null;
  payment.metadata = paystackData;

  if (paystackData.status === "success") {
    payment.status = "success";

    // Update order status to paid
    const order = await Order.findById(payment.order._id);
    if (order) {
      order.status = "paid";
      order.paymentRef = reference;
      await order.save();
    }
  }

  await payment.save();

  res.json({
    success: true,
    data: {
      status: payment.status,
      paidAt: payment.paidAt,
      order: payment.order,
    },
  });
});

// @DESCRIPTION Handle Paystack webhook events
// @ROUTE       POST /api/v1/payments/webhook
// @ACCESS      Public (Paystack server-to-server)
const handleWebhook = asyncHandler(async (req, res) => {
  const event = req.body;

  // In production, verify the x-paystack-signature header here
  // using HMAC-SHA512 with the secret key.

  if (event.event === "charge.success") {
    const payment = await Payment.findOne({ paystackRef: event.data.reference });
    if (payment && payment.status !== "success") {
      payment.status = "success";
      payment.channel = event.data.channel;
      payment.paidAt = new Date(event.data.paid_at);
      await payment.save();

      const order = await Order.findById(payment.order);
      if (order && order.status !== "paid") {
        order.status = "paid";
        order.paymentRef = event.data.reference;
        await order.save();
      }
    }
  }

  // Always return 200 to prevent Paystack retries
  res.status(200).json({ received: true });
});

export {
  initializePayment,
  verifyPayment,
  handleWebhook,
};