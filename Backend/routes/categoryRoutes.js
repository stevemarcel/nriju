import { Router } from "express";
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { auth, admin } from "../middleware/auth.js";
import { uploadCategoryImageFiles } from "../middleware/upload.js";

const router = Router();

router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

// Admin-only management routes
router.use(auth);
router.use(admin);
router.post("/", uploadCategoryImageFiles, createCategory);
router.put("/:id", uploadCategoryImageFiles, updateCategory);
router.delete("/:id", deleteCategory);

export default router;
