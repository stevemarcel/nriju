import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, required: [true, "Description is required"], default: "" },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      index: true,
    },
    compareAtPrice: { type: Number, default: null, min: 0 },
    unit: {
      type: String,
      enum: ["portion", "bowl", "500ml", "litre", "pack", "bottle", "tub", "piece", "per kg", "1 Litre", "500ml bottle", "250g", "500g"],
      default: "portion",
      index: true,
    },
    productType: {
      type: String,
      enum: ["cooked", "packaged", "fresh"],
      default: "packaged",
      index: true,
    },
    prepLeadTime: { type: Number, default: 0 }, // hours — cooked items
    maxDailyQty: { type: Number, default: 0 }, // cooked: daily production cap
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    images: [{ type: String }],
    tags: [{ type: String, index: true }],
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    notifyOnOutOfStock: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0, index: true },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-generate slug from name on create (auto + admin override pattern)
productSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(this.name);
  }
  next();
});

// Text index for search
productSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.model("Product", productSchema);