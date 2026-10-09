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
    const createdCategories = await Category.insertMany(categories);
    console.log(`${createdCategories.length} categories seeded.`.green);

    const categoryMap = {};
    createdCategories.forEach((c) => {
      categoryMap[c.name] = c._id;
    });

    // ------------------------------------------------------------
    // 2. Users
    // ------------------------------------------------------------
    const createdUsers = await User.insertMany(users);
    console.log(`${createdUsers.length} users seeded.`.green);

    const adminUser = createdUsers.find((u) => u.role === "superAdmin");
    if (!adminUser) {
      throw new Error("No superAdmin user found in seed data.");
    }

    // ------------------------------------------------------------
    // 3. Products (with inventory batches)
    // ------------------------------------------------------------
    const productDocs = products.map((p) => ({
      ...p,
      category: categoryMap[p.categoryName],
      images: [],
      createdBy: adminUser._id,
      updatedBy: null,
    }));

    const createdProducts = await Product.insertMany(productDocs);
    console.log(`${createdProducts.length} products seeded.`.green);

    // ------------------------------------------------------------
    // 4. Inventory batches — cooked items get short expiry,
    //    packaged items get long shelf life.
    // ------------------------------------------------------------
    const inventoryDocs = [];
    createdProducts.forEach((product) => {
      const stock = product.stock || 10;
      const isCooked = product.productType === "cooked";

      if (isCooked) {
        // Fresh cooked: daily production, expires in 24-48 hours
        inventoryDocs.push({
          product: product._id,
          batch: `FRESH-${product.name.slice(0, 8).toUpperCase()}-${Date.now()}`,
          quantity: stock,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          receivedDate: new Date(),
          supplier: "Nriju Kitchen",
          location: "Fresh Prep",
          isActive: true,
        });
      } else {
        // Packaged/frozen: wholesale restock, 6-12 months
        inventoryDocs.push({
          product: product._id,
          batch: `WH-${product.name.slice(0, 8).toUpperCase()}-${Date.now()}`,
          quantity: stock,
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          receivedDate: new Date(),
          supplier: "Nriju Warehouse",
          location: "Aisle A",
          isActive: true,
        });
      }
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