import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import EmailVerificationToken from "../models/EmailVerificationToken.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from "../utils/token.js";
import { generateToken as genSecret } from "../utils/crypto.js";
import { sendEmail, emailVerificationEmail, passwordResetEmail } from "../services/emailService.js";

// @DESCRIPTION Register a new customer account
// @ROUTE       POST /api/v1/auth/register
// @ACCESS      Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password, phone });

  // Separate token schema — never raw token strings on the User document.
  // TTL index auto-purges after 12h.
  await EmailVerificationToken.create({
    user: user._id,
    token: genSecret(),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
  });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${user._id}`;
  await sendEmail({
    to: user.email,
    toName: user.name,
    ...emailVerificationEmail(verifyUrl, user.name),
  });

  setAuthCookie(res, generateToken(user._id));

  res.status(201).json({
    success: true,
    message: "Registered. Check your email to verify.",
    data: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// @DESCRIPTION Log in with email and password
// @ROUTE       POST /api/v1/auth/login
// @ACCESS      Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  setAuthCookie(res, generateToken(user._id));

  res.json({
    success: true,
    message: "Logged in",
    data: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// @DESCRIPTION Log out by clearing the JWT cookie
// @ROUTE       POST /api/v1/auth/logout
// @ACCESS      Public
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out" });
});

// @DESCRIPTION Verify email via token
// @ROUTE       POST /api/v1/auth/verify-email
// @ACCESS      Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const record = await EmailVerificationToken.findOne({ token });

  if (!record) {
    res.status(400);
    throw new Error("Invalid or expired verification token");
  }

  await User.findByIdAndUpdate(record.user, { isVerified: true });
  await record.deleteOne(); // one-time use

  res.json({ success: true, message: "Email verified" });
});

// @DESCRIPTION Request a password reset link
// @ROUTE       POST /api/v1/auth/forgot-password
// @ACCESS      Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether the email exists
    return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  }

  await PasswordResetToken.deleteMany({ user: user._id }); // invalidate old tokens
  await PasswordResetToken.create({
    user: user._id,
    token: genSecret(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${user._id}`;
  await sendEmail({
    to: user.email,
    toName: user.name,
    ...passwordResetEmail(resetUrl, user.name),
  });

  res.json({ success: true, message: "If that email exists, a reset link has been sent." });
});

// @DESCRIPTION Reset password using a token
// @ROUTE       POST /api/v1/auth/reset-password
// @ACCESS      Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const record = await PasswordResetToken.findOne({ token });

  if (!record) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }
  if (record.used) {
    res.status(400);
    throw new Error("Reset token already used");
  }

  const user = await User.findById(record.user).select("+password");
  user.password = newPassword;
  await user.save();

  record.used = true;
  await record.save();

  res.json({ success: true, message: "Password reset" });
});

// @DESCRIPTION Change password while logged in
// @ROUTE       POST /api/v1/auth/change-password
// @ACCESS      Authenticated
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password changed" });
});

// @DESCRIPTION Google OAuth callback
// @ROUTE       GET /api/v1/auth/google/callback
// @ACCESS      Public
const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  setAuthCookie(res, generateToken(user._id));
  res.redirect(`${process.env.CLIENT_URL}/login?google=success`);
});

// @DESCRIPTION Get the currently authenticated user
// @ROUTE       GET /api/v1/auth/me
// @ACCESS      Authenticated
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json({ success: true, data: user });
});

export {
  register,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  googleCallback,
  getMe,
};