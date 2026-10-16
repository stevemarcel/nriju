import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // kobo
    image: { type: String, default: "" },
    unit: { type: String, default: "" },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    quantity: { type: Number, default: 1, min: 1 },
    maxAvailable: { type: Number, default: 0 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

cartSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Cart", cartSchema);
