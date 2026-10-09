import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, getCart);
router.post("/items", auth, addToCart);
router.put("/items/:productId", auth, updateCartItem);
router.delete("/items/:productId", auth, removeCartItem);
router.delete("/", auth, clearCart);

export default router;