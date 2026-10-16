import { Router } from "express";
import {
  getProductReviews,
  submitReview,
  updateReview,
  moderateReview,
  getAllReviews,
} from "../controllers/reviewController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

// Admin moderation routes (must come before /:productId)
router.use(auth);
router.use(admin);
router.get("/all", getAllReviews);
router.patch("/:id/moderate", moderateReview);

// Auth required for submissions and edits
router.post("/", submitReview);
router.patch("/:id", updateReview);

// Product review listing is public
router.get("/:productId", getProductReviews);

export default router;
