import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import Setting from "../models/Setting.js";

const REPAIRS = [
  {
    key: "delivery_fee_own",
    inflatedValue: 50000000,
    correctedValue: 500000,
  },
  {
    key: "delivery_fee_thirdparty",
    inflatedValue: 75000000,
    correctedValue: 750000,
  },
];

const repairInflatedDeliveryFees = async () => {
  try {
    await connectDB();

    let repaired = 0;

    for (const { key, inflatedValue, correctedValue } of REPAIRS) {
      const result = await Setting.updateOne(
        { key, value: inflatedValue },
        { $set: { value: correctedValue } },
      );

      if (result.modifiedCount === 1) repaired += 1;
    }

    console.log(`Repaired delivery fee settings: ${repaired}/${REPAIRS.length}`.green.bold);
  } catch (error) {
    console.error("Delivery fee repair failed:".red, error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

repairInflatedDeliveryFees();
