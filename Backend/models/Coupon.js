import mongoose from "mongoose";

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
    }, // percent = %, flat = naira
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 }, // cap for percent type
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, default: null, min: 1 }, // null = unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }], // empty = all
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("Coupon", couponSchema);