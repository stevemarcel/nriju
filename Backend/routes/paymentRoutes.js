import { Router } from "express";
import {
  initializePayment,
  verifyPayment,
  handleWebhook,
} from "../controllers/paymentController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/initialize", auth, initializePayment);
router.post("/verify/:reference", verifyPayment);
router.post("/webhook", handleWebhook);

export default router;
