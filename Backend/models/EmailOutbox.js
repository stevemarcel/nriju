import mongoose from "mongoose";

const emailOutboxSchema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, unique: true, index: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    to: { type: String, required: true, lowercase: true, trim: true },
    toName: { type: String, default: "", trim: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    claimedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true },
);

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

export default mongoose.model("EmailOutbox", emailOutboxSchema);
