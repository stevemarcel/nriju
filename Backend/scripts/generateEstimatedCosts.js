import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";

const TARGET_DB = "nriju-DB";
const MIGRATION_NAME = "generate_estimated_product_and_batch_costs_v1";

const APPLY = process.argv.includes("--apply");
// By default, preserve any existing positive Product.costPrice. Add
// --replace-existing only when those values are placeholders you want replaced.
const REPLACE_EXISTING = process.argv.includes("--replace-existing");

// These are starting assumptions, not verified supplier-cost benchmarks.
// Values are gross margin percentages (profit / selling price).
const GROSS_MARGIN_RANGES = {
  cooked: [0.35, 0.45],
  fresh: [0.25, 0.35],
  packaged: [0.2, 0.3],
  default: [0.25, 0.35],
};

// Missing historical batch costs are estimated within +/- 1% of the
// corresponding product cost. The variation is deterministic by batch ID,
// so a dry-run preview and the subsequent apply produce identical values.
const BATCH_COST_VARIATION = 0.01;

const formatNaira = (kobo) =>
  kobo == null
    ? "—"
    : `₦${(kobo / 100).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const isPositiveSafeInteger = (value) => Number.isSafeInteger(value) && value > 0;

// Stable pseudo-random value in [0, 1), based on a string seed.
// This avoids changing calculated values between dry-run and apply.
const seededUnit = (seed) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};

const calculateProductCost = (product) => {
  if (!isPositiveSafeInteger(product.price)) return null;

  const [minimumMargin, maximumMargin] =
    GROSS_MARGIN_RANGES[product.productType] || GROSS_MARGIN_RANGES.default;
  const random = seededUnit(`${product._id}:gross-margin`);
  const grossMargin = minimumMargin + random * (maximumMargin - minimumMargin);
  const costPrice = Math.round(product.price * (1 - grossMargin));

  if (!Number.isSafeInteger(costPrice) || costPrice < 0) return null;

  return {
    costPrice,
    grossMargin,
  };
};

const calculateBatchCost = (productCost, batchId) => {
  const random = seededUnit(`${batchId}:batch-cost`);
  const variation = (random * 2 - 1) * BATCH_COST_VARIATION;
  return {
    unitCost: Math.max(0, Math.round(productCost * (1 + variation))),
    variation,
  };
};

const promptForApply = async () => {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`Type APPLY ESTIMATED COSTS TO ${TARGET_DB} to continue: `);
    return answer.trim() === `APPLY ESTIMATED COSTS TO ${TARGET_DB}`;
  } finally {
    rl.close();
  }
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Check the project .env file.");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: TARGET_DB,
    serverSelectionTimeoutMS: 15000,
  });

  if (mongoose.connection.name !== TARGET_DB) {
    throw new Error(
      `Safety check failed: connected to '${mongoose.connection.name}', expected '${TARGET_DB}'.`,
    );
  }

  console.log(`\nConnected database: ${mongoose.connection.name}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN (no changes will be made)"}`);
  console.log(`Replace existing positive product costs: ${REPLACE_EXISTING ? "YES" : "NO"}`);
  console.log("\nGross-margin assumptions:");
  console.log("  cooked:    35%–45%");
  console.log("  fresh:     25%–35%");
  console.log("  packaged:  20%–30%");
  console.log("  other:     25%–35%");
  console.log("  missing batch costs: estimated product cost +/- 1%\n");

  const products = await Product.find({})
    .select("_id name slug price productType costPrice")
    .lean();

  if (!products.length) {
    throw new Error(`No products found in ${TARGET_DB}.`);
  }

  const productById = new Map(products.map((product) => [String(product._id), product]));
  const effectiveCostByProduct = new Map();
  const productUpdates = [];
  const productPreview = [];
  let productCostsPreserved = 0;
  let productsSkippedWithoutSalePrice = 0;

  for (const product of products) {
    const existingCostIsKnown = isPositiveSafeInteger(product.costPrice);
    const generated = calculateProductCost(product);

    let effectiveCost = null;
    let shouldUpdate = false;
    let margin = null;

    if (existingCostIsKnown && !REPLACE_EXISTING) {
      effectiveCost = product.costPrice;
      productCostsPreserved += 1;
    } else if (generated) {
      effectiveCost = generated.costPrice;
      margin = generated.grossMargin;
      shouldUpdate = true;
    } else if (existingCostIsKnown) {
      // For a free/zero-priced product, preserve an existing positive cost
      // rather than inventing a cost from a zero selling price.
      effectiveCost = product.costPrice;
      productCostsPreserved += 1;
    } else {
      productsSkippedWithoutSalePrice += 1;
    }

    if (effectiveCost != null) {
      effectiveCostByProduct.set(String(product._id), effectiveCost);
    }

    if (shouldUpdate) {
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id, costPrice: product.costPrice ?? null },
          update: { $set: { costPrice: effectiveCost } },
        },
      });
    }

    productPreview.push({
      product,
      effectiveCost,
      generated: shouldUpdate,
      margin,
    });
  }

  // unitCost:null matches both explicit null and missing fields in MongoDB.
  const missingCostBatches = await Inventory.find({ unitCost: null })
    .select("_id product batch unitCost")
    .lean();

  const batchUpdates = [];
  const batchPreview = [];
  let batchesSkippedWithoutProductCost = 0;

  for (const batch of missingCostBatches) {
    const productId = String(batch.product);
    const product = productById.get(productId);
    const productCost = effectiveCostByProduct.get(productId);

    if (!product || !isPositiveSafeInteger(productCost)) {
      batchesSkippedWithoutProductCost += 1;
      continue;
    }

    const generated = calculateBatchCost(productCost, String(batch._id));

    batchUpdates.push({
      updateOne: {
        filter: { _id: batch._id, unitCost: null },
        update: { $set: { unitCost: generated.unitCost } },
      },
    });

    batchPreview.push({
      batch,
      product,
      productCost,
      unitCost: generated.unitCost,
      variation: generated.variation,
    });
  }

  const existingBatchCostCount = await Inventory.countDocuments({ unitCost: { $ne: null } });

  console.log("PRE-FLIGHT SUMMARY");
  console.log("-------------------");
  console.log(`Products found:                         ${products.length}`);
  console.log(`Product cost prices to generate/update: ${productUpdates.length}`);
  console.log(`Existing product costs preserved:       ${productCostsPreserved}`);
  console.log(`Products skipped (no usable sale price):${productsSkippedWithoutSalePrice}`);
  console.log(`Inventory batches found:                ${await Inventory.countDocuments({})}`);
  console.log(`Batches with an existing unitCost:      ${existingBatchCostCount}`);
  console.log(`Missing batch costs to fill:            ${batchUpdates.length}`);
  console.log(`Batches skipped (no usable product cost):${batchesSkippedWithoutProductCost}`);

  console.log("\nPRODUCT COST PREVIEW (first 30)");
  for (const item of productPreview.slice(0, 30)) {
    const { product, effectiveCost, generated, margin } = item;
    const action = generated ? "GENERATE" : effectiveCost != null ? "PRESERVE" : "SKIP";
    const marginText = margin == null ? "" : ` | gross margin ${(margin * 100).toFixed(1)}%`;
    console.log(
      `- ${product.name}: sale ${formatNaira(product.price)} -> cost ${formatNaira(effectiveCost)} [${action}]${marginText}`,
    );
  }

  console.log("\nMISSING BATCH COST PREVIEW (first 30)");
  for (const item of batchPreview.slice(0, 30)) {
    console.log(
      `- ${item.product.name} | ${item.batch.batch || item.batch._id}: ${formatNaira(item.unitCost)} (product base ${formatNaira(item.productCost)}, variation ${(item.variation * 100).toFixed(2)}%)`,
    );
  }

  if (!APPLY) {
    console.log("\nDRY RUN COMPLETE. No database documents were changed.");
    console.log("Review the proposed values, then rerun with --apply to save them.");
    return;
  }

  const confirmed = await promptForApply();
  if (!confirmed) {
    console.log("\nConfirmation did not match. No database documents were changed.");
    return;
  }

  const session = await mongoose.startSession();
  const migrationRecord = {
    migrationName: MIGRATION_NAME,
    database: TARGET_DB,
    createdAt: new Date(),
    assumptions: {
      costBasis:
        "Estimated from current selling price using gross-margin ranges; not verified supplier costs.",
      grossMarginRanges: GROSS_MARGIN_RANGES,
      missingBatchCostVariation: `+/- ${BATCH_COST_VARIATION * 100}% around the effective product cost`,
      existingNonNullBatchUnitCosts: "Preserved",
      orderCostOfGoodsSold: "Not modified",
    },
    counts: {
      productsFound: products.length,
      productCostsUpdated: productUpdates.length,
      productCostsPreserved,
      productsSkippedWithoutSalePrice,
      batchesWithExistingUnitCost: existingBatchCostCount,
      batchCostsFilled: batchUpdates.length,
      batchesSkippedWithoutProductCost,
    },
    productChanges: productPreview
      .filter((item) => item.generated)
      .map(({ product, effectiveCost, margin }) => ({
        productId: product._id,
        name: product.name,
        sellingPrice: product.price,
        previousCostPrice: product.costPrice ?? null,
        estimatedCostPrice: effectiveCost,
        grossMargin: margin,
      })),
    batchChanges: batchPreview.map(({ batch, product, productCost, unitCost, variation }) => ({
      batchId: batch._id,
      productId: batch.product,
      productName: product.name,
      previousUnitCost: batch.unitCost ?? null,
      estimatedUnitCost: unitCost,
      productEstimatedCost: productCost,
      variation,
    })),
  };

  try {
    await session.withTransaction(async () => {
      if (productUpdates.length) {
        await Product.bulkWrite(productUpdates, { session, ordered: true });
      }
      if (batchUpdates.length) {
        await Inventory.bulkWrite(batchUpdates, { session, ordered: true });
      }
      await mongoose.connection
        .collection("system_migrations")
        .insertOne(migrationRecord, { session });
    });
  } finally {
    await session.endSession();
  }

  console.log("\nESTIMATED COST UPDATE COMPLETED");
  console.log(`Product cost prices updated: ${productUpdates.length}`);
  console.log(`Missing batch unitCosts filled: ${batchUpdates.length}`);
  console.log("Existing non-null batch unitCosts were preserved.");
  console.log("Order costOfGoodsSold records were not modified.");
  console.log("An audit record was saved in system_migrations.");
};

run()
  .catch((error) => {
    console.error("\nEstimated cost update failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
