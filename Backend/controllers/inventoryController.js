import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const getInventory = asyncHandler(async (req, res) => {
  const { search, category, stockFilter, isActive, page = 1, limit = 10 } = req.query;

  const query = {};
  if (category) query.category = category;
  if (isActive === "false") query.isActive = false;
  else if (isActive === "true") query.isActive = true;

  switch (stockFilter) {
    case "outOfStock":
      query.stock = 0;
      break;
    case "lowStock":
      query.$and = [{ stock: { $gt: 0 } }, { stock: { $lte: 10 } }];
      break;
    case "inStock":
      query.stock = { $gt: 10 };
      break;
  }

  if (search) {
    query.$or = [{ name: new RegExp(search, "i") }, { description: new RegExp(search, "i") }];
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .sort("-isActive name")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  const mapped = products.map((p) => ({
    _id: p._id,
    name: p.name,
    description: p.description,
    images: p.images || [],
    unit: p.unit,
    price: p.price,
    costPrice: p.costPrice,
    category: p.category?.name || "—",
    stock: p.stock ?? 0,
    isActive: p.isActive,
    productType: p.productType,
    status: !p.isActive
      ? "archived"
      : p.stock === 0
        ? "out_of_stock"
        : p.stock <= 10
          ? "low_stock"
          : "in_stock",
  }));

  res.json({
    success: true,
    data: mapped,
    meta: { page: Number(page), limit: Number(limit), total },
  });
});

const getInventoryStats = asyncHandler(async (req, res) => {
  const [result] = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        activeProducts: { $sum: 1 },
        lowStock: {
          $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] }, 1, 0] },
        },
        outOfStock: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
        stockValue: { $sum: { $multiply: ["$stock", { $ifNull: ["$costPrice", 0] }] } },
      },
    },
  ]);
  res.json({
    success: true,
    data: result || { activeProducts: 0, lowStock: 0, outOfStock: 0, stockValue: 0 },
  });
});

const adjustStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity, reason } = req.body;
  const action = req.actionType;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const parsedQty = Number(quantity);
  if (!Number.isInteger(parsedQty) || parsedQty < 0) {
    return res
      .status(400)
      .json({ success: false, message: "Quantity must be a non-negative integer" });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });

  const prev = product.stock;
  let next;

  switch (action) {
    case "add":
      next = prev + parsedQty;
      break;
    case "remove":
      if (parsedQty > prev)
        return res
          .status(400)
          .json({ success: false, message: "Cannot remove more than available" });
      next = prev - parsedQty;
      break;
    case "adjust":
      next = parsedQty;
      break;
    case "damage":
      if (parsedQty > prev)
        return res
          .status(400)
          .json({ success: false, message: "Cannot damage more than available" });
      next = prev - parsedQty;
      break;
    default:
      return res.status(400).json({ success: false, message: "Unknown action type" });
  }

  product.stock = Math.max(0, next);
  await product.save();

  const descriptions = {
    add: `${req.user.name} added ${parsedQty}${product.unit} of ${product.name}`,
    remove: `${req.user.name} removed ${parsedQty}${product.unit} of ${product.name}`,
    adjust: `${req.user.name} adjusted ${product.name} stock from ${prev} to ${product.stock}${product.unit}`,
    damage: `${req.user.name} damaged ${parsedQty}${product.unit} of ${product.name}${reason ? ` (${reason})` : ""}`,
  };

  req.activity = {
    action: "inventory.stock.updated",
    entity: "product",
    entityId: product._id,
    description: descriptions[action] || descriptions.add,
  };

  res.json({
    success: true,
    data: { productId: product._id, previousStock: prev, newStock: product.stock },
    message: descriptions[action],
  });
});

const addStock = asyncHandler(async (req, res) => {
  req.actionType = "add";
  await adjustStock(req, res);
});

const removeStock = asyncHandler(async (req, res) => {
  req.actionType = "remove";
  await adjustStock(req, res);
});

const adjustStockDirect = asyncHandler(async (req, res) => {
  req.actionType = "adjust";
  await adjustStock(req, res);
});

const damageStock = asyncHandler(async (req, res) => {
  req.actionType = "damage";
  await adjustStock(req, res);
});

export { getInventory, getInventoryStats, addStock, removeStock, adjustStockDirect, damageStock };
