import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

// @DESCRIPTION List all active categories
// @ROUTE       GET /api/v1/categories
// @ACCESS      Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort("sortOrder");
  res.json({ success: true, data: categories });
});

// @DESCRIPTION Get a single category by slug
// @ROUTE       GET /api/v1/categories/:slug
// @ACCESS      Public
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ success: true, data: category });
});

// @DESCRIPTION Create a category (admin)
// @ROUTE       POST /api/v1/categories
// @ACCESS      Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, isActive, sortOrder } = req.body;

  const category = await Category.create({
    name,
    description,
    image,
    isActive,
    sortOrder,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: category });
});

// @DESCRIPTION Update a category (admin)
// @ROUTE       PUT /api/v1/categories/:id
// @ACCESS      Admin
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  const allowed = ["name", "description", "image", "isActive", "sortOrder"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) category[key] = req.body[key];
  }
  category.updatedBy = req.user._id;

  await category.save();
  res.json({ success: true, data: category });
});

// @DESCRIPTION Soft-delete a category (admin)
// @ROUTE       DELETE /api/v1/categories/:id
// @ACCESS      Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  category.isActive = false;
  await category.save();
  res.json({ success: true, message: "Category archived" });
});

export { getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory };
