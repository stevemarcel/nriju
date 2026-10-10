import { Router } from "express";
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { admin } from "../middleware/auth.js";

const router = Router();

router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);
router.post("/", admin, createCategory);
router.put("/:id", admin, updateCategory);
router.delete("/:id", admin, deleteCategory);

export default router;
