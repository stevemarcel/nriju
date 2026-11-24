import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import Setting from "../models/Setting.js";
import {
  computeAvailableStock,
  deductStockFIFO,
  restoreStockAllocations,
} from "../services/inventoryService.js";
import { syncOrderProductSales } from "../services/productSalesService.js";
import { recordActivity } from "../utils/activityUtils.js";
import {
  calculateDeliveryFeeKobo,
  configuredDeliveryFee,
  DEFAULT_DELIVERY_FEE_STEP_KOBO,
  DEFAULT_DELIVERY_FEES_KOBO,
} from "../utils/delivery.js";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "on_the_way",
  "delivered",
  "picked_up",
  "cancelled",
  "refunded",
];
const DELIVERY_METHODS = ["own", "thirdparty", "pickup"];
const PAYMENT_METHODS = ["paystack", "card", "cash"];

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  throw error;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req, defaultLimit = 10) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? defaultLimit);
  if (!Number.isInteger(page) || page < 1) fail("Page must be a positive integer.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    fail("Limit must be an integer between 1 and 100.");
  }
  return { page, limit, skip: (page - 1) * limit };
};

const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    fail("Cart is empty.");
  }

  const merged = new Map();
  for (const item of items) {
    const productId = String(item?.productId || item?.product || "");
    if (!mongoose.isValidObjectId(productId)) fail("An order item has an invalid product.");

    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      fail("Order item quantities must be positive whole numbers.");
    }

    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

const calculateCostOfGoodsSold = (allocations) => {
  if (!allocations.length || allocations.some((allocation) => allocation.unitCost == null)) {
    return null;
  }
  return allocations.reduce(
    (total, allocation) => total + allocation.quantity * allocation.unitCost,
    0,
  );
};

const deliveryFeeFor = async (deliveryMethod, subtotalKobo, session) => {
  if (deliveryMethod === "pickup") return 0;

  const settingKey = deliveryMethod === "own" ? "delivery_fee_own" : "delivery_fee_thirdparty";
  const settings = await Setting.find({
    key: { $in: [settingKey, "delivery_fee_increment_per_5000"] },
  })
    .select("key value")
    .session(session)
    .lean();
  const settingsByKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  const baseFeeKobo = configuredDeliveryFee(
    settingsByKey[settingKey],
    DEFAULT_DELIVERY_FEES_KOBO[deliveryMethod],
  );
  const feeStepKobo = configuredDeliveryFee(
    settingsByKey.delivery_fee_increment_per_5000,
    DEFAULT_DELIVERY_FEE_STEP_KOBO,
  );

  return calculateDeliveryFeeKobo({
    subtotalKobo,
    baseFeeKobo,
    feeStepKobo,
    deliveryMethod,
  });
};

const populateOrder = (query) =>
  query
    .populate("items.product", "name images")
    .populate("coupon", "code")
    .populate("user", "name email avatar phone");

// @DESCRIPTION Create a new authenticated order and reserve its stock FIFO.
// @ROUTE       POST /api/v1/orders
// @ACCESS      Authenticated
const createOrder = asyncHandler(async (req, res) => {
  const normalizedItems = normalizeItems(req.body.items);
  const { shippingAddress, deliveryMethod, couponCode, paymentMethod = "paystack" } = req.body;

  if (!shippingAddress || typeof shippingAddress !== "object") {
    fail("A shipping address is required.");
  }
  if (!DELIVERY_METHODS.includes(deliveryMethod)) {
    fail("Invalid delivery method.");
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    fail("Invalid payment method.");
  }

  const result = await runInTransaction(async (session) => {
    const productIds = normalizedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    let subtotalKobo = 0;
    const orderItems = [];

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        fail("One or more products are unavailable.", 404);
      }

      const available = await computeAvailableStock(product._id, session);
      if (available < item.quantity) {
        fail(`${product.name} has only ${available} available.`, 409);
      }

      subtotalKobo += product.price * item.quantity;
      if (!Number.isSafeInteger(subtotalKobo)) fail("Order total is too large.");

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images?.[0] || "",
        stockAllocations: [],
        costOfGoodsSold: null,
      });
    }

    let discountKobo = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: String(couponCode).trim().toUpperCase(),
        isActive: true,
      }).session(session);

      if (!coupon) fail("Invalid coupon code.");
      if (coupon.expiryDate && coupon.expiryDate < new Date()) {
        fail("Coupon has expired.");
      }
      if (subtotalKobo < coupon.minOrder) {
        fail(
          `Minimum order for this coupon is ₦${(coupon.minOrder / 100).toLocaleString("en-NG")}.`,
        );
      }
      discountKobo = coupon.discountKoboFor(subtotalKobo);
      discountKobo = Math.max(0, Math.min(subtotalKobo, Number(discountKobo) || 0));
    }

    const deliveryFeeKobo = await deliveryFeeFor(deliveryMethod, subtotalKobo, session);
    const totalKobo = subtotalKobo - discountKobo + deliveryFeeKobo;

    const [order] = await Order.create(
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

    // Deduct stock from oldest received batches and persist the exact allocation
    // on each order item for cancellation restoration and historical COGS.
    for (const orderItem of order.items) {
      const deduction = await deductStockFIFO(orderItem.product, orderItem.quantity, session, {
        type: "sale",
        referenceType: "order",
        referenceId: order._id,
        referenceLabel: order.orderNumber,
        reason: `Stock reserved for order ${order.orderNumber}`,
        performedBy: req.user._id,
      });

      orderItem.stockAllocations = deduction.allocations.map((allocation) => ({
        batch: allocation.batch,
        quantity: allocation.quantity,
        unitCost: allocation.unitCost,
      }));
      orderItem.costOfGoodsSold = calculateCostOfGoodsSold(deduction.allocations);
    }

    await order.save({ session });

    return order;
  });

  recordActivity(req, {
    action: "order.created",
    entity: "order",
    entityId: result._id,
    entityName: `Order #${result.orderNumber}`,
    actionType: "create",
    changes: [{ field: "Order total", from: "—", to: result.total }],
    description: `placed order #${result.orderNumber} for ₦${(result.total / 100).toLocaleString("en-NG")}`,
  });

  res.status(201).json({
    success: true,
    message: "Order created.",
    data: result,
  });
});

// @DESCRIPTION Get the authenticated user's order history.
// @ROUTE       GET /api/v1/orders
// @ACCESS      Authenticated
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, 10);
  const query = { user: req.user._id };

  if (req.query.status) {
    if (!ORDER_STATUSES.includes(req.query.status)) fail("Invalid order status.");
    query.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    populateOrder(Order.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)),
    Order.countDocuments(query),
  ]);

  res.json({ success: true, data: orders, meta: { page, limit, total } });
});

// @DESCRIPTION Get one order for its owner or an administrator.
// @ROUTE       GET /api/v1/orders/:id
// @ACCESS      Authenticated (owner or admin)
const getOrderById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) fail("Invalid order ID.");

  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) fail("Order not found.", 404);

  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  const isOwner = order.user && String(order.user._id) === String(req.user._id);
  if (!isAdmin && !isOwner) fail("Not authorized to view this order.", 403);

  res.json({ success: true, data: order });
});

// @DESCRIPTION Update order status/tracking and restore reserved stock on cancellation.
// @ROUTE       PATCH /api/v1/orders/:id/status
// @ACCESS      Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) fail("Invalid order ID.");

  const { status, trackingCode } = req.body;
  if (status !== undefined && !ORDER_STATUSES.includes(status)) {
    fail("Invalid order status.");
  }
  if (trackingCode !== undefined && typeof trackingCode !== "string") {
    fail("Tracking code must be a string.");
  }

  const result = await runInTransaction(async (session) => {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) fail("Order not found.", 404);

    const previousStatus = order.status;
    const nextStatus = status ?? previousStatus;

    if (previousStatus === "refunded" && nextStatus !== "refunded") {
      fail("A refunded order cannot be moved back to another fulfilment status.", 409);
    }
    if (previousStatus === "cancelled" && !["cancelled", "refunded"].includes(nextStatus)) {
      fail(
        "A cancelled order cannot be reopened. Create a new order if the customer still wants the items.",
        409,
      );
    }
    if (nextStatus === "cancelled" && ["delivered", "picked_up"].includes(previousStatus)) {
      fail(
        "Delivered or picked-up orders must be handled through the customer return process, not cancellation.",
        409,
      );
    }

    const changes = [];
    if (nextStatus !== previousStatus) {
      changes.push({ field: "Status", from: previousStatus, to: nextStatus });
    }

    if (trackingCode !== undefined) {
      const normalizedTrackingCode = trackingCode.trim();
      if (normalizedTrackingCode !== order.trackingCode) {
        changes.push({
          field: "Tracking code",
          from: order.trackingCode || "—",
          to: normalizedTrackingCode || "—",
        });
        order.trackingCode = normalizedTrackingCode;
      }
    }

    if (nextStatus === "cancelled" && !order.stockRestoredAt) {
      for (const item of order.items) {
        const productId = item.product?._id || item.product;
        const product = await Product.findById(productId).session(session);
        if (!product) {
          fail(
            `Cannot restore stock: product for order item "${item.name}" no longer exists.`,
            409,
          );
        }

        await restoreStockAllocations(productId, item.stockAllocations || [], session, {
          quantity: item.quantity,
          reason: `Stock released after cancellation of order ${order.orderNumber}`,
          performedBy: req.user._id,
          referenceId: order._id,
          referenceLabel: order.orderNumber,
          fallbackUnitCost:
            Number.isSafeInteger(product.costPrice) && product.costPrice >= 0
              ? product.costPrice
              : null,
        });
      }

      order.stockRestoredAt = new Date();
      changes.push({
        field: "Inventory reservation",
        from: "Reserved",
        to: "Released",
      });
    }

    const salesUpdate = await syncOrderProductSales(order, nextStatus, session);
    if (salesUpdate === "counted") {
      changes.push({
        field: "Product sales",
        from: "Not counted",
        to: "Counted",
      });
    } else if (salesUpdate === "reversed") {
      changes.push({ field: "Product sales", from: "Counted", to: "Reversed" });
    }

    order.status = nextStatus;
    if (changes.length) await order.save({ session });

    return { order, changes, previousStatus, nextStatus };
  });

  if (result.changes.length) {
    const orderNumber = result.order.orderNumber;
    const descriptions = result.changes.map((change) => {
      if (change.field === "Status" && change.to === "cancelled") {
        return `cancelled order #${orderNumber} and released its reserved stock`;
      }
      if (change.field === "Status") {
        return `changed order #${orderNumber} status from ${change.from} to ${change.to}`;
      }
      if (change.field === "Tracking code") {
        return `updated the tracking code for order #${orderNumber} from "${change.from}" to "${change.to}"`;
      }
      if (change.field === "Product sales") {
        return change.to === "Counted"
          ? `counted fulfilled quantities from order #${orderNumber} in product sales`
          : `reversed product sales quantities for refunded order #${orderNumber}`;
      }
      return `released inventory reserved for order #${orderNumber}`;
    });

    recordActivity(req, {
      action: result.nextStatus === "cancelled" ? "order.cancelled" : "order.updated",
      entity: "order",
      entityId: result.order._id,
      entityName: `Order #${orderNumber}`,
      actionType: result.nextStatus === "cancelled" ? "status_toggle" : "update",
      changes: result.changes,
      description: descriptions.join("; "),
    });
  }

  res.json({ success: true, data: result.order });
});

// @DESCRIPTION List all orders for admin fulfilment.
// @ROUTE       GET /api/v1/orders/all
// @ACCESS      Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, 20);
  const { status, search } = req.query;
  const query = {};

  if (status) {
    if (!ORDER_STATUSES.includes(status)) fail("Invalid order status.");
    query.status = status;
  }

  if (search !== undefined) {
    if (typeof search !== "string") fail("Search must be a string.");
    const value = search.trim();
    if (value) {
      const regex = new RegExp(escapeRegex(value), "i");
      query.$or = [
        { orderNumber: regex },
        { "shippingAddress.name": regex },
        { guestName: regex },
        { guestEmail: regex },
      ];
    }
  }

  const [orders, total] = await Promise.all([
    populateOrder(Order.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)),
    Order.countDocuments(query),
  ]);

  res.json({ success: true, data: orders, meta: { page, limit, total } });
});

export { createOrder, getMyOrders, getOrderById, updateOrderStatus, getAllOrders };
