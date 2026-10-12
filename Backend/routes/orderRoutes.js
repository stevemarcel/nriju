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
// NOTE: /all must sit above /:id — otherwise Express treats "all" as an order ID.
router.get("/all", admin, getAllOrders);
router.get("/:id", auth, getOrderById);
router.patch("/:id/status", admin, updateOrderStatus);

export default router;
