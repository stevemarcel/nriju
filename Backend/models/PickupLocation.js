import mongoose from "mongoose";

const pickupLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    landmark: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    openingHours: { type: String, default: "", trim: true },
    instructions: { type: String, default: "", trim: true },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

pickupLocationSchema.index({ isActive: 1, sortOrder: 1, name: 1 });

export default mongoose.model("PickupLocation", pickupLocationSchema);
