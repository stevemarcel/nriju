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

// Product review listing is public; the rest require auth.
router.get("/:productId", getProductReviews);

// Auth required for submissions and edits
router.use(auth);
router.post("/", submitReview);
router.patch("/:id", updateReview);

// Admin moderation
router.use(admin);
router.get("/all", getAllReviews);
router.patch("/:id/moderate", moderateReview);

export default router;
