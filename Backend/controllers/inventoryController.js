import asyncHandler from "express-async-handler";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import { recomputeStock, recomputeStocks } from "../services/inventoryService.js";

// @DESCRIPTION List inventory batches with optional filters
// @ROUTE       GET /api/v1/inventory
// @ACCESS      Admin
const getInventory = asyncHandler(async (req, res) => {
  const { product, isActive, expiryBefore, source, reason, page = 1, limit = 50 } = req.query;

  const query = {};
  if (product) query.product = product;
  if (isActive !== undefined) query.isActive = isActive === "true";
  if (expiryBefore) query.expiryDate = { $lt: new Date(expiryBefore) };
  if (source) query.source = source;
  if (reason) query.reason = new RegExp(reason, "i");

  const [batches, total] = await Promise.all([
    Inventory.find(query)
      .populate("product", "name sku images category unit")
      .populate({
        path: "product",
        populate: { path: "category", select: "name" },
      })
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .sort("expiryDate")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Inventory.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: batches,
    meta: { page: Number(page), limit: Number(limit), total },
  });
});

// @DESCRIPTION Get low stock or expiring soon items
// @ROUTE       GET /api/v1/inventory/alerts
// @ACCESS      Admin
const getInventoryAlerts = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const expiryThreshold = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

  const expiringSoon = await Inventory.find({
    isActive: true,
    expiryDate: { $lte: expiryThreshold },
  })
    .populate("product", "name")
    .sort("expiryDate")
    .limit(50);

  res.json({
    success: true,
    data: { expiringSoon },
  });
});

// @DESCRIPTION Create a new inventory batch (restock)
// @ROUTE       POST /api/v1/inventory
// @ACCESS      Admin
const createInventoryBatch = asyncHandler(async (req, res) => {
  const { productId, batch, quantity, expiryDate, supplier, location, reason, source } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const inventoryBatch = await Inventory.create({
    product: productId,
    batch,
    quantity,
    expiryDate,
    supplier,
    location,
    createdBy: req.user._id,
    updatedBy: req.user._id,
    reason: reason || (source === "damaged" ? "damaged goods" : "restock"),
    source: source || "restock",
  });

  // Recompute the product's stock
  const newStock = await recomputeStock(productId);

  // Enrich activity log
  req.activity = {
    action: "inventory.batch.created",
    entity: "inventory",
    entityId: inventoryBatch._id,
    description: `${req.user.name} added ${quantity}${product.unit} of ${product.name} (batch: ${batch})`,
  };

  res.status(201).json({
    success: true,
    data: inventoryBatch,
    message: `Batch created. ${product.name} stock is now ${newStock}.`,
  });
});

// @DESCRIPTION Update an inventory batch
// @ROUTE       PUT /api/v1/inventory/:id
// @ACCESS      Admin
const updateInventoryBatch = asyncHandler(async (req, res) => {
  const batch = await Inventory.findById(req.params.id).populate("product");

  if (!batch) {
    res.status(404);
    throw new Error("Inventory batch not found");
  }

  const allowed = [
    "batch",
    "quantity",
    "expiryDate",
    "supplier",
    "location",
    "isActive",
    "reason",
    "source",
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) batch[key] = req.body[key];
  }

  batch.updatedBy = req.user._id;
  await batch.save();

  // Recompute the product's stock
  const newStock = await recomputeStock(batch.product._id);

  // Enrich activity log
  req.activity = {
    action: "inventory.batch.updated",
    entity: "inventory",
    entityId: batch._id,
    description: `${req.user.name} updated batch ${batch.batch} (${batch.quantity}${batch.product.unit})`,
  };

  res.json({
    success: true,
    data: batch,
    message: `Batch updated. Stock is now ${newStock}.`,
  });
});

// @DESCRIPTION Void/deactivate an inventory batch (e.g., spoiled stock)
// @ROUTE       DELETE /api/v1/inventory/:id
// @ACCESS      Admin
const voidInventoryBatch = asyncHandler(async (req, res) => {
  const batch = await Inventory.findById(req.params.id).populate("product");

  if (!batch) {
    res.status(404);
    throw new Error("Inventory batch not found");
  }

  batch.isActive = false;
  batch.updatedBy = req.user._id;
  batch.source = "void";
  await batch.save();

  // Recompute the product's stock
  const newStock = await recomputeStock(batch.product._id);

  // Enrich activity log
  req.activity = {
    action: "inventory.batch.voided",
    entity: "inventory",
    entityId: batch._id,
    description: `${req.user.name} voided batch ${batch.batch} (${batch.quantity}${batch.product.unit})`,
  };

  res.json({
    success: true,
    message: `Batch voided. ${batch.product.name} stock is now ${newStock}.`,
  });
});

// @DESCRIPTION Recompute stock for a product (manual sync)
// @ROUTE       POST /api/v1/inventory/:productId/recompute
// @ACCESS      Admin
const recomputeProductStock = asyncHandler(async (req, res) => {
  const stock = await recomputeStock(req.params.productId);

  res.json({
    success: true,
    data: { productId: req.params.productId, stock },
  });
});

export {
  getInventory,
  getInventoryAlerts,
  createInventoryBatch,
  updateInventoryBatch,
  voidInventoryBatch,
  recomputeProductStock,
};
