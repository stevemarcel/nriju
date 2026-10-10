import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import Inventory from "../models/Inventory.js";
import Payment from "../models/Payment.js";
import { deductStockFIFO } from "../services/inventoryService.js";

// @DESCRIPTION Create a new order
// @ROUTE       POST /api/v1/orders
// @ACCESS      Authenticated
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, deliveryMethod, couponCode, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate products and compute subtotal (prices are integer kobo)
    let subtotalKobo = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Check stock via Inventory batches
      const available = await Inventory.aggregate([
        {
          $match: {
            product: product._id,
            isActive: true,
            expiryDate: { $gt: new Date() },
          },
        },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]).session(session);
      const stock = available[0]?.total ?? 0;

      if (stock < item.quantity) {
        throw new Error(`${product.name} is out of stock`);
      }

      subtotalKobo += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0] || "",
      });
    }

    // Apply coupon if provided
    let discountKobo = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true }).session(
        session,
      );
      if (!coupon) {
        throw new Error("Invalid coupon code");
      }
      if (coupon.expiryDate < new Date()) {
        throw new Error("Coupon has expired");
      }
      if (subtotalKobo < coupon.minOrder) {
        throw new Error(
          `Minimum order for this coupon is ₦${(coupon.minOrder / 100).toLocaleString()}`,
        );
      }
      discountKobo = coupon.discountKoboFor(subtotalKobo);
    }

    // Delivery fee (kobo) — 0 for pickup
    const deliveryFeeKobo = deliveryMethod === "pickup" ? 0 : 150000; // ₦1,500 default

    const totalKobo = subtotalKobo - discountKobo + deliveryFeeKobo;

    // Create the order
    const order = await Order.create(
      [
        {
          user: req.user._id,
          items: orderItems,
          shippingAddress,
          deliveryMethod,
          deliveryFee: deliveryFeeKobo,
          subtotal: subtotalKobo,
          discount: discountKobo,
          coupon: coupon?._id,
          total: totalKobo,
          paymentMethod,
          status: "pending",
        },
      ],
      { session },
    );

    // Deduct stock FIFO
    for (const item of items) {
      await deductStockFIFO(item.productId, item.quantity, session);
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Order created",
      data: order[0],
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// @DESCRIPTION Get user's order history
// @ROUTE       GET /api/v1/orders
// @ACCESS      Authenticated
const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .sort("-createdAt")
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("items.product", "name images")
    .populate("coupon", "code");

  const total = await Order.countDocuments(query);

  res.json({
    success: true,
    data: orders,
    meta: { page: Number(page), limit: Number(limit), total },
  });
});

// @DESCRIPTION Get a single order by ID
// @ROUTE       GET /api/v1/orders/:id
// @ACCESS      Authenticated (owner or admin)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product", "name images")
    .populate("coupon", "code")
    .populate("user", "name email");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only owner or admin can view
  if (!order.user._id.equals(req.user._id) && req.user.role === "customer") {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json({ success: true, data: order });
});

// @DESCRIPTION Update order status (admin)
// @ROUTE       PATCH /api/v1/orders/:id/status
// @ACCESS      Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingCode } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;
  if (trackingCode) order.trackingCode = trackingCode;
  await order.save();

  res.json({ success: true, data: order });
});

export { createOrder, getMyOrders, getOrderById, updateOrderStatus };
