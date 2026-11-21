import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const rebuildProductSales = async () => {
  try {
    await connectDB();

    const completedStatuses = ["delivered", "picked_up"];
    const totals = await Order.aggregate([
      { $match: { status: { $in: completedStatuses } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          quantity: { $sum: "$items.quantity" },
        },
      },
    ]);

    await Product.updateMany({}, { $set: { salesCount: 0 } });

    if (totals.length) {
      await Product.bulkWrite(
        totals.map(({ _id, quantity }) => ({
          updateOne: {
            filter: { _id },
            update: { $set: { salesCount: quantity } },
          },
        })),
      );
    }

    const markerTime = new Date();
    const markerResult = await Order.updateMany(
      { status: { $in: completedStatuses }, salesCountedAt: null },
      { $set: { salesCountedAt: markerTime } },
    );

    console.log(
      `Rebuilt sales totals for ${totals.length} products and marked ${markerResult.modifiedCount} completed orders.`
        .green.bold,
    );
  } catch (error) {
    console.error("Product sales rebuild failed:".red, error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

rebuildProductSales();
