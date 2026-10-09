import mongoose from "mongoose";

// Separate inventory schema — critical for cooked food (expiry hours/days)
// Product.stock becomes a computed sum of active, unexpired batches.
const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    batch: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true, index: true },
    receivedDate: { type: Date, default: Date.now },
    supplier: { type: String, default: "" },
    location: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Compound index for FIFO queries
inventorySchema.index({ product: 1, expiryDate: 1, isActive: 1 });

export default mongoose.model("Inventory", inventorySchema);