import Notification from "../models/Notification.js";
import EmailOutbox from "../models/EmailOutbox.js";
import User from "../models/User.js";
import { orderStatusEmail } from "./emailService.js";

const ORDER_STATUS_CONTENT = {
  confirmed: {
    title: "Order confirmed",
    message: (order) =>
      `Payment confirmed for order ${order.orderNumber}. We will start preparing it soon.`,
    email: true,
  },
  preparing: {
    title: "Your order is being prepared",
    message: (order) => `Order ${order.orderNumber} is now being prepared.`,
    email: false,
  },
  ready_for_pickup: {
    title: "Your order is ready for pickup",
    message: (order) => `Order ${order.orderNumber} is ready for pickup.`,
    email: true,
  },
  on_the_way: {
    title: "Your order is on the way",
    message: (order) => `Order ${order.orderNumber} is on the way to you.`,
    email: true,
  },
  delivered: {
    title: "Order delivered",
    message: (order) => `Order ${order.orderNumber} has been delivered.`,
    email: true,
  },
  picked_up: {
    title: "Order picked up",
    message: (order) => `Order ${order.orderNumber} has been picked up.`,
    email: true,
  },
  cancelled: {
    title: "Order cancelled",
    message: (order) => `Order ${order.orderNumber} has been cancelled.`,
    email: true,
  },
  refunded: {
    title: "Order refunded",
    message: (order) => `Order ${order.orderNumber} has been refunded.`,
    email: true,
  },
};

const normalizeLink = (link = "") => {
  const value = String(link).trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : "";
};

const createUserNotification = async (
  {
    user,
    type = "system",
    eventKey,
    title,
    message,
    link = "",
    entityType = "",
    entityId = null,
    data = {},
    email = null,
    refresh = false,
  },
  { session } = {},
) => {
  const now = new Date();
  const normalizedLink = normalizeLink(link);

  if (!eventKey) {
    const [notification] = await Notification.create(
      [
        {
          user,
          type,
          title,
          message,
          link: normalizedLink,
          entityType,
          entityId,
          data,
          lastTriggeredAt: now,
        },
      ],
      { session },
    );
    return notification;
  }

  const insertedValues = {
    user,
    type,
    eventKey,
    title,
    message,
    link: normalizedLink,
    entityType,
    entityId,
    data,
    read: false,
    readAt: null,
    lastTriggeredAt: now,
  };

  const update = refresh
    ? {
        $set: {
          type,
          title,
          message,
          link: normalizedLink,
          entityType,
          entityId,
          data,
          read: false,
          readAt: null,
          lastTriggeredAt: now,
        },
        $setOnInsert: { user, eventKey },
      }
    : { $setOnInsert: insertedValues };

  const notification = await Notification.findOneAndUpdate({ user, eventKey }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    session,
  });

  if (email) {
    await EmailOutbox.findOneAndUpdate(
      { eventKey: `email:${eventKey}` },
      {
        $setOnInsert: {
          eventKey: `email:${eventKey}`,
          user,
          ...email,
          status: "pending",
          nextAttemptAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, session },
    );
  }

  return notification;
};

const createOrderReceivedNotification = async (order, { session } = {}) => {
  if (!order.user) return null;
  const user = await User.findById(order.user)
    .select("name email")
    .session(session || null);
  if (!user) return null;

  const link = `/account/orders?order=${order._id}`;
  const email = orderStatusEmail({ order, name: user.name, status: "received", link });

  return createUserNotification(
    {
      user: user._id,
      type: "order",
      eventKey: `order:${order._id}:received`,
      title: "Order received",
      message: `We received order ${order.orderNumber}. We will confirm it shortly.`,
      link,
      entityType: "order",
      entityId: order._id,
      data: { orderId: order._id, orderNumber: order.orderNumber, status: order.status },
      email: { to: user.email, toName: user.name, ...email },
    },
    { session },
  );
};

const createOrderStatusNotification = async (
  order,
  status,
  { session, reviewItems = [], includeReviewInvitation = false } = {},
) => {
  const content = ORDER_STATUS_CONTENT[status];
  if (!content || !order.user) return null;

  const user = await User.findById(order.user)
    .select("name email")
    .session(session || null);
  if (!user) return null;

  const reviewCount = reviewItems.length;
  const link = includeReviewInvitation
    ? `/account/orders?order=${order._id}&action=review`
    : `/account/orders?order=${order._id}`;
  const message =
    includeReviewInvitation && reviewCount
      ? `${content.message(order)} Tell us what you thought of ${reviewCount === 1 ? "your product" : `the ${reviewCount} products in this order`}.`
      : content.message(order);
  const email = content.email
    ? orderStatusEmail({
        order,
        name: user.name,
        status,
        link,
        reviewItems: includeReviewInvitation ? reviewItems : [],
      })
    : null;

  return createUserNotification(
    {
      user: user._id,
      type: status === "confirmed" ? "payment" : "order",
      eventKey: `order:${order._id}:status:${status}`,
      title:
        includeReviewInvitation && reviewCount
          ? `${content.title}. How was everything?`
          : content.title,
      message,
      link,
      entityType: "order",
      entityId: order._id,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        reviewProductIds: reviewItems.map((item) => item.product),
      },
      ...(email ? { email: { to: user.email, toName: user.name, ...email } } : {}),
    },
    { session },
  );
};

export { createOrderReceivedNotification, createOrderStatusNotification, createUserNotification };
