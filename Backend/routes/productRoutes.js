import { Router } from "express";
import {
  getProducts,
  getFeatured,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  uploadProductImagesController,
  getProductStats,
} from "../controllers/productController.js";
import { auth, admin } from "../middleware/auth.js";
import { uploadProductImageFiles } from "../middleware/upload.js";

const router = Router();

// Public storefront routes.
router.get("/", getProducts);
router.get("/featured", getFeatured);

// Static admin routes must be registered before /:slug.
router.get("/all", auth, admin, getAllProducts);
router.get("/stats", auth, admin, getProductStats);

// Public product detail. Keep this outside the admin middleware.
router.get("/:slug", getProductBySlug);

// Admin product mutations and image staging.
router.post("/images", auth, admin, uploadProductImageFiles, uploadProductImagesController);
router.post("/", auth, admin, createProduct);
router.put("/:id", auth, admin, updateProduct);
router.delete("/:id", auth, admin, deleteProduct);

export default router;
