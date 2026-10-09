import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeWishlistItem,
  clearWishlist,
} from "../controllers/wishlistController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, getWishlist);
router.post("/items", auth, addToWishlist);
router.delete("/items/:productId", auth, removeWishlistItem);
router.delete("/", auth, clearWishlist);

export default router;