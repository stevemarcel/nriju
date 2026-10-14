import { Router } from "express";
import {
  getProducts,
  getFeatured,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
} from "../controllers/productController.js";
import { admin } from "../middleware/auth.js";
import { uploadProductImages } from "../middleware/upload.js";

const router = Router();

router.get("/", getProducts);
router.get("/featured", getFeatured);
// NOTE: /all must sit above /:slug — otherwise Express treats "all" as a slug.
router.get("/all", admin, getAllProducts);
router.get("/:slug", getProductBySlug);
router.post("/", admin, uploadProductImages, createProduct);
router.put("/:id", admin, uploadProductImages, updateProduct);
router.delete("/:id", admin, deleteProduct);

export default router;
