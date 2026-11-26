import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
} from "../controllers/orderController.js";
import { auth, admin } from "../middleware/auth.js";
import {
  assignCourier,
  confirmPickupCollection,
  getHandoffCode,
  reconcileCollection,
} from "../controllers/courierController.js";

const router = Router();

router.post("/", auth, createOrder);
router.get("/", auth, getMyOrders);

// Static admin route before /:id.
router.get("/all", auth, admin, getAllOrders);

// Owners can view their orders; administrators can view any order.
router.get("/:id", auth, getOrderById);
router.get("/:id/handoff-code", auth, getHandoffCode);
router.patch("/:id/status", auth, admin, updateOrderStatus);
router.patch("/:id/assign-courier", auth, admin, assignCourier);
router.patch("/:id/reconcile", auth, admin, reconcileCollection);
router.post("/:id/confirm-pickup", auth, admin, confirmPickupCollection);

export default router;
