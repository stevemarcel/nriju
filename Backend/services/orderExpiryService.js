import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { restoreStockAllocations } from "./inventoryService.js";
import { createOrderStatusNotification } from "./notificationService.js";

const expireOrder = async (orderId) => {
  const session = await mongoose.startSession();
  let expiredOrder = null;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        status: "pending",
        paymentStatus: "pending",
        paymentExpiresAt: { $lte: new Date() },
        stockRestoredAt: null,
      }).session(session);
      if (!order) return;

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) continue;
        await restoreStockAllocations(item.product, item.stockAllocations || [], session, {
          quantity: item.quantity,
          reason: `Stock released after payment expired for order ${order.orderNumber}`,
          referenceId: order._id,
          referenceLabel: order.orderNumber,
          fallbackUnitCost:
            Number.isSafeInteger(product.costPrice) && product.costPrice >= 0
              ? product.costPrice
              : null,
        });
      }

      order.status = "cancelled";
      order.paymentStatus = "failed";
      order.stockRestoredAt = new Date();
      await order.save({ session });
      await createOrderStatusNotification(order, "cancelled", { session });
      expiredOrder = order;
    });
  } finally {
    await session.endSession();
  }
  return expiredOrder;
};

const expirePendingPaymentOrders = async ({ limit = 50 } = {}) => {
  const expired = await Order.find({
    status: "pending",
    paymentStatus: "pending",
    paymentExpiresAt: { $lte: new Date() },
    stockRestoredAt: null,
  })
    .select("_id")
    .limit(limit)
    .lean();

  for (const order of expired) {
    await expireOrder(order._id);
  }
  return expired.length;
};

export { expirePendingPaymentOrders };
