import { Router } from "express";
import {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import { admin } from "../middleware/auth.js";

const router = Router();

router.post("/validate", validateCoupon);
router.get("/", admin, getCoupons);
router.post("/", admin, createCoupon);
router.put("/:id", admin, updateCoupon);
router.delete("/:id", admin, deleteCoupon);

export default router;
