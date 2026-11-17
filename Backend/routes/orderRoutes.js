import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
} from "../controllers/orderController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.post("/", auth, createOrder);
router.get("/", auth, getMyOrders);

// Static admin route before /:id.
router.get("/all", auth, admin, getAllOrders);

// Owners can view their orders; administrators can view any order.
router.get("/:id", auth, getOrderById);
router.patch("/:id/status", auth, admin, updateOrderStatus);

export default router;
