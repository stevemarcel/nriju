import { Router } from "express";
import {
  confirmCollection,
  confirmPrepaidHandoff,
  listCourierOrders,
  startDelivery,
} from "../controllers/courierController.js";
import { auth, courier } from "../middleware/auth.js";

const router = Router();
router.use(auth, courier);
router.get("/orders", listCourierOrders);
router.post("/orders/:id/start", startDelivery);
router.post("/orders/:id/collect", confirmCollection);
router.post("/orders/:id/handoff", confirmPrepaidHandoff);

export default router;
