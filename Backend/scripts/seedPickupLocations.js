import "dotenv/config";
import mongoose from "mongoose";
import colors from "colors";

import connectDB from "../config/db.js";
import PickupLocation from "../models/PickupLocation.js";
import pickupLocations from "../seed/pickupLocations.js";

// One-shot pickup-location seed. Idempotent: upserts by `code`, never touches
// other collections, so existing admin edits to these locations survive.
const runSeed = async () => {
  try {
    await connectDB();

    let created = 0;
    let updated = 0;

    for (const location of pickupLocations) {
      const existing = await PickupLocation.findOne({ code: location.code });
      if (existing) {
        // update all editable fields in place
        const editable = [
          "name",
          "addressLine",
          "city",
          "state",
          "landmark",
          "phone",
          "openingHours",
          "instructions",
          "coordinates",
          "sortOrder",
          "isActive",
        ];
        for (const field of editable) {
          if (location[field] !== undefined) existing[field] = location[field];
        }
        await existing.save();
        updated++;
      } else {
        await PickupLocation.create(location);
        created++;
      }
    }

    console.log("\nPickup locations seed complete:".green.bold);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total:   ${pickupLocations.length}`);

    await mongoose.connection.close();
    console.log("Database connection closed.".gray);
    process.exit(0);
  } catch (error) {
    console.error("Pickup locations seed failed:".red, error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runSeed();
