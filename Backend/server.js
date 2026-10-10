import "dotenv/config";

import path from "path";
import express from "express";
import colors from "colors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import "./config/passport.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { authLimiter, apiLimiter } from "./middleware/rateLimit.js";
import activityLog from "./middleware/activityLog.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const port = process.env.PORT || 5000;

connectDB();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(activityLog);

// Passport for Google OAuth
app.use(passport.initialize());

// API rate limiting
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1", apiLimiter);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/settings", settingRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin", adminRoutes);

// Serve frontend in production — single-platform deployment
if (process.env.NODE_ENV === "production") {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "client/dist")));

  app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "client", "dist", "index.html")));
} else {
  app.get("/", (req, res) => res.send("Nriju server is ready"));
}

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Nriju server started on port ${port}`.yellow.bold));
