import { Router } from "express";
import {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.post("/validate", validateCoupon);

// Admin-only management routes — auth first, then role check
router.use(auth);
router.use(admin);
router.get("/", getCoupons);
router.post("/", createCoupon);
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

export default router;
