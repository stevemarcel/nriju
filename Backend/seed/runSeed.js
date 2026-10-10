import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import { toKobo } from "../utils/money.js";
import { computeAvailableStock } from "../services/inventoryService.js";

import categories from "./categories.js";
import products from "./products.js";
import users from "./users.js";
import coupons from "./coupons.js";

const runSeed = async () => {
  try {
    await connectDB();

    // ------------------------------------------------------------
    // Wipe existing data — safe: only collections this script owns
    // ------------------------------------------------------------
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      User.deleteMany({}),
      Coupon.deleteMany({}),
    ]);

    // ------------------------------------------------------------
    // 1. Categories
    // ------------------------------------------------------------
    const createdCategories = await Category.create(categories);
    console.log(`${createdCategories.length} categories seeded.`.green);

    const categoryMap = {};
    createdCategories.forEach((c) => {
      categoryMap[c.name] = c._id;
    });

    // ------------------------------------------------------------
    // 2. Users
    // ------------------------------------------------------------
    // create(), NOT insertMany() — insertMany skips pre("save"),
    // which would store passwords in plaintext.
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users seeded.`.green);

    const adminUser = createdUsers.find((u) => u.role === "superAdmin");
    if (!adminUser) {
      throw new Error("No superAdmin user found in seed data.");
    }

    // ------------------------------------------------------------
    // 3. Products
    // ------------------------------------------------------------
    // Seed authored in naira → store integer kobo. create() so slug
    // hook + kobo validators run.
    // `stock` (opening qty) is applied here; Inventory batch is created
    // next so Product.stock stays consistent with unexpired batches.
    const seedRows = products.map(({ stock, categoryName, ...rest }) => ({
      ...rest,
      price: toKobo(rest.price),
      compareAtPrice: rest.compareAtPrice != null ? toKobo(rest.compareAtPrice) : null,
      stock: 0, // provisional — recomputed from Inventory below
      category: categoryMap[categoryName],
      images: [],
      createdBy: adminUser._id,
      updatedBy: null,
    }));

    const createdProducts = await Product.create(seedRows);
    if (createdProducts.length !== products.length) {
      throw new Error(`Expected ${products.length} products, got ${createdProducts.length}.`);
    }
    console.log(`${createdProducts.length} products seeded.`.green);

    // ------------------------------------------------------------
    // 4. Inventory batches — cooked: short expiry, packaged: long shelf
    //    life. Quantity from seed stock. Then recompute Product.stock
    //    from the active unexpired batches (no more `|| 10` fiction).
    // ------------------------------------------------------------
    const inventoryDocs = createdProducts.map((product, i) => {
      const isCooked = product.productType === "cooked";
      const quantity = products[i].stock;
      const prefix = product.name.slice(0, 8).toUpperCase().replace(/\s+/g, "");

      return {
        product: product._id,
        batch: isCooked ? `FRESH-${prefix}-${Date.now()}` : `WH-${prefix}-${Date.now()}`,
        quantity,
        expiryDate: new Date(Date.now() + (isCooked ? 24 : 180 * 24) * 60 * 60 * 1000),
        receivedDate: new Date(),
        supplier: isCooked ? "Nriju Kitchen" : "Nriju Warehouse",
        location: isCooked ? "Fresh Prep" : "Aisle A",
        isActive: true,
      };
    });

    const createdInventory = await Inventory.insertMany(inventoryDocs);
    console.log(`${createdInventory.length} inventory batches seeded.`.green);

    // Mirror real availability onto the denormalized Product.stock field.
    let totalAvailable = 0;
    for (const product of createdProducts) {
      const available = await computeAvailableStock(product._id);
      product.stock = available;
      totalAvailable += available;
      await product.save(); // runs hooks; stock already kobo-independent
    }
    console.log(`Product.stock recomputed from batches (${totalAvailable} total units).`.green);

    // ------------------------------------------------------------
    // 5. Coupons — money fields naira → kobo (minOrder, maxDiscount,
    //    and flat `value`). percent `value` stays a plain percentage.
    // ------------------------------------------------------------
    const couponRows = coupons.map((c) => ({
      ...c,
      value: c.type === "flat" ? toKobo(c.value) : c.value,
      minOrder: toKobo(c.minOrder),
      maxDiscount: c.maxDiscount != null ? toKobo(c.maxDiscount) : null,
    }));
    const createdCoupons = await Coupon.insertMany(couponRows);
    console.log(`${createdCoupons.length} coupons seeded.`.green);

    // ------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------
    console.log("\nSeed complete:".green.bold);
    console.log(`  Categories:  ${createdCategories.length}`);
    console.log(`  Users:       ${createdUsers.length}`);
    console.log(`  Products:    ${createdProducts.length}`);
    console.log(`  Inventory:   ${createdInventory.length}`);
    console.log(`  Coupons:     ${createdCoupons.length}`);

    await mongoose.connection.close();
    console.log("Database connection closed.".gray);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:".red, error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runSeed();
