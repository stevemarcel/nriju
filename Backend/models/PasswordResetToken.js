import mongoose from "mongoose";

// Separate token schema — purged automatically on expiry.
// `used` prevents replay attacks after a successful reset.
const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      expireAfterSeconds: 0, // MongoDB TTL — auto-delete expired tokens
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("PasswordResetToken", passwordResetTokenSchema);
