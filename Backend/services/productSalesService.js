import Product from "../models/Product.js";

const COMPLETED_ORDER_STATUSES = new Set(["delivered", "picked_up"]);

const getItemQuantities = (items = []) => {
  const quantities = new Map();

  for (const item of items) {
    const productId = String(item.product?._id || item.product || "");
    const quantity = Number(item.quantity);
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1) continue;
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  return quantities;
};

const applySalesDelta = async (items, direction, session) => {
  const quantities = getItemQuantities(items);
  if (!quantities.size) return;

  const operations = [...quantities.entries()].map(([productId, quantity]) => {
    const delta = quantity * direction;

    return {
      updateOne: {
        filter: { _id: productId },
        update:
          delta > 0
            ? { $inc: { salesCount: delta } }
            : [
                {
                  $set: {
                    salesCount: {
                      $max: [0, { $add: [{ $ifNull: ["$salesCount", 0] }, delta] }],
                    },
                  },
                },
              ],
      },
    };
  });

  await Product.bulkWrite(operations, { session });
};

/**
 * Keep Product.salesCount aligned with fulfilled order quantities.
 * Order timestamps are the idempotency guard for repeated status requests.
 */
const syncOrderProductSales = async (order, nextStatus, session) => {
  if (COMPLETED_ORDER_STATUSES.has(nextStatus) && !order.salesCountedAt) {
    await applySalesDelta(order.items, 1, session);
    order.salesCountedAt = new Date();
    return "counted";
  }

  if (nextStatus === "refunded" && order.salesCountedAt && !order.salesCountReversedAt) {
    await applySalesDelta(order.items, -1, session);
    order.salesCountReversedAt = new Date();
    return "reversed";
  }

  return null;
};

export { COMPLETED_ORDER_STATUSES, getItemQuantities, syncOrderProductSales };
