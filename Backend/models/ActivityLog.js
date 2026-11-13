import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // Administrator who performed the action.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    // Snapshot the actor's role at event time. This is distinct from
    // targetUserRole, which describes the affected account.
    actorRole: {
      type: String,
      enum: ["customer", "admin", "superAdmin"],
    },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    entityName: { type: String },
    description: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    targetUser: { type: String },
    targetUserRole: {
      type: String,
      enum: ["customer", "admin", "superAdmin"],
    },
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

// Automatically remove activity records after one year.
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
activityLogSchema.index({ entity: 1, entityId: 1 });

export default mongoose.model("ActivityLog", activityLogSchema);
