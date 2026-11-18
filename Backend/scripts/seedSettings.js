import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import Setting from "../models/Setting.js";
import settings from "../seed/settings.js";

// One-shot settings seed. Safe to run repeatedly: it only fills keys that
// are missing, so values an admin changed in the Settings page survive a
// re-run. It never wipes or touches any other collection.
const runSeed = async () => {
  try {
    await connectDB();

    let created = 0;
    let existing = 0;

    for (const { key, value } of settings) {
      const already = await Setting.findOne({ key });
      if (already) {
        existing++;
        continue;
      }

      await Setting.create({ key, value });
      created++;
    }

    console.log("\nSettings seed complete:".green.bold);
    console.log(`  Created: ${created}`);
    console.log(`  Already present: ${existing}`);
    console.log(`  Total keys defined: ${settings.length}`);

    await mongoose.connection.close();
    console.log("Database connection closed.".gray);
    process.exit(0);
  } catch (error) {
    console.error("Settings seed failed:".red, error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runSeed();