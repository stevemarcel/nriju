import { Router } from "express";
import { quoteCheckout } from "../controllers/checkoutController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/quote", auth, quoteCheckout);

export default router;
