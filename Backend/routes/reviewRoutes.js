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

// NOTE: /all must sit above /:productId — otherwise Express treats "all" as a product ID.
router.get("/all", admin, getAllReviews);
router.get("/:productId", getProductReviews);
router.post("/", auth, submitReview);
router.patch("/:id", auth, updateReview);
router.patch("/:id/moderate", admin, moderateReview);

export default router;
