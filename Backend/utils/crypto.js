import crypto from "crypto";

// Generate a cryptographically random token for email verification / password reset
export const generateToken = () => crypto.randomBytes(32).toString("hex");

// Generate a short numeric OTP (for future use)
export const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let otp = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};
