import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// JWT verification — prefers HttpOnly cookie, falls back to Authorization header
const auth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401);
    throw new Error("Not authenticated — no token");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Not authenticated — invalid token");
  }

  const user = await User.findById(decoded.userId).select("-password");
  if (!user) {
    res.status(401);
    throw new Error("Not authenticated — user not found");
  }
  if (!user.isActive) {
    res.status(401);
    throw new Error("Account is no longer active");
  }

  req.user = user;
  next();
});

// Admin or super admin only
const admin = asyncHandler(async (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superAdmin")) {
    res.status(403);
    throw new Error("Access denied — admin role required");
  }
  next();
});

// Super admin only — cannot be edited or deleted by other admins
const superAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "superAdmin") {
    res.status(403);
    throw new Error("Access denied — super admin role required");
  }
  next();
});

export { auth, admin, superAdmin };
