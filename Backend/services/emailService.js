import { BrevoClient } from "@getbrevo/brevo";

// Lazily created — avoids crashing at import time if env is missing.
let _client = null;
const getClient = () => {
  if (_client) return _client;
  _client = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY,
  });
  return _client;
};

const send = async ({ to, toName, subject, html, text }) => {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
    return true;
  }

  try {
    await getClient().transactionalEmails.sendTransacEmail({
      sender: {
        email: process.env.EMAIL_FROM || "orders@nriju.com",
        name: process.env.EMAIL_FROM_NAME || "Nriju Store",
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    });
    return true;
  } catch (error) {
    const providerMessage =
      error?.body?.message ||
      error?.response?.body?.message ||
      error?.message ||
      "Unknown email provider error";
    console.error("Brevo send failed:", providerMessage);
    throw new Error(providerMessage);
  }
};

// Email templates
const emailVerificationEmail = (verifyUrl, name) => ({
  subject: "Verify your Nriju account",
  html: `<h2>Hi ${name},</h2><p>Click the link below to verify your email:</p><a href="${verifyUrl}">Verify Email</a>`,
  text: `Verify your email: ${verifyUrl}`,
});

const passwordResetEmail = (resetUrl, name) => ({
  subject: "Reset your Nriju password",
  html: `<h2>Hi ${name},</h2><p>Click the link below to reset your password:</p><a href="${resetUrl}">Reset Password</a>`,
  text: `Reset your password: ${resetUrl}`,
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const ORDER_EMAIL_COPY = {
  received: {
    subject: (order) => `Order ${order.orderNumber} received`,
    heading: "We received your order",
    message: "We will confirm it shortly.",
  },
  confirmed: {
    subject: (order) => `Payment confirmed for ${order.orderNumber}`,
    heading: "Your order is confirmed",
    message: "Your payment was successful. We will start preparing your order soon.",
  },
  ready_for_pickup: {
    subject: (order) => `Order ${order.orderNumber} is ready for pickup`,
    heading: "Your order is ready",
    message: "Your order is ready for pickup.",
  },
  on_the_way: {
    subject: (order) => `Order ${order.orderNumber} is on the way`,
    heading: "Your order is on the way",
    message: "Your order has left us and is on the way to you.",
  },
  delivered: {
    subject: (order) => `Order ${order.orderNumber} was delivered`,
    heading: "Your order was delivered",
    message: "Your order has been delivered.",
  },
  picked_up: {
    subject: (order) => `Order ${order.orderNumber} was picked up`,
    heading: "Your order was picked up",
    message: "Your pickup is complete.",
  },
  cancelled: {
    subject: (order) => `Order ${order.orderNumber} was cancelled`,
    heading: "Your order was cancelled",
    message: "Your order has been cancelled. Contact us if you need help.",
  },
  refunded: {
    subject: (order) => `Order ${order.orderNumber} was refunded`,
    heading: "Your order was refunded",
    message: "Your refund has been recorded. Your bank may need additional time to process it.",
  },
};

const orderStatusEmail = ({ order, name, status, link, reviewItems = [] }) => {
  const copy = ORDER_EMAIL_COPY[status] || ORDER_EMAIL_COPY.received;
  const url = `${String(process.env.CLIENT_URL || "").replace(/\/$/, "")}${link}`;
  const reviewCount = reviewItems.length;
  const reviewNames = reviewItems.map((item) => item.name).join(", ");
  const reviewHtml = reviewCount
    ? `<p>Tell us what you thought of ${reviewCount === 1 ? `<strong>${escapeHtml(reviewNames)}</strong>` : `the ${reviewCount} products in this order`}.</p>`
    : "";
  const reviewText = reviewCount
    ? ` Tell us what you thought of ${reviewCount === 1 ? reviewNames : `the ${reviewCount} products in this order`}.`
    : "";

  return {
    subject: copy.subject(order),
    html: `<h2>Hi ${escapeHtml(name)},</h2><h3>${escapeHtml(copy.heading)}</h3><p>${escapeHtml(copy.message)}</p><p>Order: <strong>${escapeHtml(order.orderNumber)}</strong></p>${reviewHtml}<p><a href="${escapeHtml(url)}">${reviewCount ? "Review your products" : "View your order"}</a></p>`,
    text: `Hi ${name}. ${copy.message} Order: ${order.orderNumber}.${reviewText} ${reviewCount ? "Review your products" : "View your order"}: ${url}`,
  };
};

const passwordChangedEmail = (name) => ({
  subject: "Your Nriju password was changed",
  html: `<h2>Hi ${escapeHtml(name)},</h2><p>Your Nriju account password was changed successfully.</p><p>If you did not make this change, reset your password immediately and contact Nriju support.</p>`,
  text: `Hi ${name}. Your Nriju account password was changed successfully. If you did not make this change, reset your password immediately and contact Nriju support.`,
});

const orderConfirmationEmail = (order, name) => ({
  subject: `Order ${order.orderNumber} confirmed — Nriju`,
  html: `<h2>Hi ${name},</h2><p>Your order <strong>${order.orderNumber}</strong> has been received.</p><p>Total: ₦${(order.total / 100).toLocaleString()}</p>`,
  text: `Order ${order.orderNumber} received. Total: ₦${(order.total / 100).toLocaleString()}`,
});

export {
  send,
  send as sendEmail,
  emailVerificationEmail,
  passwordResetEmail,
  passwordChangedEmail,
  orderConfirmationEmail,
  orderStatusEmail,
};
