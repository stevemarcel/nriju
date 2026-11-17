import { MongoClient } from "mongodb";
import { writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Assuming your .env file is in the nriju project root
dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI was not loaded. Check your .env file.");
}

const client = new MongoClient(process.env.MONGO_URI);

const pipeline = [
  {
    $lookup: {
      from: "inventories",
      let: { productId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ["$product", "$$productId"] }, { $eq: ["$isActive", true] }],
            },
          },
        },
        {
          $group: {
            _id: null,
            batchStock: { $sum: "$quantity" },
            batchCount: { $sum: 1 },
          },
        },
      ],
      as: "inventorySummary",
    },
  },
  {
    $addFields: {
      inventorySummary: {
        $ifNull: [{ $arrayElemAt: ["$inventorySummary", 0] }, { batchStock: 0, batchCount: 0 }],
      },
    },
  },
  {
    $addFields: {
      stockDifference: {
        $subtract: ["$inventorySummary.batchStock", { $ifNull: ["$stock", 0] }],
      },
    },
  },
  {
    $project: {
      _id: 0,
      productId: "$_id",
      name: 1,
      isActive: 1,
      productStock: { $ifNull: ["$stock", 0] },
      inventoryBatchStock: "$inventorySummary.batchStock",
      activeBatchCount: "$inventorySummary.batchCount",
      stockDifference: 1,
    },
  },
  {
    $sort: { stockDifference: -1, name: 1 },
  },
];

async function exportResults() {
  try {
    await client.connect();

    // Your database and collection
    const db = client.db("test");
    const collection = db.collection("products");

    // Execute aggregation
    const results = await collection.aggregate(pipeline).toArray();

    // Save results as JSON
    await writeFile(
      resolve(__dirname, "products-results.json"),
      JSON.stringify(results, null, 2),
      "utf8",
    );

    console.log(`Successfully exported ${results.length} documents.`);
  } catch (error) {
    console.error("Export failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

await exportResults();
