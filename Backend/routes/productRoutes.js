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
} from "../controllers/productController.js";
import { auth, admin } from "../middleware/auth.js";
import { uploadProductImages, uploadProductImageFiles } from "../middleware/upload.js";

const router = Router();

router.get("/", getProducts);
router.get("/featured", getFeatured);
// NOTE: /all must sit above /:slug — otherwise Express treats "all" as a slug.
router.use(auth);
router.use(admin);
router.get("/all", getAllProducts);
router.get("/:slug", getProductBySlug);
router.post("/", uploadProductImages, createProduct);
router.put("/:id", uploadProductImages, updateProduct);
router.delete("/:id", deleteProduct);

// Standalone image upload for the product form — uploads files and returns
// their Cloudinary URLs without creating a product record.
router.post("/images", auth, admin, uploadProductImageFiles, uploadProductImagesController);

export default router;
