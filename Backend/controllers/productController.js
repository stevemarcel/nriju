import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Cart from "../models/Cart.js";
import Review from "../models/Review.js";
import Inventory from "../models/Inventory.js";
import { productSummary } from "../utils/format.js";
import { uploadProductToCloudinary, deleteFromCloudinary } from "../utils/cloudinaryUtils.js";

// @DESCRIPTION Upload product images and return their Cloudinary URLs
// @ROUTE       POST /api/v1/products/images
// @ACCESS      Admin
const uploadProductImagesController = asyncHandler(async (req, res) => {
  const images = req.files
    ? await Promise.all(
        req.files.map(async (file) => {
          const uploaded = await uploadProductToCloudinary(file.buffer);
          return uploaded.url;
        }),
      )
    : [];

  res.json({ success: true, data: { images } });
});

// @DESCRIPTION List active products with filters, search, sort and pagination
// @ROUTE       GET /api/v1/products
// @ACCESS      Public
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, type, sort, page = 1, limit = 20 } = req.query;

  const query = Product.find({ isActive: true });
  // The storefront filters by category *slug*, but Product.category is an
  // ObjectId — resolve the slug to its _id before filtering, otherwise the
  // equals() call throws a CastError (400).
  if (category) {
    const cat = await Category.findOne({ slug: category, isActive: true });
    if (cat) query.where("category").equals(cat._id);
  }
  if (search) query.where("name").regex(new RegExp(search, "i"));
  if (minPrice) query.where("price").gte(Number(minPrice));
  if (maxPrice) query.where("price").lte(Number(maxPrice));
  if (type) query.where("productType").equals(type);

  const sortMap = {
    newest: "-createdAt",
    price_asc: "price",
    price_desc: "-price",
    rating: "-averageRating",
    popular: "-salesCount",
  };
  query.sort(sortMap[sort] || "-createdAt");

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    query.skip(skip).limit(Number(limit)).populate("category"),
    Product.countDocuments(query.getQuery()),
  ]);

  res.json({
    success: true,
    data: products.map(productSummary),
    meta: { page: Number(page), limit: Number(limit), total },
  });
});

// @DESCRIPTION Get featured products for the homepage
// @ROUTE       GET /api/v1/products/featured
// @ACCESS      Public
const getFeatured = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .sort("-createdAt")
    .limit(12)
    .populate("category");

  res.json({ success: true, data: products.map(productSummary) });
});

// @DESCRIPTION Get a single product by slug
// @ROUTE       GET /api/v1/products/:slug
// @ACCESS      Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate("category");
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, data: productSummary(product) });
});

// @DESCRIPTION Create a product (admin)
// @ROUTE       POST /api/v1/products
// @ACCESS      Admin
const parseTags = (tags) => {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [tags];
    } catch {
      return tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseBool = (val) => val === true || val === "true";

// Extract the Cloudinary public ID from a delivery URL. Query params (e.g.
// ?_a=...) are stripped so the ID passed to deleteFromCloudinary is clean.
const cloudinaryPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const match = url.match(/\/upload\/[^/]+\/(.+?)(?:\?\w|=|$)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

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
  } = req.body;

  const product = await Product.create({
    name,
    description,
    price,
    compareAtPrice,
    unit,
    productType,
    category,
    images: images || [],
    tags: parseTags(tags),
    isFeatured: parseBool(isFeatured),
    stock: 0,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  req.activity = {
    action: "product.created",
    entity: "product",
    entityId: product._id,
    entityName: product.name,
    actionType: "create",
    description: `${req.user.name} created "${product.name}"`,
  };

  res.status(201).json({ success: true, data: productSummary(product) });
});

// @DESCRIPTION Update a product (admin)
// @ROUTE       PUT /api/v1/products/:id
// @ACCESS      Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const allowed = [
    "name",
    "description",
    "price",
    "compareAtPrice",
    "unit",
    "productType",
    "category",
    "tags",
    "isActive",
    "isFeatured",
    "notifyOnOutOfStock",
    "costPrice",
    "images",
  ];

  const changes = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const oldValue = product[key];
      if (key === "tags") {
        product[key] = parseTags(req.body[key]);
        if (JSON.stringify(oldValue) !== JSON.stringify(product[key])) {
          changes.push({ field: "tags", from: oldValue, to: product[key] });
        }
      } else if (key === "images") {
        // Remove any images that were dropped so they don't accumulate in
        // Cloudinary as orphaned assets. New images that overlap are skipped.
        const oldImages = product.images ?? [];
        const newImages = req.body[key];
        const removed = oldImages.filter((url) => !newImages.includes(url));
        if (removed.length) {
          const { deleteFromCloudinary } = await import("../utils/cloudinaryUtils.js");
          await Promise.all(
            removed.map((url) => {
              const id = cloudinaryPublicIdFromUrl(url);
              return id ? deleteFromCloudinary(id).catch(() => {}) : Promise.resolve();
            }),
          );
        }
        product[key] = newImages;
        if (JSON.stringify(oldImages) !== JSON.stringify(newImages)) {
          changes.push({ field: "images", from: oldImages, to: newImages });
        }
      } else if (["isActive", "isFeatured", "notifyOnOutOfStock"].includes(key)) {
        const parsed = parseBool(req.body[key]);
        if (oldValue !== parsed) {
          product[key] = parsed;
          changes.push({ field: key, from: oldValue, to: parsed });
        }
      } else {
        product[key] = req.body[key];
        if (oldValue !== product[key]) {
          changes.push({ field: key, from: oldValue, to: product[key] });
        }
      }
    }
  }

  product.updatedBy = req.user._id;
  await product.save();

  if (changes.length > 0) {
    const changedFields = changes
      .map((c) => {
        if (c.field === "price") return `price, Stock`;
        return c.field.charAt(0).toUpperCase() + c.field.slice(1).replace(/([A-Z])/g, " $1");
      })
      .join(", ");
    req.activity = {
      action: "product.updated",
      entity: "product",
      entityId: product._id,
      entityName: product.name,
      actionType: "update",
      changes,
      description: `${req.user.name} updated the ${changedFields} of "${product.name}"`,
    };
  }

  res.json({ success: true, data: productSummary(product) });
});

// @DESCRIPTION List every product, including archived ones (admin). The
// public listing filters out inactive products; admins need to see them.
// @ROUTE       GET /api/v1/products/all
// @ACCESS      Admin
const getAllProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, isActive, category, stockFilter } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  } else if (stockFilter) {
    if (stockFilter === "outOfStock") {
      query.stock = 0;
    } else if (stockFilter === "lowStock") {
      query.stock = { $gt: 0, $lte: 5 };
    } else if (stockFilter === "archived") {
      query.isActive = false;
    }
    // "all" and "active" — no additional filter beyond default (isActive true)
  }
  if (search) query.$or = [{ name: new RegExp(search, "i") }, { tags: new RegExp(search, "i") }];
  if (category) query.category = category;

  const skip = (Number(page) - 1) * Number(limit);
  // Sort by createdAt desc, then _id as a deterministic tiebreaker. All
  // products were seeded at the same timestamp, so without a stable second
  // key MongoDB falls back to its natural order — which varies between
  // queries and makes each page return a different, shuffled set.
  const [products, total] = await Promise.all([
    Product.find(query).sort("-createdAt _id").skip(skip).limit(Number(limit)).populate("category"),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: products.map(productSummary),
    meta: { page: Number(page), limit: Number(limit), total },
  });
});

// @DESCRIPTION Delete a product (admin). With permanent=true, destroys the
// document and all associated Cloudinary images; otherwise soft-deletes.
// @ROUTE       DELETE /api/v1/products/:id
// @ACCESS      Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { permanent } = req.query;
  if (permanent === "true") {
    if (product.images?.length) {
      const publicIds = product.images.map((url) => cloudinaryPublicIdFromUrl(url)).filter(Boolean);
      const { deleteFromCloudinary } = await import("../utils/cloudinaryUtils.js");
      await Promise.all(publicIds.map((id) => deleteFromCloudinary(id).catch(() => {})));
    }
    await Product.findByIdAndDelete(product._id);
    // Cascade removal of any soft-deleted references so the DB stays tidy.
    await Promise.allSettled([
      Cart.deleteMany({ product: product._id }),
      Review.deleteMany({ product: product._id }),
      Inventory.deleteMany({ product: product._id }),
    ]);

    req.activity = {
      action: "product.deleted",
      entity: "product",
      entityId: product._id,
      entityName: product.name,
      actionType: "delete",
      description: `${req.user.name} permanently deleted "${product.name}"`,
    };

    res.json({ success: true, message: "Product permanently deleted" });
    return;
  }

  product.isActive = false;
  await product.save();

  req.activity = {
    action: "product.archived",
    entity: "product",
    entityId: product._id,
    entityName: product.name,
    actionType: "status_toggle",
    description: `${req.user.name} archived "${product.name}"`,
  };

  res.json({ success: true, message: "Product archived" });
});

const getProductStats = asyncHandler(async (req, res) => {
  const { isActive, category, stockFilter, search } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  } else if (stockFilter === "outOfStock") {
    query.stock = 0;
  } else if (stockFilter === "lowStock") {
    query.stock = { $gt: 0, $lte: 5 };
  } else if (stockFilter === "archived") {
    query.isActive = false;
  }
  if (category) query.category = category;
  if (search) query.$or = [{ name: new RegExp(search, "i") }, { tags: new RegExp(search, "i") }];

  const [total, active, lowStock, outOfStock] = await Promise.all([
    Product.countDocuments(query),
    Product.countDocuments({ ...query, isActive: true }),
    // Low stock and out of stock count ALL products (active + archived)
    Product.countDocuments({ ...query, stock: { $gt: 0, $lte: 5 } }),
    Product.countDocuments({ ...query, stock: 0 }),
  ]);
  res.json({ success: true, data: { total, active, lowStock, outOfStock } });
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
