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
router.use(auth);
router.use(admin);
router.get("/all", getAllOrders);
router.get("/:id", auth, getOrderById);
router.patch("/:id/status", updateOrderStatus);

export default router;
