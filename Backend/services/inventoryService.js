import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";

// Single source of truth for availability: sum ACTIVE, UNEXPIRED batches.
// This replaces the earlier `stock || 10` seed fallback, which made
// availability fiction. Call after any batch create/edit/void.
export const computeAvailableStock = async (productId, session) => {
  const [agg] = await Inventory.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
        isActive: true,
        expiryDate: { $gt: new Date() },
      },
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return agg?.total ?? 0;
};

// Recompute + persist the denormalized Product.stock mirror. Lightweight
// (one aggregate + one update). Safe to run on the read path.
export const recomputeStock = async (productId, session) => {
  const total = await computeAvailableStock(productId, session);
  await Product.findByIdAndUpdate(productId, { stock: total }, { session });
  return total;
};

// Recompute many at once (e.g. after a restock affecting several SKUs).
export const recomputeStocks = async (productIds, session) => {
  await Promise.all(productIds.map((id) => recomputeStock(id, session)));
};

// FIFO deduction — consume oldest batches first (food degrades).
// Returns the updated batch list, or throws if insufficient stock.
// Intended to run inside the order-creation transaction.
export const deductStockFIFO = async (productId, quantity, session) => {
  const batches = await Inventory.find({
    product: productId,
    isActive: true,
    expiryDate: { $gt: new Date() },
    quantity: { $gt: 0 },
  })
    .sort({ expiryDate: 1 }) // FIFO
    .session(session);

  let need = quantity;
  for (const batch of batches) {
    if (need <= 0) break;
    const take = Math.min(batch.quantity, need);
    batch.quantity -= take;
    need -= take;
    await batch.save({ session });
  }

  if (need > 0) {
    throw new Error(`Insufficient stock — short by ${need}. Product ${productId}`);
  }
  return recomputeStock(productId, session);
};
