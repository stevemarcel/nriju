import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true }, // e.g., "order.placed", "product.created"
    entity: { type: String, required: true }, // e.g., "order", "product"
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    entityName: { type: String }, // Human-readable name (e.g., "Kilishi")
    description: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    targetUser: { type: String }, // Who the action affects (for user/account changes)
    targetUserRole: { type: String, enum: ["customer", "admin", "superAdmin"] },
    changes: [
      {
        field: { type: String },
        from: { type: mongoose.Schema.Types.Mixed },
        to: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    actionType: {
      type: String,
      enum: ["create", "update", "delete", "role_change", "status_toggle"],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL index — auto-delete after 1 year (31536000 seconds)
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
activityLogSchema.index({ entity: 1, entityId: 1 });

export default mongoose.model("ActivityLog", activityLogSchema);
