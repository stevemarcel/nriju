import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import {
  LOW_STOCK_THRESHOLD,
  addStockBatch,
  removeStockFIFO,
  adjustStockToCount,
  recordDamagedStock,
  recordCustomerReturn,
} from "../services/inventoryService.js";
import { recordInventoryActivity } from "../utils/inventoryActivity.js";

const fail = (res, message, status = 400) => {
  res.status(status);
  throw new Error(message);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req, res, defaultLimit = 10) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? defaultLimit);

  if (!Number.isInteger(page) || page < 1) {
    fail(res, "Page must be a positive integer.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    fail(res, "Limit must be an integer between 1 and 100.");
  }

  return { page, limit, skip: (page - 1) * limit };
};

const parseQuantity = (value, label = "Quantity", { allowZero = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    const error = new Error(`${label} is required.`);
    error.status = 400;
    throw error;
  }

  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 0 || (!allowZero && quantity === 0)) {
    const error = new Error(
      `${label} must be a ${allowZero ? "non-negative" : "positive"} whole number.`,
    );
    error.status = 400;
    throw error;
  }

  return quantity;
};

// Money fields sent to the API are integer kobo, consistent with Product.price.
const parseOptionalKobo = (value, label = "Unit cost") => {
  if (value === undefined || value === null || value === "") return undefined;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    const error = new Error(`${label} must be a non-negative integer amount in kobo.`);
    error.status = 400;
    throw error;
  }
  return amount;
};

const parseProductId = (productId, res) => {
  if (!mongoose.isValidObjectId(productId)) {
    fail(res, "Invalid product ID.");
  }
};

const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const getInventoryQuery = (req, res) => {
  const { search, category, stockFilter, isActive } = req.query;
  const query = {};

  if (category) {
    if (!mongoose.isValidObjectId(category)) {
      fail(res, "Invalid category ID.");
    }
    query.category = category;
  }

  if (isActive !== undefined) {
    if (isActive !== "true" && isActive !== "false") {
      fail(res, "isActive must be true or false.");
    }
    query.isActive = isActive === "true";
  }

  if (stockFilter) {
    const activeConstraint = query.isActive;
    if (stockFilter === "archived") {
      if (activeConstraint === true) fail(res, "Archived cannot be combined with isActive=true.");
      query.isActive = false;
    } else if (stockFilter === "active") {
      if (activeConstraint === false) fail(res, "Active cannot be combined with isActive=false.");
      query.isActive = true;
    } else {
      // Stock-state filters only apply to active products.
      if (activeConstraint === false) {
        fail(res, "Stock filters cannot be combined with archived products.");
      }
      query.isActive = true;
      if (stockFilter === "inStock") query.stock = { $gt: LOW_STOCK_THRESHOLD };
      else if (stockFilter === "lowStock") {
        query.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
      } else if (stockFilter === "outOfStock") query.stock = 0;
      else if (stockFilter !== "all") fail(res, "Invalid stock filter.");
    }
  }

  if (search !== undefined) {
    if (typeof search !== "string") fail(res, "Search must be a string.");
    const value = search.trim();
    if (value) {
      const regex = new RegExp(escapeRegex(value), "i");
      query.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }
  }

  return query;
};

// @DESCRIPTION List products with their current inventory valuation.
// @ROUTE       GET /api/v1/inventory
// @ACCESS      Admin
const getInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, res, 10);
  const query = getInventoryQuery(req, res);

  const [products, total] = await Promise.all([
    Product.find(query)
      .select(
        "name description images unit price costPrice category stock isActive productType createdAt updatedAt",
      )
      .populate("category", "name")
      .sort({ isActive: -1, name: 1, _id: 1 })
      .collation({ locale: "en", strength: 2 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  const productIds = products.map((product) => product._id);
  let batchValues = [];

  if (productIds.length) {
    batchValues = await Inventory.aggregate([
      {
        $match: {
          product: { $in: productIds },
          isActive: true,
          quantity: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: Product.collection.name,
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: "$productDoc" },
      {
        $addFields: {
          effectiveUnitCost: {
            $cond: [
              { $ne: ["$unitCost", null] },
              "$unitCost",
              {
                $cond: [{ $gte: ["$productDoc.costPrice", 0] }, "$productDoc.costPrice", null],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$product",
          stockValue: {
            $sum: {
              $cond: [
                { $ne: ["$effectiveUnitCost", null] },
                { $multiply: ["$quantity", "$effectiveUnitCost"] },
                0,
              ],
            },
          },
          costedUnits: {
            $sum: {
              $cond: [{ $ne: ["$effectiveUnitCost", null] }, "$quantity", 0],
            },
          },
          totalUnits: { $sum: "$quantity" },
        },
      },
    ]);
  }

  const batchMap = new Map(batchValues.map((item) => [String(item._id), item]));

  const data = products.map((product) => {
    const batchStats = batchMap.get(String(product._id));
    const stock = product.stock ?? 0;
    const stockValue = batchStats?.stockValue ?? 0;
    const costedUnits = batchStats?.costedUnits ?? 0;

    return {
      _id: product._id,
      name: product.name,
      description: product.description,
      images: product.images || [],
      unit: product.unit,
      price: product.price,
      costPrice: product.costPrice ?? null,
      stock,
      stockValue,
      averageUnitCost: costedUnits > 0 ? Math.round(stockValue / costedUnits) : null,
      costCoverage: {
        costedUnits,
        totalUnits: stock,
        complete: costedUnits >= stock,
      },
      category: product.category?.name || "—",
      categoryId: product.category?._id || null,
      isActive: product.isActive,
      productType: product.productType,
      status: !product.isActive
        ? "archived"
        : stock === 0
          ? "out_of_stock"
          : stock <= LOW_STOCK_THRESHOLD
            ? "low_stock"
            : "in_stock",
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  });

  res.json({
    success: true,
    data,
    meta: { page, limit, total },
  });
});

// @DESCRIPTION Get inventory valuation and stock health statistics.
// @ROUTE       GET /api/v1/inventory/stats
// @ACCESS      Admin
const getInventoryStats = asyncHandler(async (_req, res) => {
  const [activeProducts, lowStock, outOfStock, [valuation]] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({
      isActive: true,
      stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD },
    }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Inventory.aggregate([
      {
        $match: {
          isActive: true,
          quantity: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: Product.collection.name,
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: "$productDoc" },
      { $match: { "productDoc.isActive": true } },
      {
        $addFields: {
          effectiveUnitCost: {
            $cond: [
              { $ne: ["$unitCost", null] },
              "$unitCost",
              {
                $cond: [{ $gte: ["$productDoc.costPrice", 0] }, "$productDoc.costPrice", null],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$quantity" },
          costedUnits: {
            $sum: {
              $cond: [{ $ne: ["$effectiveUnitCost", null] }, "$quantity", 0],
            },
          },
          stockValue: {
            $sum: {
              $cond: [
                { $ne: ["$effectiveUnitCost", null] },
                { $multiply: ["$quantity", "$effectiveUnitCost"] },
                0,
              ],
            },
          },
          potentialGrossProfit: {
            $sum: {
              $cond: [
                { $ne: ["$effectiveUnitCost", null] },
                {
                  $multiply: [
                    "$quantity",
                    { $subtract: ["$productDoc.price", "$effectiveUnitCost"] },
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      activeProducts,
      lowStock,
      outOfStock,
      totalUnits: valuation?.totalUnits ?? 0,
      costedUnits: valuation?.costedUnits ?? 0,
      uncostedUnits: Math.max(0, (valuation?.totalUnits ?? 0) - (valuation?.costedUnits ?? 0)),
      stockValue: valuation?.stockValue ?? 0,
      potentialGrossProfit: valuation?.potentialGrossProfit ?? 0,
    },
  });
});

// @DESCRIPTION List physical batches for a product.
// @ROUTE       GET /api/v1/inventory/:productId/batches
// @ACCESS      Admin
const getProductBatches = asyncHandler(async (req, res) => {
  parseProductId(req.params.productId, res);
  const product = await Product.findById(req.params.productId).select("name unit stock");
  if (!product) fail(res, "Product not found.", 404);

  const batches = await Inventory.find({ product: product._id })
    .sort({ receivedDate: -1, createdAt: -1, _id: -1 })
    .populate("createdBy", "name role")
    .populate("updatedBy", "name role");

  res.json({
    success: true,
    data: {
      product: { _id: product._id, name: product.name, unit: product.unit, stock: product.stock },
      batches,
    },
  });
});

// @DESCRIPTION List stock movement history.
// @ROUTE       GET /api/v1/inventory/movements
// @ACCESS      Admin
const getInventoryMovements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, res, 25);
  const { productId, type, direction } = req.query;
  const query = {};

  if (productId) {
    if (!mongoose.isValidObjectId(productId)) fail(res, "Invalid product ID.");
    query.product = productId;
  }
  if (type) query.type = type;
  if (direction) {
    if (!["in", "out"].includes(direction)) fail(res, "Direction must be in or out.");
    query.direction = direction;
  }

  const [movements, total] = await Promise.all([
    InventoryMovement.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("product", "name unit images")
      .populate("batch", "batch receivedDate supplier location")
      .populate("performedBy", "name role"),
    InventoryMovement.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: movements,
    meta: { page, limit, total },
  });
});

// @DESCRIPTION Add a new stock batch.
// @ROUTE       POST /api/v1/inventory/:productId/add
// @ACCESS      Admin
const addStock = asyncHandler(async (req, res) => {
  parseProductId(req.params.productId, res);
  const quantity = parseQuantity(req.body.quantity);
  const hasUnitCost = Object.prototype.hasOwnProperty.call(req.body, "unitCost");

  const unitCost = hasUnitCost
    ? req.body.unitCost === null
      ? null
      : parseOptionalKobo(req.body.unitCost)
    : undefined;

  const useProductCostFallback = !hasUnitCost;
  const reason = String(req.body.reason || "").trim();
  const supplier = String(req.body.supplier || "").trim();
  const location = String(req.body.location || "").trim();

  const result = await runInTransaction((session) =>
    addStockBatch({
      productId: req.params.productId,
      quantity,
      unitCost,
      useProductCostFallback,
      batch: req.body.batch,
      receivedDate: req.body.receivedDate,
      supplier,
      location,
      reason,
      performedBy: req.user?._id,
      session,
    }),
  );

  recordInventoryActivity(req, {
    action: "stock_added",
    product: result.product,
    before: result.stockBefore,
    after: result.stockAfter,
    quantity,
    reason,
    batch: result.batch.batch,
    unitCost: result.batch.unitCost,
    supplier: result.batch.supplier,
    location: result.batch.location,
  });

  res.status(201).json({
    success: true,
    message: `Added ${quantity} ${result.product.unit || "units"} to inventory.`,
    data: {
      productId: result.product._id,
      batch: result.batch,
      previousStock: result.stockBefore,
      newStock: result.stockAfter,
    },
  });
});

// @DESCRIPTION Remove stock using FIFO batch consumption.
// @ROUTE       POST /api/v1/inventory/:productId/remove
// @ACCESS      Admin
const removeStock = asyncHandler(async (req, res) => {
  parseProductId(req.params.productId, res);
  const quantity = parseQuantity(req.body.quantity);
  const reason = String(req.body.reason || "").trim();

  const result = await runInTransaction((session) =>
    removeStockFIFO({
      productId: req.params.productId,
      quantity,
      reason,
      performedBy: req.user?._id,
      session,
    }),
  );

  const product = await Product.findById(req.params.productId).select("name unit");
  recordInventoryActivity(req, {
    action: "stock_removed",
    product,
    before: result.stockBefore,
    after: result.stockAfter,
    quantity,
    reason,
  });

  res.json({
    success: true,
    message: `Removed ${quantity} ${product.unit || "units"} from inventory.`,
    data: {
      productId: product._id,
      previousStock: result.stockBefore,
      newStock: result.stockAfter,
      allocations: result.allocations,
    },
  });
});

// @DESCRIPTION Reconcile stock to a physical count.
// @ROUTE       POST /api/v1/inventory/:productId/adjust
// @ACCESS      Admin
const adjustStockDirect = asyncHandler(async (req, res) => {
  parseProductId(req.params.productId, res);
  const quantity = parseQuantity(req.body.quantity, "Physical stock count", {
    allowZero: true,
  });
  const hasUnitCost = Object.prototype.hasOwnProperty.call(req.body, "unitCost");

  const unitCost = hasUnitCost
    ? req.body.unitCost === null
      ? null
      : parseOptionalKobo(req.body.unitCost)
    : undefined;

  const useProductCostFallback = !hasUnitCost;
  const reason = String(req.body.reason || "").trim();

  const result = await runInTransaction((session) =>
    adjustStockToCount({
      productId: req.params.productId,
      quantity,
      unitCost,
      useProductCostFallback,
      reason,
      performedBy: req.user?._id,
      session,
    }),
  );

  if (result.changed) {
    const product =
      result.product || (await Product.findById(req.params.productId).select("name unit"));
    recordInventoryActivity(req, {
      action: "stock_adjusted",
      product,
      before: result.stockBefore,
      after: result.stockAfter,
      quantity: Math.abs(result.difference),
      reason,
    });
  }

  res.json({
    success: true,
    message: result.changed
      ? "Physical stock count reconciled."
      : "Stock already matches the physical count.",
    data: {
      productId: req.params.productId,
      previousStock: result.stockBefore,
      newStock: result.stockAfter,
      difference: result.difference,
      changed: result.changed,
    },
  });
});

// @DESCRIPTION Record damaged stock.
// @ROUTE       POST /api/v1/inventory/:productId/damage
// @ACCESS      Admin
const damageStock = asyncHandler(async (req, res) => {
  parseProductId(req.params.productId, res);
  const quantity = parseQuantity(req.body.quantity);
  const reason = String(req.body.reason || "").trim();
  if (!reason) fail(res, "Please provide a reason for the damaged stock.");

  const result = await runInTransaction((session) =>
    recordDamagedStock({
      productId: req.params.productId,
      quantity,
      reason,
      performedBy: req.user?._id,
      session,
    }),
  );

  const product = await Product.findById(req.params.productId).select("name unit");
  recordInventoryActivity(req, {
    action: "stock_damaged",
    product,
    before: result.stockBefore,
    after: result.stockAfter,
    quantity,
    reason,
  });

  res.json({
    success: true,
    message: "Damaged stock recorded.",
    data: {
      productId: product._id,
      previousStock: result.stockBefore,
      newStock: result.stockAfter,
      allocations: result.allocations,
    },
  });
});

// @DESCRIPTION Record inspected, resalable customer returns as a new batch.
// @ROUTE       POST /api/v1/inventory/:productId/return
// @ACCESS      Admin
const returnStock = asyncHandler(async (req, res) => {
  parseProductId(req.params.productId, res);
  const quantity = parseQuantity(req.body.quantity);
  const unitCost = parseOptionalKobo(req.body.unitCost);
  const reason = String(req.body.reason || "").trim();
  if (!reason) fail(res, "Please provide a reason for the returned stock.");

  const result = await runInTransaction((session) =>
    recordCustomerReturn({
      productId: req.params.productId,
      quantity,
      unitCost,
      reason,
      supplier: req.body.supplier,
      location: req.body.location,
      performedBy: req.user?._id,
      session,
    }),
  );

  recordInventoryActivity(req, {
    action: "stock_returned",
    product: result.product,
    before: result.stockBefore,
    after: result.stockAfter,
    quantity,
    reason,
    batch: result.batch.batch,
    unitCost: result.batch.unitCost,
    supplier: result.batch.supplier,
    location: result.batch.location,
  });

  res.status(201).json({
    success: true,
    message: "Returned stock added to sellable inventory.",
    data: {
      productId: result.product._id,
      batch: result.batch,
      previousStock: result.stockBefore,
      newStock: result.stockAfter,
    },
  });
});

export {
  getInventory,
  getInventoryStats,
  getProductBatches,
  getInventoryMovements,
  addStock,
  removeStock,
  adjustStockDirect,
  damageStock,
  returnStock,
};
