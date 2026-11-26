import crypto from "crypto";

const otpSecret = () => process.env.HANDOFF_OTP_SECRET || process.env.JWT_SECRET;

const deriveHandoffOtp = (order) => {
  const secret = otpSecret();
  if (!secret || !order.handoffOtpVersion) return null;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${order._id}:${order.handoffOtpVersion}`)
    .digest("hex");
  return String(Number.parseInt(digest.slice(0, 12), 16) % 1_000_000).padStart(6, "0");
};

const issueHandoffOtp = (order, expiryMinutes = 240) => {
  order.handoffOtpVersion = crypto.randomBytes(16).toString("hex");
  order.handoffOtpGeneratedAt = new Date();
  order.handoffOtpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  order.handoffOtpVerifiedAt = null;
  order.handoffOtpAttemptCount = 0;
};

export { deriveHandoffOtp, issueHandoffOtp };
