import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";
import {
  deleteFromCloudinary,
  getCloudinaryPublicIdFromUrl,
  uploadCategoryToCloudinary,
} from "../utils/cloudinaryUtils.js";

const parseFormPayload = (req, res) => {
  if (req.body?.payload === undefined) return req.body || {};

  try {
    const payload = JSON.parse(req.body.payload);
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      throw new Error("Invalid category form payload.");
    }
    req.body = payload;
    return payload;
  } catch (error) {
    res.status(400);
    throw new Error(
      error?.message === "Invalid category form payload."
        ? error.message
        : "Category form data is not valid JSON.",
    );
  }
};

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
  const body = parseFormPayload(req, res);
  const { name, description, image, isActive, sortOrder } = body;
  const file = Array.isArray(req.files) ? req.files[0] : null;
  let uploadedImage = null;

  if (file?.buffer) uploadedImage = await uploadCategoryToCloudinary(file.buffer);

  let category;
  try {
    category = await Category.create({
      name,
      description,
      image: uploadedImage?.url || image || "",
      isActive,
      sortOrder,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
  } catch (error) {
    if (uploadedImage?.publicId) {
      await deleteFromCloudinary(uploadedImage.publicId).catch((cleanupError) => {
        console.error("Could not clean up category image after failed save:", cleanupError.message);
      });
    }
    throw error;
  }

  res.status(201).json({ success: true, data: category });
});

// @DESCRIPTION Update a category (admin)
// @ROUTE       PUT /api/v1/categories/:id
// @ACCESS      Admin
const updateCategory = asyncHandler(async (req, res) => {
  const body = parseFormPayload(req, res);
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  const file = Array.isArray(req.files) ? req.files[0] : null;
  let uploadedImage = null;
  if (file?.buffer) uploadedImage = await uploadCategoryToCloudinary(file.buffer);

  let previousImage = null;
  const allowed = ["name", "description", "image", "isActive", "sortOrder"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === "image") {
        const newImage = uploadedImage?.url || body[key];
        if (category.image && category.image !== newImage) previousImage = category.image;
        category[key] = newImage;
      } else {
        category[key] = body[key];
      }
    }
  }

  if (uploadedImage && body.image === undefined) {
    if (category.image && category.image !== uploadedImage.url) previousImage = category.image;
    category.image = uploadedImage.url;
  }
  category.updatedBy = req.user._id;

  try {
    await category.save();
  } catch (error) {
    if (uploadedImage?.publicId) {
      await deleteFromCloudinary(uploadedImage.publicId).catch((cleanupError) => {
        console.error("Could not clean up category image after failed save:", cleanupError.message);
      });
    }
    throw error;
  }

  if (previousImage) {
    const publicId = getCloudinaryPublicIdFromUrl(previousImage);
    if (publicId) {
      deleteFromCloudinary(publicId).catch((error) => {
        console.error("Could not remove the previous category image:", error.message);
      });
    }
  }

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
