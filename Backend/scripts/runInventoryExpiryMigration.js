import "dotenv/config";
import mongoose from "mongoose";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  inspectInventoryExpiryMigration,
  migrateInventoryWithoutExpiry,
} from "./migrateInventoryWithoutExpiry.js";

const TARGET_DATABASE = "nriju-DB";
const EXPECTED_ATLAS_HOST = "r33jylh.mongodb.net";
const APPLY_FLAG = process.argv.includes("--apply");
const CONFIRMATION_TEXT = `APPLY MIGRATION TO ${TARGET_DATABASE}`;

const printReport = (heading, report) => {
  console.log(`\n${heading}`);
  console.log("-".repeat(heading.length));
  console.log(JSON.stringify(report, null, 2));
};

const main = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || typeof uri !== "string") {
    throw new Error(
      "MONGO_URI is missing. Run this script from the project root where your existing .env is loaded.",
    );
  }

  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGO_URI must be a MongoDB connection string.");
  }

  if (!uri.includes(EXPECTED_ATLAS_HOST)) {
    throw new Error(
      `The connection string does not contain the expected Atlas host (${EXPECTED_ATLAS_HOST}). Migration stopped.`,
    );
  }

  console.log(`Connecting to the Atlas cluster for ${TARGET_DATABASE}...`);

  // dbName explicitly overrides any database name in MONGO_URI. autoIndex is
  // disabled so merely running this maintenance script does not build model
  // indexes as a side effect.
  await mongoose.connect(uri, {
    dbName: TARGET_DATABASE,
    autoIndex: false,
    serverSelectionTimeoutMS: 20000,
  });

  const connectedDatabase = mongoose.connection.db?.databaseName;
  const connectedHost = mongoose.connection.host;

  if (connectedDatabase !== TARGET_DATABASE) {
    throw new Error(
      `Safety check failed: connected to ${connectedDatabase || "unknown database"}, expected ${TARGET_DATABASE}.`,
    );
  }

  if (!connectedHost?.includes(EXPECTED_ATLAS_HOST)) {
    throw new Error(
      `Safety check failed: connected host ${connectedHost || "unknown"} is not the expected Atlas cluster.`,
    );
  }

  console.log(`Connected host: ${connectedHost}`);
  console.log(`Connected database: ${connectedDatabase}`);

  const preview = await inspectInventoryExpiryMigration();
  printReport("NO-EXPIRY MIGRATION PREFLIGHT (READ-ONLY)", preview);

  if (!APPLY_FLAG) {
    console.log("\nDRY RUN ONLY. No database changes were made.");
    console.log(
      `To apply after reviewing this report, run: node Backend/scripts/runInventoryExpiryMigration.js --apply`,
    );
    return;
  }

  const readline = createInterface({ input, output });
  let confirmation;
  try {
    confirmation = await readline.question(
      `\nType exactly \"${CONFIRMATION_TEXT}\" to apply these changes: `,
    );
  } finally {
    readline.close();
  }

  if (confirmation !== CONFIRMATION_TEXT) {
    console.log("\nMigration cancelled. No database changes were made.");
    return;
  }

  console.log(`\nApplying inventory expiry removal to ${TARGET_DATABASE}...`);
  const result = await migrateInventoryWithoutExpiry({ dryRun: false });
  printReport("MIGRATION COMPLETED AND VERIFIED", result);
};

try {
  await main();
} catch (error) {
  console.error("\nInventory migration runner failed:");
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
