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
      required: true,
      unique: true,
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
      enum: ["card", "bank", "ussd", "qr"],
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "abandoned"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
    customerEmail: { type: String, lowercase: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", paymentSchema);
