import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paystackRef: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["paystack", "offline"],
      default: "paystack",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Payment amount must be integer kobo.",
      },
    }, // integer kobo — Paystack expects this natively, passes through unchanged
    channel: {
      type: String,
      enum: [
        "card",
        "bank",
        "bank_transfer",
        "ussd",
        "qr",
        "apple_pay",
        "mobile_money",
        "payattitude",
        "cash",
        "pos",
        "transfer",
      ],
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "abandoned", "collected", "reconciled", "refunded"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
    collectedAmount: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: "Collected amount must be integer kobo.",
      },
    },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    collectedAt: { type: Date },
    collectionReference: { type: String, default: "", trim: true },
    reconciliationStatus: {
      type: String,
      enum: ["not_required", "pending", "reconciled"],
      default: "not_required",
      index: true,
    },
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reconciledAt: { type: Date },
    customerEmail: { type: String, lowercase: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", paymentSchema);
