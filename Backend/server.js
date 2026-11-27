import "dotenv/config";

import path from "path";
import express from "express";
import expressSession from "express-session";
import colors from "colors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import "./config/passport.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import activityLog from "./middleware/activityLog.js";
import { expirePendingPaymentOrders } from "./services/orderExpiryService.js";
import { startNotificationWorkers } from "./services/notificationWorker.js";
import Notification from "./models/Notification.js";
import EmailOutbox from "./models/EmailOutbox.js";
import ActivityLog from "./models/ActivityLog.js";

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
import newsletterRoutes from "./routes/newsletterRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import pickupLocationRoutes from "./routes/pickupLocationRoutes.js";
import courierRoutes from "./routes/courierRoutes.js";

const port = process.env.PORT || 5000;

const app = express();

app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(activityLog);

// Session support is required by Passport for the OAuth handshake.
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET || "nriju-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// Passport for Google OAuth
app.use(passport.initialize());
app.use(passport.session());

// API rate limiting. Auth endpoints are limited per-route inside
// authRoutes.js (login/register/forgot-password only) — NOT at the
// router level, otherwise GET /auth/me (called on every app mount to
// rehydrate the session) would trip the limit and lock out users.
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
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/checkout", checkoutRoutes);
app.use("/api/v1/pickup-locations", pickupLocationRoutes);
app.use("/api/v1/courier", courierRoutes);

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

const startServer = async () => {
  await connectDB();
  // Create the notification collections and their idempotency indexes before
  // order transactions attempt to write to them for the first time.
  await Promise.all([Notification.init(), EmailOutbox.init(), ActivityLog.init()]);

  app.listen(port, () => {
    console.log(`Nriju server started on port ${port}`.yellow.bold);
    startNotificationWorkers();

    const releaseExpiredOrders = () =>
      expirePendingPaymentOrders().catch((error) =>
        console.error("Could not release expired payment orders:", error.message),
      );
    setTimeout(releaseExpiredOrders, 10_000);
    setInterval(releaseExpiredOrders, 5 * 60 * 1000).unref();
  });
};

startServer().catch((error) => {
  console.error("Could not start Nriju:", error.message);
  process.exit(1);
});
