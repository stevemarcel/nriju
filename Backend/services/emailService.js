import Brevo from "@getbrevo/brevo";

// Lazily create the client — avoids crashing at import time if env is missing
let _apiInstance = null;
const getApi = () => {
  if (_apiInstance) return _apiInstance;
  const api = new Brevo.ApiClient();
  api.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
  _apiInstance = new Brevo.TransactionalEmailsApi();
  _apiInstance.setApiClient(api);
  return _apiInstance;
};

const send = async ({ to, toName, subject, html, text }) => {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
    return true;
  }

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text || html;
  sendSmtpEmail.to = [{ email: to, name: toName }];
  sendSmtpEmail.sender = {
    email: process.env.EMAIL_FROM || "orders@nriju.com",
    name: process.env.EMAIL_FROM_NAME || "Nriju Store",
  };

  try {
    await getApi().sendTransationalEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error("Brevo send failed:", error.message);
    return false;
  }
};

// Email templates
export const emailVerificationEmail = (verifyUrl, name) => ({
  subject: "Verify your Nriju account",
  html: `<h2>Hi ${name},</h2><p>Click the link below to verify your email:</p><a href="${verifyUrl}">Verify Email</a>`,
  text: `Verify your email: ${verifyUrl}`,
});

export const passwordResetEmail = (resetUrl, name) => ({
  subject: "Reset your Nriju password",
  html: `<h2>Hi ${name},</h2><p>Click the link below to reset your password:</p><a href="${resetUrl}">Reset Password</a>`,
  text: `Reset your password: ${resetUrl}`,
});

export const orderConfirmationEmail = (order, name) => ({
  subject: `Order ${order.orderNumber} confirmed — Nriju`,
  html: `<h2>Hi ${name},</h2><p>Your order <strong>${order.orderNumber}</strong> has been received.</p><p>Total: ₦${order.total.toLocaleString()}</p>`,
  text: `Order ${order.orderNumber} received. Total: ₦${order.total.toLocaleString()}`,
});

export const sendEmail = send;