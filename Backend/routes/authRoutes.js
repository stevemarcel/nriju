import { Router } from "express";
import passport from "passport";
import {
  register,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  googleCallback,
  getMe,
  updateMe,
  addAddress,
  deleteAvatar,
  getAvatarSource,
  deleteAddress,
} from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", auth, changePassword);
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?google=failed" }),
  googleCallback,
);
router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.get("/me/avatar/source", auth, getAvatarSource);
router.post("/me/avatar", auth, uploadAvatar, updateMe);
router.delete("/me/avatar", auth, deleteAvatar);
router.post("/me/addresses", auth, addAddress);
router.delete("/me/addresses/:addressId", auth, deleteAddress);

export default router;
