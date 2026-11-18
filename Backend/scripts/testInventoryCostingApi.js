import "dotenv/config";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import ActivityLog from "../models/ActivityLog.js";

import inventoryRoutes from "../routes/inventoryRoutes.js";
import activityLog from "../middleware/activityLog.js";

const SANDBOX_DB = "nriju_costing_sandbox";
const marker = `COST-API-${Date.now()}`;

let server;
let user;
let product;

const pass = (message) => console.log(`PASS: ${message}`);

const waitForActivityLogs = async (expectedCount) => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const count = await ActivityLog.countDocuments({
      entityId: product._id,
    });

    if (count >= expectedCount) return count;

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return ActivityLog.countDocuments({ entityId: product._id });
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is missing from .env");
  assert.ok(process.env.JWT_SECRET, "JWT_SECRET is missing from .env");

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: SANDBOX_DB,
    serverSelectionTimeoutMS: 15000,
  });

  assert.equal(mongoose.connection.name, SANDBOX_DB, "Connected to the wrong database. Aborting.");

  console.log(`Connected to isolated database: ${mongoose.connection.name}`);

  user = await User.create({
    name: "Cost API Test Admin",
    email: `${marker.toLowerCase()}@example.test`,
    password: "Temporary-Test-Password-9284!",
    role: "admin",
    isActive: true,
    isVerified: true,
  });

  product = await Product.create({
    name: marker,
    description: "Temporary inventory costing API test product.",
    price: 100000,
    costPrice: 12345,
    category: new mongoose.Types.ObjectId(),
    stock: 0,
  });

  console.log(`Created temporary test product: ${product.name}`);

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(activityLog);
  app.use("/api/v1/inventory", inventoryRoutes);

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    res
      .status(res.statusCode !== 200 ? res.statusCode : error.statusCode || error.status || 500)
      .json({
        success: false,
        message: error.message,
      });
  });

  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1/inventory`;
  const productUrl = `${baseUrl}/${product._id}`;

  const request = async (path, body, authenticated = true) => {
    const headers = { "Content-Type": "application/json" };

    if (authenticated) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
      method: "POST",
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const data = await response.json().catch(() => ({}));

    return { status: response.status, data };
  };

  // 1. Authentication must be required.
  const unauthenticated = await request(
    `${productUrl}/add`,
    { quantity: 1, unitCost: 50000 },
    false,
  );

  assert.equal(unauthenticated.status, 401);
  pass("Unauthenticated inventory requests are rejected");

  // 2. Explicit positive cost.
  const explicitCost = await request(`${productUrl}/add`, {
    quantity: 1,
    unitCost: 50000,
    reason: marker,
  });

  assert.equal(explicitCost.status, 201, JSON.stringify(explicitCost.data));
  assert.equal(explicitCost.data.data.batch.unitCost, 50000);
  pass("API stores an explicitly supplied cost of 50,000 kobo");

  // 3. Explicit zero cost.
  const zeroCost = await request(`${productUrl}/add`, {
    quantity: 1,
    unitCost: 0,
    reason: marker,
  });

  assert.equal(zeroCost.status, 201, JSON.stringify(zeroCost.data));
  assert.equal(zeroCost.data.data.batch.unitCost, 0);
  pass("API preserves zero as a known cost");

  // 4. Omitted cost uses the product cost fallback.
  const fallbackCost = await request(`${productUrl}/add`, {
    quantity: 1,
    reason: marker,
  });

  assert.equal(fallbackCost.status, 201, JSON.stringify(fallbackCost.data));
  assert.equal(fallbackCost.data.data.batch.unitCost, 12345);
  pass("Omitted cost falls back to Product.costPrice");

  // 5. Explicit null must remain unknown.
  const unknownCost = await request(`${productUrl}/add`, {
    quantity: 1,
    unitCost: null,
    reason: marker,
  });

  assert.equal(unknownCost.status, 201, JSON.stringify(unknownCost.data));
  assert.equal(unknownCost.data.data.batch.unitCost, null);
  pass("Explicit null remains an unknown cost without fallback");

  // 6. Positive physical stock adjustment.
  const adjustment = await request(`${productUrl}/adjust`, {
    quantity: 5,
    unitCost: 7777,
    reason: marker,
  });

  assert.equal(adjustment.status, 200, JSON.stringify(adjustment.data));
  pass("Physical stock adjustment endpoint accepts the request");

  // 7. A known zero product cost remains a valid fallback through the API.
  await Product.updateOne({ _id: product._id }, { $set: { costPrice: 0 } });

  const zeroFallback = await request(`${productUrl}/add`, {
    quantity: 1,
    reason: marker,
  });

  assert.equal(zeroFallback.status, 201, JSON.stringify(zeroFallback.data));
  assert.equal(zeroFallback.data.data.batch.unitCost, 0);
  pass("API preserves a Product.costPrice fallback of zero");

  // 8. Verify persisted inventory records.
  const batches = await Inventory.find({ product: product._id }).sort({ createdAt: 1 }).lean();

  assert.equal(batches.length, 6);
  assert.deepEqual(
    batches.map((batch) => batch.unitCost),
    [50000, 0, 12345, null, 7777, 0],
  );
  pass("All six API-created batches have the expected persisted costs");

  // 9. Verify stock and movement records.
  const updatedProduct = await Product.findById(product._id).lean();

  assert.equal(updatedProduct.stock, 6);

  const movements = await InventoryMovement.countDocuments({
    product: product._id,
  });

  assert.equal(movements, 6);
  pass("Product stock mirror is 6 and six inventory movements exist");

  // 10. Verify audit records written by the real middleware.
  const activityCount = await waitForActivityLogs(6);

  assert.equal(activityCount, 6);

  const activities = await ActivityLog.find({
    entityId: product._id,
  }).lean();

  assert.equal(activities.length, 6);
  assert.ok(activities.every((activity) => activity.user.toString() === user._id.toString()));
  assert.ok(activities.every((activity) => activity.entity === "inventory"));
  assert.ok(activities.every((activity) => activity.action.startsWith("inventory.stock_")));

  pass("All six successful API mutations generated inventory activity log records");

  console.log("\n========== API TEST SUMMARY ==========");
  console.log("ALL INVENTORY COSTING API TESTS PASSED.");
};

try {
  await run();
} catch (error) {
  console.error("\nAPI TEST FAILED:");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (mongoose.connection.readyState === 1) {
    if (product?._id) {
      await ActivityLog.deleteMany({ entityId: product._id });
      await InventoryMovement.deleteMany({ product: product._id });
      await Inventory.deleteMany({ product: product._id });
      await Product.deleteOne({ _id: product._id });
    }

    if (user?._id) {
      await User.deleteOne({ _id: user._id });
    }

    console.log("\nTemporary API test records cleaned up.");

    await mongoose.disconnect();
  }
}
