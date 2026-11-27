import "dotenv/config";
import mongoose from "mongoose";
import EmailOutbox from "../models/EmailOutbox.js";
import Order from "../models/Order.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME });

const [emailCounts, recentEmails, recentOrders] = await Promise.all([
  EmailOutbox.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  EmailOutbox.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select("eventKey status attempts lastError createdAt sentAt")
    .lean(),
  Order.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .select("orderNumber status paymentStatus paymentMethod createdAt")
    .lean(),
]);

console.log(JSON.stringify({ emailCounts, recentEmails, recentOrders }, null, 2));
await mongoose.disconnect();
