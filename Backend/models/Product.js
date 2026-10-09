import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

// All price fields are INTEGER KOBO to avoid float rounding in discount/
// subtotal math. Seed input and the admin form are authored in naira and
// converted with toKobo() before save; display converts with toNaira().
// (Naira values only ever return to the client at render time in the UI,
//  so the API stays integer-kobo all the way through.)
const integerKobo = (required) => ({
  type: Number,
  min: [0, "Price cannot be negative"],
  ...(required ? { required: [required, "Price is required"] } : {}),
  validate: {
    validator: (v) => v == null || Number.isInteger(v),
    message:
      "Prices must be stored as integer kobo. Convert naira with toKobo() before saving.",
  },
});

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

    // ── money: integer kobo ──────────────────────────────────
    price: integerKobo(true),
    compareAtPrice: { ...integerKobo(false), default: null },

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

    // Denormalized available quantity = sum of active, unexpired Inventory
    // batches. Kept in sync through services/inventoryService.recomputeStock()
    // (call it after any batch add/edit/void). Queryable + sortable, which a
    // populate-only virtual is not — that's what the "in stock" filter needs.
    // Authoritative on-the-ground counts (with expiry precision) still live on
    // Inventory; this is the fast read the storefront uses.
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
      index: true,
    },

    // ── cooked-item production fields ──────────────────────────
    prepLeadTime: { type: Number, default: 0 },
    maxDailyQty: { type: Number, default: 0 },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    region: {
      type: String,
      enum: ["Western", "Eastern", "South-South", "Northern", "Cross-regional"],
      default: "Cross-regional",
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

// Auto-generate slug from name on create (auto + admin override). Runs on
// save/create, NOT on insertMany — seeding must use create() so this fires.
productSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(this.name);
  }
  next();
});

productSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.model("Product", productSchema);

export { integerKobo };
