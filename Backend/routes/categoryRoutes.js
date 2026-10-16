import { Router } from "express";
import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

// Admin-only management routes
router.use(auth);
router.use(admin);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
