import mongoose from "mongoose";
import { addressSchema } from "./User.js";
import { integerKobo } from "./Product.js";

const stockAllocationSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    // Cost snapshot in integer kobo; null means the batch cost was unknown.
    unitCost: { ...integerKobo(false), default: null },
  },
  { _id: false },
);

// Embedded order item snapshots selling price and batch cost at order time.
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: integerKobo(true),
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: "" },
    stockAllocations: { type: [stockAllocationSchema], default: [] },
    // Null if one or more allocated batches had unknown acquisition cost.
    costOfGoodsSold: { ...integerKobo(false), default: null },
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
    deliveryFee: { ...integerKobo(false), default: 0 },
    subtotal: integerKobo(true),
    discount: { ...integerKobo(false), default: 0 },
    vatRateBasisPoints: { type: Number, min: 0, max: 10000, default: 750 },
    vatAmount: { ...integerKobo(false), default: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    couponRedeemedAt: { type: Date, default: null },
    total: integerKobo(true),
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
      enum: ["paystack", "pay_on_delivery", "pay_at_pickup", "card", "cash"],
      default: "paystack",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "collected", "reconciled", "refunded"],
      default: "pending",
      index: true,
    },
    paymentRef: { type: String, index: true },
    paymentExpiresAt: { type: Date, default: null, index: true },
    pickupLocation: {
      location: { type: mongoose.Schema.Types.ObjectId, ref: "PickupLocation" },
      name: { type: String, default: "" },
      code: { type: String, default: "" },
      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      openingHours: { type: String, default: "" },
    },
    assignedCourier: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    courierAssignedAt: { type: Date },
    handoffOtpVersion: { type: String, select: false },
    handoffOtpGeneratedAt: { type: Date },
    handoffOtpExpiresAt: { type: Date },
    handoffOtpVerifiedAt: { type: Date },
    handoffOtpAttemptCount: { type: Number, default: 0, min: 0 },
    collectedAmount: { ...integerKobo(false), default: null },
    collectionMethod: {
      type: String,
      enum: ["cash", "pos", "transfer", null],
      default: null,
    },
    collectionReference: { type: String, default: "" },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    collectedAt: { type: Date },
    reconciliationStatus: {
      type: String,
      enum: ["not_required", "pending", "reconciled"],
      default: "not_required",
      index: true,
    },
    trackingCode: { type: String, default: "" },
    notes: { type: String, default: "" },
    // Idempotency guard: stock can only be restored once for a cancellation.
    stockRestoredAt: { type: Date, default: null },
    // Idempotency guards for denormalized Product.salesCount updates.
    salesCountedAt: { type: Date, default: null },
    salesCountReversedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null, index: true },
    nextReviewReminderAt: { type: Date, default: null, index: true },
    lastReviewReminderAt: { type: Date, default: null },
    reviewReminderStoppedAt: { type: Date, default: null },
    reviewReminderProcessingAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Generate order number if not provided. The unique index remains the final
// guard against concurrent count-based number collisions.
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const count = await mongoose.model("Order").countDocuments({
      createdAt: { $gte: new Date(year, date.getMonth(), 1) },
    });
    this.orderNumber = `NRJ-${year}-${month}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.model("Order", orderSchema);
export { orderItemSchema, stockAllocationSchema };
