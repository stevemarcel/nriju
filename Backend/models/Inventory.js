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
    quantity: { type: Number, required: true }, // allow negative for adjustments/damaged
    expiryDate: { type: Date, required: true, index: true },
    receivedDate: { type: Date, default: Date.now },
    supplier: { type: String, default: "" },
    location: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },

    // Audit attribution fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // Reason/source for the batch or last modification
    source: {
      type: String,
      enum: ["restock", "order", "adjust", "damaged", "return", "void"],
      default: "restock",
    },
    reason: { type: String, default: "restock" },
  },
  { timestamps: true },
);

// Compound index for FIFO queries
inventorySchema.index({ product: 1, expiryDate: 1, isActive: 1 });

// Index for filtering by action type and recent changes
inventorySchema.index({ source: 1, createdAt: -1 });

export default mongoose.model("Inventory", inventorySchema);
