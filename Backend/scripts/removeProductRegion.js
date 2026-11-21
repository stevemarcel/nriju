import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import Product from "../models/Product.js";

const removeProductRegion = async () => {
  try {
    await connectDB();
    const result = await Product.updateMany(
      { region: { $exists: true } },
      { $unset: { region: "" } },
      { strict: false },
    );

    const regionIndexes = (await Product.collection.indexes()).filter((index) =>
      Object.prototype.hasOwnProperty.call(index.key, "region"),
    );
    await Promise.all(regionIndexes.map((index) => Product.collection.dropIndex(index.name)));

    console.log(
      `Removed region from ${result.modifiedCount} products and dropped ${regionIndexes.length} index(es).`
        .green.bold,
    );
  } catch (error) {
    console.error("Product region migration failed:".red, error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

removeProductRegion();
