import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Product from "../models/Product.js";
import { LOW_STOCK_THRESHOLD } from "../utils/inventoryConstants.js";

export { LOW_STOCK_THRESHOLD };

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
};

const assertObjectId = (value, label = "Product ID") => {
  if (!mongoose.isValidObjectId(value)) {
    throw fail(`Invalid ${label}.`);
  }
};

const assertPositiveQuantity = (quantity) => {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw fail("Quantity must be a positive whole number.");
  }
};

const assertNonNegativeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw fail(`${label} must be a non-negative integer.`);
  }
};

const sessionOptions = (session) => (session ? { session } : {});

const withSession = (query, session) => (session ? query.session(session) : query);

const makeBatchNumber = () =>
  `NRJ-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14)}-${randomBytes(3).toString("hex").toUpperCase()}`;

const getProductOrThrow = async (productId, session) => {
  assertObjectId(productId);
  const product = await withSession(
    Product.findById(productId).select("name stock costPrice price isActive unit"),
    session,
  );

  if (!product) throw fail("Product not found.", 404);
  return product;
};

const recordMovement = async (payload, session) => {
  const [movement] = await InventoryMovement.create([payload], sessionOptions(session));
  return movement;
};

/**
 * The inventory collection is the stock source of truth.
 * No expiry filtering is performed: expiry is not part of the inventory model.
 * Legacy negative adjustment rows are still included in the net sum so the
 * transition does not silently inflate existing stock. New operations never
 * create negative-quantity batches.
 */
export const computeAvailableStock = async (productId, session) => {
  assertObjectId(productId);

  const pipeline = [
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
        isActive: true,
      },
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ];

  let aggregation = Inventory.aggregate(pipeline);
  if (session) aggregation = aggregation.session(session);
  const [result] = await aggregation;

  return Math.max(0, result?.total ?? 0);
};

/** Recalculate the denormalized Product.stock mirror. */
export const recomputeStock = async (productId, session) => {
  const total = await computeAvailableStock(productId, session);
  const result = await Product.updateOne(
    { _id: productId },
    { $set: { stock: total } },
    { ...sessionOptions(session), runValidators: true },
  );

  if (result.matchedCount === 0) {
    throw fail("Product not found while recalculating stock.", 404);
  }

  return total;
};

/** Recalculate multiple products sequentially (safe within a session). */
export const recomputeStocks = async (productIds, session) => {
  const results = [];
  for (const productId of [...new Set(productIds.map(String))]) {
    results.push({
      productId,
      stock: await recomputeStock(productId, session),
    });
  }
  return results;
};

const createBatch = async ({
  product,
  quantity,
  unitCost = null,
  batch,
  receivedDate,
  supplier = "",
  location = "",
  source = "restock",
  reason = "",
  performedBy,
  session,
}) => {
  assertPositiveQuantity(quantity);

  if (unitCost !== null && unitCost !== undefined) {
    assertNonNegativeInteger(unitCost, "Unit cost (kobo)");
  }

  const batchDocument = new Inventory({
    product: product._id,
    batch: typeof batch === "string" && batch.trim() ? batch.trim() : makeBatchNumber(),
    quantity,
    unitCost:
      unitCost ??
      (Number.isSafeInteger(product.costPrice) && product.costPrice >= 0
        ? product.costPrice
        : null),
    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
    supplier: String(supplier || "").trim(),
    location: String(location || "").trim(),
    isActive: true,
    createdBy: performedBy || undefined,
    updatedBy: performedBy || undefined,
    source,
    reason: String(reason || "").trim(),
  });

  if (Number.isNaN(batchDocument.receivedDate.getTime())) {
    throw fail("Received date is invalid.");
  }

  await batchDocument.save(sessionOptions(session));
  return batchDocument;
};

/** Add a newly received batch to inventory. unitCost is integer kobo. */
export const addStockBatch = async ({
  productId,
  quantity,
  unitCost,
  batch,
  receivedDate,
  supplier,
  location,
  reason,
  performedBy,
  session,
  source = "restock",
}) => {
  const product = await getProductOrThrow(productId, session);
  assertPositiveQuantity(quantity);

  const stockBefore = await computeAvailableStock(productId, session);
  const batchDocument = await createBatch({
    product,
    quantity,
    unitCost,
    batch,
    receivedDate,
    supplier,
    location,
    source,
    reason,
    performedBy,
    session,
  });
  const stockAfter = await recomputeStock(productId, session);

  await recordMovement(
    {
      product: product._id,
      batch: batchDocument._id,
      type:
        source === "adjust" ? "adjustment_in" : source === "return" ? "customer_return" : "restock",
      direction: "in",
      quantity,
      unitCost: batchDocument.unitCost,
      stockBefore,
      stockAfter,
      reason: String(reason || "").trim(),
      referenceType: source === "return" ? "return" : "manual",
      performedBy: performedBy || undefined,
      metadata: {
        batch: batchDocument.batch,
        supplier: batchDocument.supplier,
        location: batchDocument.location,
        source,
      },
    },
    session,
  );

  return {
    product,
    batch: batchDocument,
    stockBefore,
    stockAfter,
  };
};

/**
 * FIFO deduction. Returns the exact batch allocations, which orders should
 * persist so cancellation can return the stock to its original batches and
 * historical cost can be calculated later.
 */
export const deductStockFIFO = async (
  productId,
  quantity,
  session,
  {
    type = "sale",
    reason = "",
    referenceType = "order",
    referenceId,
    referenceLabel = "",
    performedBy,
  } = {},
) => {
  assertObjectId(productId);
  assertPositiveQuantity(quantity);

  const product = await getProductOrThrow(productId, session);
  const stockBefore = await computeAvailableStock(productId, session);

  if (stockBefore < quantity) {
    throw fail(
      `Insufficient stock for ${product.name}. Available: ${stockBefore}; requested: ${quantity}.`,
      409,
    );
  }

  // No expiry is used. Oldest received batches are consumed first.
  const batchesQuery = Inventory.find({
    product: product._id,
    isActive: true,
    quantity: { $gt: 0 },
  }).sort({ receivedDate: 1, createdAt: 1, _id: 1 });

  const batches = await withSession(batchesQuery, session);
  let remaining = quantity;
  const allocations = [];
  const movementDrafts = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;

    // Atomic conditional decrement protects against stale batch values.
    const updatedBatch = await Inventory.findOneAndUpdate(
      {
        _id: batch._id,
        isActive: true,
        quantity: { $gte: take },
      },
      {
        $inc: { quantity: -take },
        ...(performedBy ? { $set: { updatedBy: performedBy } } : {}),
      },
      { new: true, ...sessionOptions(session) },
    );

    if (!updatedBatch) {
      throw fail("Stock changed during this operation. Please try again.", 409);
    }

    const effectiveUnitCost =
      batch.unitCost ??
      (Number.isSafeInteger(product.costPrice) && product.costPrice >= 0
        ? product.costPrice
        : null);

    allocations.push({
      batch: batch._id,
      quantity: take,
      unitCost: effectiveUnitCost,
    });

    movementDrafts.push({
      product: product._id,
      batch: batch._id,
      type,
      direction: "out",
      quantity: take,
      unitCost: effectiveUnitCost,
      reason: String(reason || "").trim(),
      referenceType,
      referenceId,
      referenceLabel,
      performedBy: performedBy || undefined,
      metadata: { batch: batch.batch },
    });

    remaining -= take;
  }

  if (remaining > 0) {
    throw fail(
      `Unable to allocate ${quantity} units of ${product.name}. Please refresh inventory and try again.`,
      409,
    );
  }

  const stockAfter = await recomputeStock(productId, session);

  for (const draft of movementDrafts) {
    await recordMovement(
      {
        ...draft,
        stockBefore,
        stockAfter,
      },
      session,
    );
  }

  return {
    productId: product._id,
    quantity,
    stockBefore,
    stockAfter,
    allocations,
  };
};

/** Remove stock manually using FIFO. */
export const removeStockFIFO = async ({ productId, quantity, reason, performedBy, session }) =>
  deductStockFIFO(productId, quantity, session, {
    type: "manual_removal",
    referenceType: "manual",
    referenceLabel: "Manual stock removal",
    reason,
    performedBy,
  });

/** Record damaged stock by removing affected units from FIFO batches. */
export const recordDamagedStock = async ({ productId, quantity, reason, performedBy, session }) => {
  if (!String(reason || "").trim()) {
    throw fail("A reason is required when recording damaged stock.");
  }

  return deductStockFIFO(productId, quantity, session, {
    type: "damage",
    referenceType: "manual",
    referenceLabel: "Damaged stock",
    reason,
    performedBy,
  });
};

/**
 * Reconcile inventory to a physical count. Positive differences create an
 * adjustment batch; negative differences consume existing batches FIFO.
 */
export const adjustStockToCount = async ({
  productId,
  quantity,
  unitCost,
  reason,
  performedBy,
  session,
}) => {
  assertNonNegativeInteger(quantity, "Physical stock count");
  const product = await getProductOrThrow(productId, session);
  const stockBefore = await computeAvailableStock(productId, session);

  if (quantity === stockBefore) {
    return {
      product,
      changed: false,
      stockBefore,
      stockAfter: stockBefore,
      difference: 0,
      allocations: [],
    };
  }

  if (quantity > stockBefore) {
    const difference = quantity - stockBefore;
    const result = await addStockBatch({
      productId,
      quantity: difference,
      unitCost,
      reason: reason || "Physical stock count adjustment",
      performedBy,
      session,
      source: "adjust",
    });

    return {
      ...result,
      changed: true,
      difference,
      allocations: [],
    };
  }

  const difference = stockBefore - quantity;
  const result = await deductStockFIFO(productId, difference, session, {
    type: "adjustment_out",
    referenceType: "manual",
    referenceLabel: "Physical stock count adjustment",
    reason: reason || "Physical stock count adjustment",
    performedBy,
  });

  return {
    product,
    changed: true,
    stockBefore,
    stockAfter: result.stockAfter,
    difference: -difference,
    allocations: result.allocations,
  };
};

/** Record inspected, resalable customer returns as a new inventory batch. */
export const recordCustomerReturn = async ({
  productId,
  quantity,
  unitCost,
  reason,
  supplier,
  location,
  performedBy,
  session,
}) => {
  if (!String(reason || "").trim()) {
    throw fail("A reason is required when recording returned stock.");
  }

  return addStockBatch({
    productId,
    quantity,
    unitCost,
    supplier,
    location,
    reason,
    performedBy,
    session,
    source: "return",
  });
};

/**
 * Restore an order's original FIFO allocations. If an old order has no
 * allocation snapshot, restore its quantity into a new return batch. This
 * fallback preserves quantities but cannot reconstruct historical batch cost.
 */
export const restoreStockAllocations = async (
  productId,
  allocations,
  session,
  {
    quantity: fallbackQuantity,
    reason = "Stock restored after order cancellation",
    performedBy,
    referenceId,
    referenceLabel = "Order cancellation",
    fallbackUnitCost = null,
  } = {},
) => {
  const product = await getProductOrThrow(productId, session);
  const stockBefore = await computeAvailableStock(productId, session);
  const normalized = Array.isArray(allocations) ? allocations : [];

  if (!normalized.length) {
    assertPositiveQuantity(fallbackQuantity);
    const batch = await createBatch({
      product,
      quantity: fallbackQuantity,
      unitCost: fallbackUnitCost,
      reason,
      performedBy,
      session,
      source: "return",
    });
    const stockAfter = await recomputeStock(productId, session);

    await recordMovement(
      {
        product: product._id,
        batch: batch._id,
        type: "order_cancelled",
        direction: "in",
        quantity: fallbackQuantity,
        unitCost: batch.unitCost,
        stockBefore,
        stockAfter,
        reason,
        referenceType: "order",
        referenceId,
        referenceLabel,
        performedBy: performedBy || undefined,
        metadata: { legacyOrderWithoutAllocationSnapshot: true },
      },
      session,
    );

    return {
      stockBefore,
      stockAfter,
      restoredQuantity: fallbackQuantity,
      legacyFallback: true,
    };
  }

  let restoredQuantity = 0;

  for (const allocation of normalized) {
    const quantity = Number(allocation.quantity);
    assertPositiveQuantity(quantity);

    const batchId = allocation.batch?._id || allocation.batch;
    let batch = null;
    let restoredToOriginalBatch = false;

    if (batchId && mongoose.isValidObjectId(batchId)) {
      batch = await Inventory.findOneAndUpdate(
        { _id: batchId, product: product._id, isActive: true },
        {
          $inc: { quantity },
          ...(performedBy ? { $set: { updatedBy: performedBy } } : {}),
        },
        { new: true, ...sessionOptions(session) },
      );
      restoredToOriginalBatch = Boolean(batch);
    }

    // If the original batch was removed/voided, create a traceable return batch.
    if (!batch) {
      const [created] = await Inventory.create(
        [
          {
            product: product._id,
            batch: makeBatchNumber(),
            quantity,
            unitCost: allocation.unitCost ?? fallbackUnitCost,
            receivedDate: new Date(),
            supplier: "",
            location: "",
            isActive: true,
            createdBy: performedBy || undefined,
            updatedBy: performedBy || undefined,
            source: "return",
            reason,
          },
        ],
        sessionOptions(session),
      );
      batch = created;
    }

    restoredQuantity += quantity;

    await recordMovement(
      {
        product: product._id,
        batch: batch._id,
        type: "order_cancelled",
        direction: "in",
        quantity,
        unitCost: allocation.unitCost ?? batch.unitCost,
        stockBefore,
        stockAfter: stockBefore + restoredQuantity,
        reason,
        referenceType: "order",
        referenceId,
        referenceLabel,
        performedBy: performedBy || undefined,
        metadata: { restoredToOriginalBatch },
      },
      session,
    );
  }

  const stockAfter = await recomputeStock(productId, session);

  return {
    stockBefore,
    stockAfter,
    restoredQuantity,
    legacyFallback: false,
  };
};
