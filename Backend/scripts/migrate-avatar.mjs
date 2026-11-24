import mongoose from "mongoose";
import dotenv from "dotenv";
import { downloadBufferFromUrl, uploadAvatarToCloudinary } from "../utils/cloudinaryUtils.js";
import User from "../models/User.js";

dotenv.config({ path: "../../.env" });

await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME });
console.log(`Connected to ${process.env.MONGO_DB_NAME}`);

const targetEmail = process.argv[2] || "stevancy4@gmail.com";
const user = await User.findOne({ email: targetEmail });
if (!user) {
  console.log("User not found:", targetEmail);
  process.exit(1);
}

console.log("Found user:", user.email);
console.log("Current avatar:", user.avatar?.substring(0, 60) + "...");
console.log("Current publicId:", user.avatarPublicId || "(none)");

if (user.avatarPublicId) {
  console.log("Already has Cloudinary publicId, skipping.");
  await mongoose.disconnect();
  process.exit(0);
}

if (!user.avatar) {
  console.log("No avatar URL set.");
  await mongoose.disconnect();
  process.exit(0);
}

try {
  console.log("Downloading avatar from URL...");
  const { buffer } = await downloadBufferFromUrl(user.avatar);
  console.log("Downloaded", buffer.length, "bytes");

  console.log("Uploading to Cloudinary...");
  const uploaded = await uploadAvatarToCloudinary(buffer);
  console.log("Uploaded publicId:", uploaded.publicId);

  // Clean up any previous Cloudinary asset if existed
  if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);

  user.avatar = uploaded.url;
  user.avatarPublicId = uploaded.publicId;
  await user.save();

  console.log("✓ Avatar migrated successfully!");
  console.log("New Cloudinary URL:", uploaded.url);
} catch (err) {
  console.error("✗ Migration failed:", err.message);
  process.exit(1);
}

await mongoose.disconnect();
