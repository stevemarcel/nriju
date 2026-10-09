import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";

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
    // Must use create(), NOT insertMany() — insertMany skips the
    // pre("save") hook, which would store passwords in plaintext.
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users seeded.`.green);

    const adminUser = createdUsers.find((u) => u.role === "superAdmin");
    if (!adminUser) {
      throw new Error("No superAdmin user found in seed data.");
    }

    // ------------------------------------------------------------
    // 3. Products
    // ------------------------------------------------------------
    // Must use create(), NOT insertMany() — insertMany skips the
    // pre("save") hook, so slugs never generate and every product
    // collides on the empty-string unique slug index.
    //
    // `stock` is not a Product field: stock is computed from
    // Inventory batches. It lives in the seed data only to size the
    // opening batch, so it is destructured out before insert.
    const seedRows = products.map(({ stock, categoryName, ...rest }) => ({
      ...rest,
      category: categoryMap[categoryName],
      images: [],
      createdBy: adminUser._id,
      updatedBy: null,
    }));

    const createdProducts = await Product.create(seedRows);
    if (createdProducts.length !== products.length) {
      throw new Error(
        `Expected ${products.length} products, got ${createdProducts.length}.`,
      );
    }
    console.log(`${createdProducts.length} products seeded.`.green);

    // ------------------------------------------------------------
    // 4. Inventory batches — cooked items get short expiry,
    //    packaged items get long shelf life.
    // ------------------------------------------------------------
    const inventoryDocs = createdProducts.map((product, i) => {
      const isCooked = product.productType === "cooked";
      const quantity = products[i].stock;
      const prefix = product.name.slice(0, 8).toUpperCase().replace(/\s+/g, "");

      return {
        product: product._id,
        batch: isCooked
          ? `FRESH-${prefix}-${Date.now()}`
          : `WH-${prefix}-${Date.now()}`,
        quantity,
        // Fresh cooked: daily production, expires within 24 hours.
        // Packaged/frozen: wholesale restock, roughly 6 months.
        expiryDate: new Date(
          Date.now() + (isCooked ? 24 : 180 * 24) * 60 * 60 * 1000,
        ),
        receivedDate: new Date(),
        supplier: isCooked ? "Nriju Kitchen" : "Nriju Warehouse",
        location: isCooked ? "Fresh Prep" : "Aisle A",
        isActive: true,
      };
    });

    const createdInventory = await Inventory.insertMany(inventoryDocs);
    console.log(`${createdInventory.length} inventory batches seeded.`.green);

    // ------------------------------------------------------------
    // 5. Coupons
    // ------------------------------------------------------------
    const createdCoupons = await Coupon.insertMany(coupons);
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
