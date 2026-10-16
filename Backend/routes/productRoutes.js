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
import { auth, admin } from "../middleware/auth.js";
import { uploadProductImages } from "../middleware/upload.js";

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

export default router;
