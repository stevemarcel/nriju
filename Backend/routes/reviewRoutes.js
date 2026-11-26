import { Router } from "express";
import {
  getProductReviews,
  getOrderReviewEligibility,
  submitReview,
  updateReview,
  moderateReview,
  getAllReviews,
} from "../controllers/reviewController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

// Admin moderation routes must come before the public /:productId route.
router.get("/all", auth, admin, getAllReviews);
router.get("/order/:orderId/eligible", auth, getOrderReviewEligibility);
router.patch("/:id/moderate", auth, admin, moderateReview);

// Auth is required for review submissions and owner edits.
router.post("/", auth, submitReview);
router.patch("/:id", auth, updateReview);

// Approved product reviews are public.
router.get("/:productId", getProductReviews);

export default router;
