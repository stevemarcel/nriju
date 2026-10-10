import asyncHandler from "express-async-handler";
import Notification from "../models/Notification.js";

// @DESCRIPTION List current user's notifications
// @ROUTE       GET /api/v1/notifications
// @ACCESS      Authenticated
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const query = { user: req.user._id };
  if (unreadOnly === "true") query.read = false;

  const notifications = await Notification.find(query)
    .sort("-createdAt")
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await Notification.countDocuments(query);
  const unread = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });

  res.json({
    success: true,
    data: notifications,
    meta: { page: Number(page), limit: Number(limit), total, unread },
  });
});

// @DESCRIPTION Mark a notification as read
// @ROUTE       PATCH /api/v1/notifications/:id/read
// @ACCESS      Authenticated
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  if (!notification.user.equals(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized");
  }

  notification.read = true;
  await notification.save();

  res.json({ success: true, data: notification });
});

// @DESCRIPTION Mark all notifications as read
// @ROUTE       PATCH /api/v1/notifications/read-all
// @ACCESS      Authenticated
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });

  res.json({ success: true, message: "All notifications marked as read" });
});

// @DESCRIPTION Create a notification (internal use, e.g. order updates)
// @ROUTE       POST /api/v1/notifications
// @ACCESS      Authenticated (admin or internal)
const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, message, link } = req.body;

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
  });

  res.status(201).json({ success: true, data: notification });
});

export { getNotifications, markRead, markAllRead, createNotification };
