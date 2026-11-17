import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "restock",
        "sale",
        "manual_removal",
        "adjustment_in",
        "adjustment_out",
        "damage",
        "customer_return",
        "order_cancelled",
        "void",
      ],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Movement quantity must be a whole number.",
      },
    },
    unitCost: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "Movement unit cost must be integer kobo.",
      },
    },
    stockBefore: { type: Number, min: 0 },
    stockAfter: { type: Number, min: 0 },
    reason: { type: String, trim: true, default: "" },
    referenceType: {
      type: String,
      enum: ["manual", "order", "return", "system"],
      default: "manual",
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    referenceLabel: { type: String, trim: true, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inventoryMovementSchema.index({ product: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model("InventoryMovement", inventoryMovementSchema);
