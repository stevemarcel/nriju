import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["order", "payment", "review", "security", "system", "update", "alert", "promo"],
      default: "system",
      index: true,
    },
    eventKey: { type: String, trim: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    entityType: { type: String, default: "" },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    lastTriggeredAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, lastTriggeredAt: -1 });
notificationSchema.index({ user: 1, read: 1, lastTriggeredAt: -1 });
notificationSchema.index(
  { user: 1, eventKey: 1 },
  {
    unique: true,
    partialFilterExpression: { eventKey: { $type: "string" } },
  },
);

export default mongoose.model("Notification", notificationSchema);
