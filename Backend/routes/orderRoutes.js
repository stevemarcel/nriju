import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.post("/", auth, createOrder);
router.get("/", auth, getMyOrders);
router.get("/:id", auth, getOrderById);
router.patch("/:id/status", admin, updateOrderStatus);

export default router;
