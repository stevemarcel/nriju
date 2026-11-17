import "dotenv/config";

import mongoose from "mongoose";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";

import { addStockBatch, adjustStockToCount } from "../services/inventoryService.js";

const SANDBOX_DB = "nriju_costing_sandbox";
const TEST_COST_PRICE = 12345;

const marker = `COST-TEST-${randomBytes(5).toString("hex")}`;

let productId = null;
let connected = false;
let failures = 0;

const check = (description, actual, expected) => {
  try {
    assert.equal(actual, expected);
    console.log(`PASS: ${description}`);
  } catch (error) {
    failures++;
    console.error(`FAIL: ${description}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual:   ${actual}`);
  }
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  // Override the database path explicitly. Never use the application's
  // default database for this test.
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: SANDBOX_DB,
    serverSelectionTimeoutMS: 15000,
  });

  connected = true;

  if (mongoose.connection.name !== SANDBOX_DB) {
    throw new Error(`Safety check failed. Connected database: ${mongoose.connection.name}`);
  }

  console.log(`Connected to isolated database: ${SANDBOX_DB}`);

  const product = await Product.create({
    name: marker,
    description: "Temporary inventory costing test product",
    price: 100000,
    costPrice: TEST_COST_PRICE,
    category: new mongoose.Types.ObjectId(),
    stock: 0,
    isActive: true,
  });

  productId = product._id;

  console.log(`Created temporary product: ${marker}\n`);

  // 1. Explicit positive cost: ₦500 = 50,000 kobo.
  const positive = await addStockBatch({
    productId,
    quantity: 1,
    unitCost: 50000,
    useProductCostFallback: false,
    reason: marker,
  });

  check("Explicit ₦500 is stored as 50,000 kobo", positive.batch.unitCost, 50000);

  // 2. Explicit zero cost must remain zero.
  const zero = await addStockBatch({
    productId,
    quantity: 1,
    unitCost: 0,
    useProductCostFallback: false,
    reason: marker,
  });

  check("Explicit ₦0 is stored as zero", zero.batch.unitCost, 0);

  // 3. Omitted cost uses the product's known cost.
  const fallback = await addStockBatch({
    productId,
    quantity: 1,
    reason: marker,
  });

  check("Omitted cost falls back to Product.costPrice", fallback.batch.unitCost, TEST_COST_PRICE);

  // 4. Explicit null must suppress the product cost fallback.
  const unknown = await addStockBatch({
    productId,
    quantity: 1,
    unitCost: null,
    useProductCostFallback: false,
    reason: marker,
  });

  check("Explicit unknown cost remains null", unknown.batch.unitCost, null);

  // 5. Positive physical-count adjustment should also preserve cost.
  const adjustment = await adjustStockToCount({
    productId,
    quantity: 5,
    unitCost: 7777,
    useProductCostFallback: false,
    reason: marker,
  });

  check("Positive stock adjustment creates a batch", adjustment.batch?.unitCost, 7777);

  check("Stock is recalculated correctly", adjustment.stockAfter, 5);

  // 6. A product cost of zero is known and must remain a valid fallback.
  await Product.updateOne({ _id: productId }, { $set: { costPrice: 0 } });

  const zeroFallback = await addStockBatch({
    productId,
    quantity: 1,
    reason: marker,
  });

  check(
    "Omitted cost preserves a Product.costPrice fallback of zero",
    zeroFallback.batch.unitCost,
    0,
  );

  // Verify persisted batch records, not just returned objects.
  const batches = await Inventory.find({ product: productId }).sort({
    createdAt: 1,
  });

  check("Six inventory batches were persisted", batches.length, 6);

  const persistedCosts = batches.map((batch) => batch.unitCost);

  check(
    "Persisted batch costs match expected values",
    JSON.stringify(persistedCosts),
    JSON.stringify([50000, 0, TEST_COST_PRICE, null, 7777, 0]),
  );

  // Verify the corresponding movement history.
  const movements = await InventoryMovement.find({
    product: productId,
  });

  check("Six inventory movements were recorded", movements.length, 6);

  const finalProduct = await Product.findById(productId);

  check("Product stock mirror equals six", finalProduct.stock, 6);

  console.log("\n========== TEST SUMMARY ==========");

  if (failures === 0) {
    console.log("ALL COSTING SERVICE TESTS PASSED.");
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
  }
};

try {
  await run();
} catch (error) {
  failures++;
  console.error("\nTEST EXECUTION ERROR:");
  console.error(error.message);
} finally {
  if (connected && productId) {
    try {
      await InventoryMovement.deleteMany({ product: productId });
      await Inventory.deleteMany({ product: productId });
      await Product.deleteOne({ _id: productId });

      console.log("\nTemporary test records cleaned up.");
    } catch (cleanupError) {
      console.error("\nWARNING: Test cleanup failed.");
      console.error(cleanupError.message);
    }
  }

  if (connected) {
    await mongoose.disconnect();
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
