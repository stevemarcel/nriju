// Run from the project root. This helper never uses the database named in .env.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import mongoose from "mongoose";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import InventoryMovement from "../models/InventoryMovement.js";
import ActivityLog from "../models/ActivityLog.js";
import Cart from "../models/Cart.js";
import { addStockBatch } from "../services/inventoryService.js";

const DATABASE = "nriju_costing_sandbox";
const manifestPath = new URL("../../.sandbox-costing.json", import.meta.url);
const command = process.argv[2] || "status";
const assertSandbox = () => assert.equal(mongoose.connection.name, DATABASE);
const readManifest = async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.database, DATABASE);
  assert.match(manifest.marker, /^COST-BROWSER-[a-f0-9]{12}$/);
  for (const key of ["userId", "categoryId", "productId"]) {
    assert.ok(mongoose.isValidObjectId(manifest[key]), `Invalid ${key}`);
  }
  return manifest;
};

// Only a fresh random product created by this helper can satisfy this probe.
// Probe both the backend and Vite proxy before sending any login request.
const verifyServer = async (manifest) => {
  for (const origin of ["http://localhost:5000", "http://localhost:5173"]) {
    const response = await fetch(`${origin}/api/v1/products/${manifest.slug}`, {
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200, `${origin} sandbox probe failed`);
    const { data } = await response.json();
    assert.equal(data._id, manifest.productId, "Server returned the wrong product");
    assert.equal(data.name, manifest.marker, "Server returned the wrong marker");
    console.log(`Verified sandbox fixture through ${origin}`);
  }
};

const create = async () => {
  const marker = `COST-BROWSER-${randomBytes(6).toString("hex")}`;
  const manifest = {
    database: DATABASE,
    marker,
    slug: marker.toLowerCase(),
    email: `${marker.toLowerCase()}@example.test`,
    userId: new mongoose.Types.ObjectId().toString(),
    categoryId: new mongoose.Types.ObjectId().toString(),
    productId: new mongoose.Types.ObjectId().toString(),
  };
  // Reserve before the first DB write, so even a partial run can be cleaned up.
  // Exclusive creation prevents accidentally resetting an existing test run.
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  const password = `Nriju-${randomBytes(12).toString("base64url")}!`;
  assertSandbox();
  await User.create({
    _id: manifest.userId,
    name: marker,
    email: manifest.email,
    password,
    role: "admin",
    isVerified: true,
    isActive: true,
  });
  const user = await User.findById(manifest.userId).select("+password");
  assert.notEqual(user.password, password);
  assert.ok(await user.matchPassword(password), "Password hashing verification failed");
  // Show this once; no plaintext password is saved to disk.
  console.log(`Email: ${manifest.email}\nPassword: ${password}`);
  await Category.create({
    _id: manifest.categoryId,
    name: marker,
    description: "Temporary sandbox browser testing category",
  });
  await Product.create({
    _id: manifest.productId,
    name: marker,
    description: "Temporary sandbox inventory costing browser test",
    slug: manifest.slug,
    category: manifest.categoryId,
    price: 100000,
    costPrice: 12345,
    stock: 0,
    tags: [marker],
    createdBy: manifest.userId,
  });
  await addStockBatch({
    productId: manifest.productId,
    quantity: 10,
    unitCost: 12345,
    batch: `${marker}-OPENING`,
    reason: `${marker}: opening stock`,
    performedBy: manifest.userId,
  });
  console.log(`Product: ${marker}\nProduct ID: ${manifest.productId}`);
  console.log("Opening stock: 10; product default cost: 12345 kobo (NGN 123.45)");
  await verifyLogin(manifest, password);
};

const verifyLogin = async (manifest, password) => {
  assert.ok(password, "SANDBOX_ADMIN_PASSWORD is required for verify-login");
  await verifyServer(manifest);
  const response = await fetch("http://localhost:5173/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: manifest.email, password }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, "Login verification failed");
  const { data } = await response.json();
  assert.equal(data._id, manifest.userId);
  assert.equal(data.role, "admin");
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("jwt="), "Login did not issue a session cookie");
  const inventoryResponse = await fetch(
    `http://localhost:5173/api/v1/inventory/${manifest.productId}/batches`,
    { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) },
  );
  assert.equal(inventoryResponse.status, 200, "Admin inventory access failed");
  const inventory = (await inventoryResponse.json()).data;
  const product = await Product.findById(manifest.productId).lean();
  assert.equal(inventory.product.stock, product.stock);
  assert.equal(
    inventory.batches.length,
    await Inventory.countDocuments({ product: manifest.productId }),
  );
  const openingBatch = inventory.batches.find(
    ({ batch }) => batch === `${manifest.marker}-OPENING`,
  );
  assert.equal(openingBatch?.unitCost, 12345);
  console.log("Verified login cookie, admin access, stock mirror, and opening batch via Vite.");
};

const status = async (manifest) => {
  const product = await Product.findById(manifest.productId).lean();
  const batches = await Inventory.find({ product: manifest.productId })
    .sort({ createdAt: 1 })
    .lean();
  const movements = await InventoryMovement.find({ product: manifest.productId })
    .sort({ createdAt: 1 })
    .lean();
  console.log(
    JSON.stringify(
      {
        database: DATABASE,
        product: product && {
          name: product.name,
          stock: product.stock,
          costPrice: product.costPrice,
        },
        batches: batches.map(({ batch, quantity, unitCost }) => ({ batch, quantity, unitCost })),
        movements: movements.map(
          ({ type, quantity, unitCost, stockBefore, stockAfter, reason }) => ({
            type,
            quantity,
            unitCost,
            stockBefore,
            stockAfter,
            reason,
          }),
        ),
        activityLogs: await ActivityLog.countDocuments({ entityId: manifest.productId }),
      },
      null,
      2,
    ),
  );
};

const cleanup = async (manifest) => {
  assertSandbox();
  // Verify ownership before deleting anything; allow missing records for partial runs.
  for (const [model, id] of [
    [User, manifest.userId],
    [Category, manifest.categoryId],
    [Product, manifest.productId],
  ]) {
    const record = await model.findById(id).lean();
    if (record)
      assert.equal(record.name, manifest.marker, "Fixture ownership mismatch; cleanup refused");
  }
  await ActivityLog.deleteMany({
    $or: [
      { entityId: { $in: [manifest.productId, manifest.categoryId, manifest.userId] } },
      { user: manifest.userId },
    ],
  });
  await InventoryMovement.deleteMany({ product: manifest.productId });
  await Inventory.deleteMany({ product: manifest.productId });
  await Product.deleteOne({ _id: manifest.productId, name: manifest.marker });
  await Category.deleteOne({ _id: manifest.categoryId, name: manifest.marker });
  await Cart.deleteMany({ user: manifest.userId });
  await User.deleteOne({ _id: manifest.userId, name: manifest.marker });
  await unlink(manifestPath);
  console.log(
    "Removed this helper's temporary fixture and related inventory history from the sandbox.",
  );
};

try {
  assert.ok(
    ["create", "status", "verify-server", "verify-login", "cleanup"].includes(command),
    "Use create, status, verify-server, verify-login, or cleanup",
  );
  assert.ok(process.env.MONGO_URI, "MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: DATABASE,
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 15000,
  });
  assertSandbox();
  console.log(`Connected to isolated database: ${DATABASE}`);
  if (command === "create") await create();
  else {
    const manifest = await readManifest();
    if (command === "status") await status(manifest);
    if (command === "verify-server") await verifyServer(manifest);
    if (command === "verify-login") {
      await verifyLogin(manifest, process.env.SANDBOX_ADMIN_PASSWORD);
      await status(manifest);
    }
    if (command === "cleanup") await cleanup(manifest);
  }
} catch (error) {
  // Never print a driver error/stack that might contain connection credentials.
  console.error(
    `Sandbox helper failed (${error.code || error.name}). No credentials or connection strings logged.`,
  );
  console.error(
    "If creation began, keep .sandbox-costing.json for status or cleanup; do not run the general seed.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
