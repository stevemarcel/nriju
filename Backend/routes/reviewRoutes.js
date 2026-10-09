import { Router } from "express";
import {
  getProductReviews,
  submitReview,
  updateReview,
  moderateReview,
} from "../controllers/reviewController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.get("/:productId", getProductReviews);
router.post("/", auth, submitReview);
router.patch("/:id", auth, updateReview);
router.patch("/:id/moderate", admin, moderateReview);

export default router;