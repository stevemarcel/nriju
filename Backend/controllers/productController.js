import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import { productSummary } from "../utils/format.js";

// @DESCRIPTION List active products with filters, search, sort and pagination
// @ROUTE       GET /api/v1/products
// @ACCESS      Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    type,
    sort,
    page = 1,
    limit = 20,
  } = req.query;

  const query = Product.find({ isActive: true });
  if (category) query.where("category").equals(category);
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
  const product = await Product.findOne({ slug: req.params.slug }).populate(
    "category",
  );
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, data: productSummary(product) });
});

// @DESCRIPTION Create a product (admin)
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
    images,
    tags,
    isFeatured,
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
    tags: tags || [],
    isFeatured: !!isFeatured,
    stock: 0,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

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
    "images",
    "tags",
    "isActive",
    "isFeatured",
    "notifyOnOutOfStock",
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) product[key] = req.body[key];
  }
  product.updatedBy = req.user._id;

  await product.save();
  res.json({ success: true, data: productSummary(product) });
});

// @DESCRIPTION Soft-delete a product (admin)
// @ROUTE       DELETE /api/v1/products/:id
// @ACCESS      Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  product.isActive = false;
  await product.save();
  res.json({ success: true, message: "Product archived" });
});

export {
  getProducts,
  getFeatured,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};