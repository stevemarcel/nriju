import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import { createUserNotification } from "./notificationService.js";

const COMPLETED_STATUSES = ["delivered", "picked_up"];
const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

const getUnreviewedOrderItems = async (order, { session } = {}) => {
  if (!order?.user || !order?.items?.length) return [];

  const productIds = [
    ...new Set(order.items.map((item) => String(item.product?._id || item.product))),
  ];
  const reviewed = await Review.find({
    user: order.user?._id || order.user,
    product: { $in: productIds },
  })
    .select("product")
    .session(session || null)
    .lean();
  const reviewedIds = new Set(reviewed.map((review) => String(review.product)));

  return order.items
    .filter((item) => !reviewedIds.has(String(item.product?._id || item.product)))
    .map((item) => ({
      product: item.product?._id || item.product,
      name: item.name,
      image: item.image || item.product?.images?.[0] || "",
    }));
};

const scheduleReviewReminders = async (
  order,
  items,
  { session, completedAt = new Date() } = {},
) => {
  order.completedAt ||= completedAt;

  if (!items.length) {
    order.nextReviewReminderAt = null;
    order.reviewReminderStoppedAt = completedAt;
    return;
  }

  order.nextReviewReminderAt = new Date(order.completedAt.getTime() + REMINDER_INTERVAL_MS);
  order.reviewReminderStoppedAt = null;
};

const processReviewReminder = async (orderId, now = new Date()) => {
  const staleProcessingAt = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: { $in: COMPLETED_STATUSES },
      nextReviewReminderAt: { $lte: now },
      reviewReminderStoppedAt: null,
      $or: [
        { reviewReminderProcessingAt: null },
        { reviewReminderProcessingAt: { $lte: staleProcessingAt } },
      ],
    },
    { $set: { reviewReminderProcessingAt: now } },
    { new: true },
  );

  if (!order) return false;

  try {
    const items = await getUnreviewedOrderItems(order);

    if (!items.length) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: { reviewReminderStoppedAt: now },
          $unset: { nextReviewReminderAt: "", reviewReminderProcessingAt: "" },
        },
      );
      return true;
    }

    const count = items.length;
    await createUserNotification({
      user: order.user,
      type: "review",
      eventKey: `review-reminder:${order._id}`,
      title: "How was your order?",
      message: `You have ${count === 1 ? "1 product" : `${count} products`} from order ${order.orderNumber} ready to review.`,
      link: `/account/orders?order=${order._id}&action=review`,
      entityType: "order",
      entityId: order._id,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reviewProductIds: items.map((item) => item.product),
      },
      refresh: true,
    });

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          lastReviewReminderAt: now,
          nextReviewReminderAt: new Date(now.getTime() + REMINDER_INTERVAL_MS),
        },
        $unset: { reviewReminderProcessingAt: "" },
      },
    );
    return true;
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $unset: { reviewReminderProcessingAt: "" } });
    throw error;
  }
};

const processDueReviewReminders = async ({ limit = 25, now = new Date() } = {}) => {
  const dueOrders = await Order.find({
    status: { $in: COMPLETED_STATUSES },
    nextReviewReminderAt: { $lte: now },
    reviewReminderStoppedAt: null,
  })
    .select("_id")
    .sort({ nextReviewReminderAt: 1 })
    .limit(limit)
    .lean();

  for (const order of dueOrders) {
    await processReviewReminder(order._id, now);
  }

  return dueOrders.length;
};

const stopSatisfiedReviewRemindersForUser = async (userId) => {
  const orders = await Order.find({
    user: userId,
    status: { $in: COMPLETED_STATUSES },
    reviewReminderStoppedAt: null,
  });
  const now = new Date();

  for (const order of orders) {
    const items = await getUnreviewedOrderItems(order);
    if (items.length) continue;

    order.reviewReminderStoppedAt = now;
    order.nextReviewReminderAt = null;
    order.reviewReminderProcessingAt = null;
    await order.save();
    await Notification.updateOne(
      { user: userId, eventKey: `review-reminder:${order._id}`, read: false },
      { $set: { read: true, readAt: now } },
    );
  }
};

export {
  COMPLETED_STATUSES,
  REMINDER_INTERVAL_MS,
  getUnreviewedOrderItems,
  processDueReviewReminders,
  scheduleReviewReminders,
  stopSatisfiedReviewRemindersForUser,
};
