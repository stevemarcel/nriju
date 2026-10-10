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
    await getClient().transactionalEmails.sendEmail({
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
    console.error("Brevo send failed:", error.message);
    return false;
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
  orderConfirmationEmail,
};
