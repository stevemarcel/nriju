import "dotenv/config";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Options removed — Mongoose 8 defaults are secure
    });
    console.log("MongoDB connected".green);
  } catch (error) {
    console.error("MongoDB connection failed:".red, error.message);
    process.exit(1);
  }
};

export default connectDB;