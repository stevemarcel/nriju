import mongoose from "mongoose";
import { addressSchema } from "./User.js";

// Embedded order item — snapshot preserves price/name/image at purchase time
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: "" },
  },
  { _id: true },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    guestEmail: { type: String, lowercase: true, trim: true },
    guestName: { type: String, trim: true },
    items: [orderItemSchema],
    shippingAddress: { type: addressSchema, required: true },
    deliveryMethod: {
      type: String,
      enum: ["own", "thirdparty", "pickup"],
      required: true,
    },
    deliveryFee: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "on_the_way",
        "delivered",
        "picked_up",
        "cancelled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["paystack", "card", "cash"],
      default: "paystack",
    },
    paymentRef: { type: String, index: true },
    trackingCode: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// Generate order number if not provided
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const count = await mongoose.model("Order").countDocuments({
      createdAt: { $gte: new Date(year, month - 1, 1) },
    });
    this.orderNumber = `NRJ-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.model("Order", orderSchema);
export { orderItemSchema };