import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { createUserNotification } from "../services/notificationService.js";

const parsePagination = (req) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    const error = new Error("Page must be a positive integer.");
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    const error = new Error("Limit must be an integer between 1 and 50.");
    error.status = 400;
    throw error;
  }

  return { page, limit, skip: (page - 1) * limit };
};

const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = { user: req.user._id };
  if (req.query.unreadOnly === "true") query.read = false;

  const [notifications, total, unread] = await Promise.all([
    Notification.find(query).sort({ lastTriggeredAt: -1, _id: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({
    success: true,
    data: notifications,
    meta: { page, limit, total, unread },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unread = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  res.json({ success: true, data: { unread } });
});

const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid notification ID.");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true, readAt: new Date() } },
    { new: true },
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found.");
  }

  res.json({ success: true, data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true, readAt: new Date() } },
  );
  res.json({ success: true, message: "All notifications marked as read." });
});

const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, message, link } = req.body;
  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error("Choose a valid notification recipient.");
  }
  if (!(await User.exists({ _id: userId, isActive: true }))) {
    res.status(404);
    throw new Error("Notification recipient not found.");
  }
  if (!String(title || "").trim() || !String(message || "").trim()) {
    res.status(400);
    throw new Error("Notification title and message are required.");
  }

  const notification = await createUserNotification({
    user: userId,
    type,
    title: String(title).trim(),
    message: String(message).trim(),
    link,
  });
  res.status(201).json({ success: true, data: notification });
});

export { createNotification, getNotifications, getUnreadCount, markAllRead, markRead };
