import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";

const MIGRATION_ID = "inventory_remove_expiry_preserve_stock_v2";

const getSessionQuery = (query, session) => (session ? query.session(session) : query);

const toId = (value) => (value == null ? "" : String(value));

/**
 * Read-only preflight shared by the dry run and the actual migration.
 * Inventory batches are authoritative; Product.stock is their read-optimized
 * mirror. This migration deliberately does not change batch quantities or
 * isActive flags. It only removes the Inventory.expiryDate field and repairs
 * Product.stock to equal the sum of active inventory batch quantities.
 */
const buildInventorySnapshot = async (session) => {
  if (!mongoose.connection?.db) {
    throw new Error("MongoDB must be connected before inspecting inventory.");
  }

  const inventoryOptions = {
    projection: {
      _id: 1,
      product: 1,
      quantity: 1,
      isActive: 1,
      expiryDate: 1,
    },
    ...(session ? { session } : {}),
  };

  const inventoryDocuments = await Inventory.collection.find({}, inventoryOptions).toArray();

  const productQuery = getSessionQuery(Product.find({}).select("_id name stock").lean(), session);
  const products = await productQuery;

  const productsById = new Map(products.map((product) => [toId(product._id), product]));
  const activeStockByProduct = new Map();
  const activeBatchCountByProduct = new Map();
  const inventoryProductIds = new Set();

  let activeBatchCount = 0;
  let inactiveBatchCount = 0;
  let activeBatchStock = 0;
  let expiryDocuments = 0;

  for (const batch of inventoryDocuments) {
    const productId = toId(batch.product);

    if (!productId) {
      throw new Error(
        `Inventory batch ${toId(batch._id)} has no product reference. Migration stopped.`,
      );
    }

    if (!productsById.has(productId)) {
      throw new Error(
        `Inventory batch ${toId(batch._id)} references missing product ${productId}. Migration stopped.`,
      );
    }

    if (!Number.isSafeInteger(batch.quantity) || batch.quantity < 0) {
      throw new Error(
        `Inventory batch ${toId(batch._id)} has an invalid quantity (${String(batch.quantity)}). ` +
          "Expected a non-negative safe integer. Migration stopped without changing data.",
      );
    }

    if (typeof batch.isActive !== "boolean") {
      throw new Error(
        `Inventory batch ${toId(batch._id)} has a missing or invalid isActive value. ` +
          "Migration stopped without changing data.",
      );
    }

    if (Object.prototype.hasOwnProperty.call(batch, "expiryDate")) {
      expiryDocuments += 1;
    }

    inventoryProductIds.add(productId);

    if (batch.isActive) {
      activeBatchCount += 1;
      activeBatchStock += batch.quantity;
      activeStockByProduct.set(
        productId,
        (activeStockByProduct.get(productId) || 0) + batch.quantity,
      );
      activeBatchCountByProduct.set(productId, (activeBatchCountByProduct.get(productId) || 0) + 1);
    } else {
      inactiveBatchCount += 1;
    }
  }

  if (!Number.isSafeInteger(activeBatchStock)) {
    throw new Error("Total active inventory quantity exceeds the safe integer range.");
  }

  const stockReconciliation = products.map((product) => {
    const productId = toId(product._id);
    const expectedStock = activeStockByProduct.get(productId) || 0;
    const hasStockValue = product.stock !== undefined && product.stock !== null;
    const currentStock = hasStockValue ? Number(product.stock) : 0;

    if (!Number.isSafeInteger(currentStock) || currentStock < 0) {
      throw new Error(
        `Product ${product.name || productId} has an invalid stock value. Migration stopped.`,
      );
    }

    return {
      productId,
      name: product.name || "Unnamed product",
      currentStock,
      expectedStock,
      difference: expectedStock - currentStock,
      needsUpdate: !hasStockValue || expectedStock !== currentStock,
      activeBatchCount: activeBatchCountByProduct.get(productId) || 0,
    };
  });

  const mismatches = stockReconciliation.filter((item) => item.needsUpdate);
  const totalProductStockBefore = products.reduce(
    (total, product) => total + (product.stock == null ? 0 : Number(product.stock)),
    0,
  );
  const totalProductStockAfter = stockReconciliation.reduce(
    (total, item) => total + item.expectedStock,
    0,
  );

  if (
    !Number.isSafeInteger(totalProductStockBefore) ||
    !Number.isSafeInteger(totalProductStockAfter)
  ) {
    throw new Error("Product stock totals exceed the safe integer range.");
  }

  // listIndexes is not supported inside a multi-document transaction, and
  // the transactional caller only needs stock data.
  const indexes = session ? [] : await Inventory.collection.indexes();
  const expiryIndexes = indexes
    .filter((index) => Object.prototype.hasOwnProperty.call(index.key || {}, "expiryDate"))
    .map((index) => ({ name: index.name, key: index.key }));

  return {
    inventoryDocuments,
    products,
    stockReconciliation,
    report: {
      migrationId: MIGRATION_ID,
      inventoryBatchCount: inventoryDocuments.length,
      activeBatchCount,
      inactiveBatchCount,
      activeBatchStock,
      productCount: products.length,
      productsWithBatches: inventoryProductIds.size,
      expiryDocuments,
      expiryIndexes,
      productStockBefore: totalProductStockBefore,
      productStockAfter: totalProductStockAfter,
      stockMismatchCount: mismatches.length,
      stockMismatches: mismatches,
      quantityValuesWillChange: false,
      batchActiveFlagsWillChange: false,
      inventoryMovementRecordsWillChange: false,
    },
  };
};

/**
 * Read-only report. Safe to run against either a restored test database or
 * production; it performs no writes.
 */
export const inspectInventoryExpiryMigration = async () => {
  const { report } = await buildInventorySnapshot();
  return { ...report, dryRun: true, migrated: false };
};

/**
 * Remove expiry tracking while preserving all physical batch quantities,
 * batch IDs, product references, active flags, supplier/location/date data,
 * and inventory movement history.
 *
 * SAFETY: dryRun defaults to true. To apply the migration deliberately call:
 * migrateInventoryWithoutExpiry({ dryRun: false })
 *
 * Run only after connecting to the intended database and pausing application
 * writes. Test against a separately restored database before production.
 */
export const migrateInventoryWithoutExpiry = async ({ dryRun = true } = {}) => {
  const preview = await buildInventorySnapshot();

  if (dryRun) {
    return { ...preview.report, dryRun: true, migrated: false };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Re-read inside the transaction so the stock mirror is based on the
      // exact inventory state being migrated, not an earlier preview.
      const snapshot = await buildInventorySnapshot(session);

      await Inventory.collection.updateMany(
        { expiryDate: { $exists: true } },
        { $unset: { expiryDate: "" } },
        { session },
      );

      const productUpdates = snapshot.stockReconciliation
        .filter((item) => item.needsUpdate)
        .map((item) => ({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(item.productId) },
            update: { $set: { stock: item.expectedStock } },
          },
        }));

      if (productUpdates.length) {
        await Product.bulkWrite(productUpdates, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  // Index DDL is performed after the transaction. If interrupted, this
  // migration is safe to rerun: unsetting a missing field and recalculating
  // stock are both idempotent.
  const indexes = await Inventory.collection.indexes();
  const expiryIndexes = indexes.filter((index) =>
    Object.prototype.hasOwnProperty.call(index.key || {}, "expiryDate"),
  );

  for (const index of expiryIndexes) {
    if (index.name && index.name !== "_id_") {
      await Inventory.collection.dropIndex(index.name);
    }
  }

  const verification = await buildInventorySnapshot();
  if (verification.report.expiryDocuments !== 0) {
    throw new Error(
      `Post-migration verification failed: ${verification.report.expiryDocuments} inventory documents still contain expiryDate.`,
    );
  }
  if (verification.report.expiryIndexes.length !== 0) {
    throw new Error("Post-migration verification failed: an expiryDate index remains.");
  }
  if (verification.report.stockMismatchCount !== 0) {
    throw new Error(
      `Post-migration verification failed: ${verification.report.stockMismatchCount} product stock values do not match active inventory.`,
    );
  }

  await mongoose.connection.db.collection("system_migrations").updateOne(
    { _id: MIGRATION_ID },
    {
      $set: {
        completedAt: new Date(),
        inventoryBatchCount: verification.report.inventoryBatchCount,
        activeBatchStock: verification.report.activeBatchStock,
        productCount: verification.report.productCount,
        expiryDocumentsRemoved: preview.report.expiryDocuments,
        expiryIndexesRemoved: preview.report.expiryIndexes.map((index) => index.name),
        stockMismatchCountReconciled: preview.report.stockMismatchCount,
      },
    },
    { upsert: true },
  );

  return {
    ...verification.report,
    dryRun: false,
    migrated: true,
    expiryDocumentsRemoved: preview.report.expiryDocuments,
    expiryIndexesRemoved: preview.report.expiryIndexes.map((index) => index.name),
    stockMismatchCountReconciled: preview.report.stockMismatchCount,
  };
};
