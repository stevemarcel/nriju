import mongoose from "mongoose";
import { integerKobo } from "./Product.js";

// Discount money fields (minOrder, maxDiscount, and `value` for flat
// coupons) are INTEGER KOBO, matching Product prices. `value` for the
// percent type is a plain percentage (10 = 10%), not money.
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["percent", "flat", "freeship"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Coupon value must be an integer (percent, or kobo for flat).",
      },
    },
    minOrder: { ...integerKobo(false), default: 0 },
    maxDiscount: { ...integerKobo(false), default: null }, // cap for percent type
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, default: null, min: 1 }, // null = unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }], // empty = all
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Money semantics per type, in kobo
couponSchema.methods.discountKoboFor = function (subtotalKobo) {
  if (this.type === "flat") return this.value;
  if (this.type === "percent") {
    const cap = Math.round((subtotalKobo * this.value) / 100);
    return this.maxDiscount ? Math.min(cap, this.maxDiscount) : cap;
  }
  if (this.type === "freeship") return 0; // handled via deliveryFee, not discount
  return 0;
};

export default mongoose.model("Coupon", couponSchema);