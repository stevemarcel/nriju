import mongoose from "mongoose";

// Separate token schema — purged automatically on expiry.
// Never pollutes the User document with raw token strings.
const emailVerificationTokenSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

export default mongoose.model("EmailVerificationToken", emailVerificationTokenSchema);