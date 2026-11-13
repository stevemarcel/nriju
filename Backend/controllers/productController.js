import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Cart from "../models/Cart.js";
import Review from "../models/Review.js";
import Inventory from "../models/Inventory.js";
import { productSummary } from "../utils/format.js";
import { uploadProductToCloudinary, deleteFromCloudinary } from "../utils/cloudinaryUtils.js";
import { skipActivityLog } from "../utils/activityUtils.js";
import {
  recordProductCreated,
  recordProductUpdated,
  recordProductDeleted,
} from "../utils/productActivity.js";

const PRODUCT_TYPES = ["cooked", "packaged", "fresh"];
const PRODUCT_UNITS = [
  "portion",
  "bowl",
  "500ml",
  "litre",
  "pack",
  "bottle",
  "tub",
  "piece",
  "per kg",
  "1 Litre",
  "500ml bottle",
  "250g",
  "500g",
];
const PRODUCT_REGIONS = ["Western", "Eastern", "South-South", "Northern", "Cross-regional"];
const SORT_OPTIONS = {
  newest: "-createdAt -_id",
  price_asc: "price _id",
  price_desc: "-price _id",
  rating: "-averageRating -reviewCount -_id",
  popular: "-salesCount -_id",
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req, res, defaultLimit = 20) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? defaultLimit);

  if (!Number.isInteger(page) || page < 1) {
    res.status(400);
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400);
    throw new Error("Limit must be an integer between 1 and 100.");
  }

  return { page, limit, skip: (page - 1) * limit };
};

const parseBoolean = (value, label) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  const error = new Error(`${label} must be true or false.`);
  error.status = 400;
  error.statusCode = 400;
  throw error;
};

const parseOptionalBoolean = (value, label) =>
  value === undefined ? undefined : parseBoolean(value, label);

const parseNonNegativeInteger = (value, label, { nullable = false, defaultValue } = {}) => {
  if (value === undefined) return defaultValue;
  if (nullable && (value === null || value === "")) return null;
  if (value === null || value === "") {
    const error = new Error(`${label} is required.`);
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    const error = new Error(
      `${label} must be a non-negative integer${nullable ? " or empty" : ""}.`,
    );
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const parseOptionalNonNegativeInteger = (value, label, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return parseNonNegativeInteger(value, label);
};

const parseTags = (value) => {
  if (value === undefined || value === null || value === "") return [];

  let tags;
  if (Array.isArray(value)) {
    tags = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      tags = Array.isArray(parsed) ? parsed : value.split(",");
    } catch {
      tags = value.split(",");
    }
  } else {
    const error = new Error("Tags must be an array or comma-separated string.");
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  if (!tags.every((tag) => typeof tag === "string")) {
    const error = new Error("Every product tag must be a string.");
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
};

const parseImageList = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    const error = new Error("Product images must be an array of URLs.");
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  const images = value.map((item) => {
    if (typeof item !== "string" || !item.trim()) {
      const error = new Error("Each product image must be a valid URL.");
      error.status = 400;
      error.statusCode = 400;
      throw error;
    }

    let parsed;
    try {
      parsed = new URL(item);
    } catch {
      const error = new Error("Each product image must be a valid URL.");
      error.status = 400;
      error.statusCode = 400;
      throw error;
    }

    if (!["https:", "http:"].includes(parsed.protocol)) {
      const error = new Error("Product image URLs must use HTTP or HTTPS.");
      error.status = 400;
      error.statusCode = 400;
      throw error;
    }

    return item.trim();
  });

  return [...new Set(images)];
};

const assertCategoryExists = async (categoryId, res) => {
  if (!mongoose.isValidObjectId(categoryId)) {
    res.status(400);
    throw new Error("A valid product category is required.");
  }

  const category = await Category.findById(categoryId).select("_id name slug isActive");
  if (!category) {
    res.status(400);
    throw new Error("The selected product category does not exist.");
  }

  return category;
};

const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return null;

    const marker = "/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    let segments = parsed.pathname
      .slice(markerIndex + marker.length)
      .split("/")
      .filter(Boolean);

    // Cloudinary transformations can precede the version segment.
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex >= 0) {
      segments = segments.slice(versionIndex + 1);
    } else if (segments[0]?.includes(",")) {
      segments = segments.slice(1);
    }

    if (!segments.length) return null;

    const last = segments[segments.length - 1];
    segments[segments.length - 1] = last.replace(/\.[a-zA-Z0-9]{2,6}$/, "");

    const publicId = segments.join("/");
    return publicId || null;
  } catch {
    return null;
  }
};

const cleanupCloudinaryImages = async (urls = []) => {
  const publicIds = [...new Set(urls.map(extractCloudinaryPublicId).filter(Boolean))];
  if (!publicIds.length) return;

  const results = await Promise.allSettled(
    publicIds.map((publicId) => deleteFromCloudinary(publicId)),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Could not clean up Cloudinary product image:", result.reason?.message);
    }
  });
};

const buildAdminProductQuery = async (req, res) => {
  const { isActive, category, stockFilter, search } = req.query;
  const query = {};

  const activeFilter = parseOptionalBoolean(isActive, "isActive");
  if (activeFilter !== undefined) query.isActive = activeFilter;

  if (stockFilter !== undefined && stockFilter !== "") {
    const allowedStockFilters = ["all", "active", "archived", "lowStock", "outOfStock"];
    if (!allowedStockFilters.includes(stockFilter)) {
      res.status(400);
      throw new Error("Invalid stock filter.");
    }

    if (stockFilter === "archived") {
      if (activeFilter === true) {
        res.status(400);
        throw new Error("The archived filter cannot be combined with isActive=true.");
      }
      query.isActive = false;
    } else if (stockFilter === "active") {
      if (activeFilter === false) {
        res.status(400);
        throw new Error("The active filter cannot be combined with isActive=false.");
      }
      query.isActive = true;
    } else if (stockFilter === "lowStock") {
      query.stock = { $gt: 0, $lte: 5 };
    } else if (stockFilter === "outOfStock") {
      query.stock = 0;
    }
  }

  if (category !== undefined && category !== "") {
    if (!mongoose.isValidObjectId(category)) {
      res.status(400);
      throw new Error("Invalid category ID.");
    }
    query.category = category;
  }

  if (search !== undefined) {
    if (typeof search !== "string") {
      res.status(400);
      throw new Error("Search must be a string.");
    }

    const value = search.trim();
    if (value) {
      const regex = new RegExp(escapeRegex(value), "i");
      query.$or = [{ name: regex }, { tags: regex }];
    }
  }

  return query;
};

const buildPublicProductQuery = async (req, res) => {
  const { category, search, minPrice, maxPrice, type, sort } = req.query;

  const query = { isActive: true };

  let categoryNotFound = false;
  if (category !== undefined && category !== "") {
    if (typeof category !== "string") {
      res.status(400);
      throw new Error("Category must be a slug.");
    }

    const categoryDocument = await Category.findOne({
      slug: category,
      isActive: true,
    }).select("_id");

    // An unknown/inactive category must never accidentally remove the filter.
    if (!categoryDocument) categoryNotFound = true;
    else query.category = categoryDocument._id;
  }

  if (search !== undefined) {
    if (typeof search !== "string") {
      res.status(400);
      throw new Error("Search must be a string.");
    }

    const value = search.trim();
    if (value) query.name = new RegExp(escapeRegex(value), "i");
  }

  const min = parseNonNegativeInteger(minPrice, "minPrice", { nullable: true });
  const max = parseNonNegativeInteger(maxPrice, "maxPrice", { nullable: true });

  if (min !== undefined && min !== null && max !== undefined && max !== null && min > max) {
    res.status(400);
    throw new Error("minPrice cannot be greater than maxPrice.");
  }

  if (min !== undefined && min !== null) query.price = { ...(query.price || {}), $gte: min };
  if (max !== undefined && max !== null) query.price = { ...(query.price || {}), $lte: max };

  if (type !== undefined && type !== "") {
    if (!PRODUCT_TYPES.includes(type)) {
      res.status(400);
      throw new Error("Invalid product type.");
    }
    query.productType = type;
  }

  if (sort !== undefined && sort !== "" && !SORT_OPTIONS[sort]) {
    res.status(400);
    throw new Error("Invalid product sort option.");
  }

  return {
    query: categoryNotFound ? null : query,
    sort: SORT_OPTIONS[sort] || SORT_OPTIONS.newest,
  };
};

// @DESCRIPTION Upload product images and return their Cloudinary URLs.
// This is a staging endpoint; it does not create or update a product.
// @ROUTE       POST /api/v1/products/images
// @ACCESS      Admin
const uploadProductImagesController = asyncHandler(async (req, res) => {
  // Prevent the activity middleware from recording this as product creation.
  skipActivityLog(req);

  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) {
    return res.json({ success: true, data: { images: [] } });
  }

  const results = await Promise.allSettled(
    files.map((file) => uploadProductToCloudinary(file.buffer)),
  );

  const uploaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const failed = results.find((result) => result.status === "rejected");

  if (failed) {
    await Promise.allSettled(
      uploaded.filter((item) => item.publicId).map((item) => deleteFromCloudinary(item.publicId)),
    );
    throw failed.reason;
  }

  res.json({
    success: true,
    data: { images: uploaded.map((item) => item.url) },
  });
});

// @DESCRIPTION List active products with filters, search, sort and pagination.
// @ROUTE       GET /api/v1/products
// @ACCESS      Public
const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, res, 20);
  const { query, sort } = await buildPublicProductQuery(req, res);

  if (!query) {
    return res.json({
      success: true,
      data: [],
      meta: { page, limit, total: 0 },
    });
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort(sort).skip(skip).limit(limit).populate("category"),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: products.map(productSummary),
    meta: { page, limit, total },
  });
});

// @DESCRIPTION Get featured products for the homepage.
// @ROUTE       GET /api/v1/products/featured
// @ACCESS      Public
const getFeatured = asyncHandler(async (_req, res) => {
  const products = await Product.find({
    isActive: true,
    isFeatured: true,
  })
    .sort("-createdAt -_id")
    .limit(12)
    .populate("category");

  res.json({
    success: true,
    data: products.map(productSummary),
  });
});

// @DESCRIPTION Get a single active product by slug.
// @ROUTE       GET /api/v1/products/:slug
// @ACCESS      Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isActive: true,
  }).populate("category");

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.json({
    success: true,
    data: productSummary(product),
  });
});

// @DESCRIPTION Create a product (admin).
// @ROUTE       POST /api/v1/products
// @ACCESS      Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    compareAtPrice,
    unit,
    productType,
    category,
    tags,
    isFeatured,
    images,
    region,
    prepLeadTime,
    maxDailyQty,
    costPrice,
    notifyOnOutOfStock,
  } = req.body;

  const categoryDocument = await assertCategoryExists(category, res);
  const parsedPrice = parseNonNegativeInteger(price, "Price");

  if (parsedPrice === undefined) {
    res.status(400);
    throw new Error("Price is required.");
  }

  if (productType !== undefined && !PRODUCT_TYPES.includes(productType)) {
    res.status(400);
    throw new Error("Invalid product type.");
  }

  if (unit !== undefined && !PRODUCT_UNITS.includes(unit)) {
    res.status(400);
    throw new Error("Invalid product unit.");
  }

  if (region !== undefined && !PRODUCT_REGIONS.includes(region)) {
    res.status(400);
    throw new Error("Invalid product region.");
  }

  const parsedImages = parseImageList(images) || [];
  const parsedFeatured = parseOptionalBoolean(isFeatured, "isFeatured") ?? false;
  const parsedNotify = parseOptionalBoolean(notifyOnOutOfStock, "notifyOnOutOfStock") ?? false;

  const product = await Product.create({
    name,
    description,
    price: parsedPrice,
    compareAtPrice: parseNonNegativeInteger(compareAtPrice, "Compare-at price", {
      nullable: true,
      defaultValue: null,
    }),
    costPrice: parseOptionalNonNegativeInteger(costPrice, "Cost price", 0),
    unit,
    productType,
    category: categoryDocument._id,
    tags: parseTags(tags),
    images: parsedImages,
    isFeatured: parsedFeatured,
    notifyOnOutOfStock: parsedNotify,
    region,
    prepLeadTime: parseOptionalNonNegativeInteger(prepLeadTime, "Preparation lead time", 0),
    maxDailyQty: parseOptionalNonNegativeInteger(maxDailyQty, "Maximum daily quantity", 0),
    stock: 0,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  await product.populate("category");
  recordProductCreated(req, product);

  res.status(201).json({
    success: true,
    data: productSummary(product),
  });
});

// @DESCRIPTION Update a product (admin).
// @ROUTE       PUT /api/v1/products/:id
// @ACCESS      Admin
const updateProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid product ID.");
  }

  const product = await Product.findById(req.params.id).populate("category", "name slug");

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const previousImages = [...(product.images || [])];
  const oldCategoryId = product.category?._id
    ? String(product.category._id)
    : String(product.category || "");
  const oldCategoryName = product.category?.name || "—";

  const updates = {};

  const stringFields = ["name", "description", "unit", "productType", "region"];
  for (const field of stringFields) {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] !== "string") {
        res.status(400);
        throw new Error(`${field} must be a string.`);
      }
      updates[field] = req.body[field].trim();
    }
  }

  for (const field of ["price", "compareAtPrice", "costPrice"]) {
    if (req.body[field] !== undefined) {
      updates[field] = parseNonNegativeInteger(req.body[field], field, {
        nullable: field === "compareAtPrice",
      });
    }
  }

  for (const field of ["prepLeadTime", "maxDailyQty"]) {
    if (req.body[field] !== undefined) {
      updates[field] = parseOptionalNonNegativeInteger(req.body[field], field, 0);
    }
  }

  for (const field of ["isActive", "isFeatured", "notifyOnOutOfStock"]) {
    if (req.body[field] !== undefined) {
      updates[field] = parseBoolean(req.body[field], field);
    }
  }

  if (req.body.tags !== undefined) updates.tags = parseTags(req.body.tags);
  if (req.body.images !== undefined) updates.images = parseImageList(req.body.images);

  let newCategoryName = oldCategoryName;
  if (req.body.category !== undefined) {
    const categoryDocument = await assertCategoryExists(req.body.category, res);
    updates.category = categoryDocument._id;
    newCategoryName = categoryDocument.name || "—";
  }

  if (updates.productType !== undefined && !PRODUCT_TYPES.includes(updates.productType)) {
    res.status(400);
    throw new Error("Invalid product type.");
  }
  if (updates.unit !== undefined && !PRODUCT_UNITS.includes(updates.unit)) {
    res.status(400);
    throw new Error("Invalid product unit.");
  }
  if (updates.region !== undefined && !PRODUCT_REGIONS.includes(updates.region)) {
    res.status(400);
    throw new Error("Invalid product region.");
  }

  const currentValue = (field) => {
    if (field === "category") return oldCategoryId;
    const value = product[field];
    if (Array.isArray(value)) return [...value];
    if (value && typeof value.toObject === "function") return value.toObject();
    return value;
  };

  const changes = [];
  const fields = [
    "name",
    "description",
    "price",
    "compareAtPrice",
    "costPrice",
    "unit",
    "productType",
    "region",
    "prepLeadTime",
    "maxDailyQty",
    "category",
    "tags",
    "isActive",
    "isFeatured",
    "notifyOnOutOfStock",
    "images",
  ];

  for (const field of fields) {
    if (updates[field] === undefined) continue;

    const before = currentValue(field);
    const after = updates[field];

    const beforeComparable = field === "category" ? String(before) : JSON.stringify(before ?? null);
    const afterComparable = field === "category" ? String(after) : JSON.stringify(after ?? null);

    if (beforeComparable === afterComparable) continue;

    let changeFrom = before;
    let changeTo = after;

    if (field === "category") {
      changeFrom = oldCategoryName;
      changeTo = newCategoryName;
    } else if (field === "images") {
      changeFrom = `${before?.length || 0} image(s)`;
      changeTo = `${after?.length || 0} image(s)`;
    }

    changes.push({
      field,
      from: changeFrom,
      to: changeTo,
    });

    product[field] = after;
  }

  if (!changes.length) {
    skipActivityLog(req);
    await product.populate("category");
    return res.json({
      success: true,
      data: productSummary(product),
      message: "No product changes to save.",
    });
  }

  product.updatedBy = req.user._id;
  await product.save();

  // Remove old image assets only after the product update commits successfully.
  const nextImages = product.images || [];
  const removedImages = previousImages.filter((url) => !nextImages.includes(url));
  if (removedImages.length) await cleanupCloudinaryImages(removedImages);

  await product.populate("category");
  recordProductUpdated(req, product, changes);

  res.json({
    success: true,
    data: productSummary(product),
  });
});

// @DESCRIPTION List all products, including archived products (admin).
// @ROUTE       GET /api/v1/products/all
// @ACCESS      Admin
const getAllProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, res, 20);
  const query = await buildAdminProductQuery(req, res);

  const [products, total] = await Promise.all([
    Product.find(query).sort("-createdAt -_id").skip(skip).limit(limit).populate("category"),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: products.map(productSummary),
    meta: { page, limit, total },
  });
});

// @DESCRIPTION Archive or permanently delete a product (admin).
// @ROUTE       DELETE /api/v1/products/:id
// @ACCESS      Admin
const deleteProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid product ID.");
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const permanentValue = req.query.permanent;
  if (permanentValue !== undefined && permanentValue !== "true" && permanentValue !== "false") {
    res.status(400);
    throw new Error("permanent must be true or false.");
  }

  if (permanentValue === "true") {
    const productSnapshot = {
      _id: product._id,
      name: product.name,
      images: [...(product.images || [])],
    };

    // Delete the product document first. Cloudinary cleanup runs afterwards
    // so a storage failure cannot leave a live product referencing missing files.
    await product.deleteOne();

    const cleanupResults = await Promise.allSettled([
      Cart.deleteMany({ product: product._id }),
      Review.deleteMany({ product: product._id }),
      Inventory.deleteMany({ product: product._id }),
      cleanupCloudinaryImages(productSnapshot.images),
    ]);

    cleanupResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Product deletion cleanup failed:", result.reason?.message);
      }
    });

    recordProductDeleted(req, productSnapshot);

    return res.json({
      success: true,
      message: "Product permanently deleted.",
    });
  }

  if (!product.isActive) {
    skipActivityLog(req);
    return res.json({
      success: true,
      message: "Product is already archived.",
    });
  }

  product.isActive = false;
  product.updatedBy = req.user._id;
  await product.save();

  recordProductUpdated(req, product, [
    {
      field: "isActive",
      from: true,
      to: false,
    },
  ]);

  res.json({
    success: true,
    message: "Product archived.",
  });
});

// @DESCRIPTION Get product statistics for the admin products page.
// @ROUTE       GET /api/v1/products/stats
// @ACCESS      Admin
const getProductStats = asyncHandler(async (req, res) => {
  const query = await buildAdminProductQuery(req, res);

  const [total, active, lowStock, outOfStock] = await Promise.all([
    Product.countDocuments(query),
    Product.countDocuments({ ...query, isActive: true }),
    Product.countDocuments({ ...query, stock: { $gt: 0, $lte: 5 } }),
    Product.countDocuments({ ...query, stock: 0 }),
  ]);

  res.json({
    success: true,
    data: { total, active, lowStock, outOfStock },
  });
});

export {
  getProducts,
  getFeatured,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  uploadProductImagesController,
  getProductStats,
};
