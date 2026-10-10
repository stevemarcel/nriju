import { Router } from "express";
import {
  getProducts,
  getFeatured,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { admin } from "../middleware/auth.js";

const router = Router();

router.get("/", getProducts);
router.get("/featured", getFeatured);
router.get("/:slug", getProductBySlug);
router.post("/", admin, createProduct);
router.put("/:id", admin, updateProduct);
router.delete("/:id", admin, deleteProduct);

export default router;
