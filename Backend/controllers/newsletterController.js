import asyncHandler from "express-async-handler";
import Subscriber from "../models/Subscriber.js";
import { send } from "../services/emailService.js";

// @DESCRIPTION Subscribe an email to the newsletter
// @ROUTE       POST /api/v1/newsletter
// @ACCESS      Public
const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const trimmed = email?.trim().toLowerCase();

  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    res.status(400);
    throw new Error("Please enter a valid email address");
  }

  // Upserting with a unique index means duplicate re-submits are a no-op,
  // not an error — a returning visitor should never see a 500.
  const existing = await Subscriber.findOne({ email: trimmed });
  if (existing) {
    res.json({ success: true, message: "You're already subscribed." });
    return;
  }

  await Subscriber.create({ email: trimmed });

  // Best-effort confirmation — a failed email must not fail the signup,
  // since the subscriber record is already persisted.
  const emailContent = {
    to: trimmed,
    toName: "",
    subject: "You're subscribed to Nriju!",
    html: "<h2>You're in!</h2><p>Thanks for subscribing to Nriju. Look out for our latest dishes, seasonal specials and exclusive deals.</p>",
    text: "Thanks for subscribing to Nriju! Look out for our latest dishes, seasonal specials and exclusive deals.",
  };
  await send(emailContent).catch(() => {});

  res.status(201).json({ success: true, message: "Subscribed successfully." });
});

// @DESCRIPTION List subscribers with search and pagination (admin)
// @ROUTE       GET /api/v1/newsletter
// @ACCESS      Admin
const getSubscribers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const search = req.query.search?.trim();

  const filter = search ? { email: { $regex: search, $options: "i" } } : {};

  const total = await Subscriber.countDocuments(filter);
  const subscribers = await Subscriber.find(filter)
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    success: true,
    data: subscribers,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// @DESCRIPTION Delete a subscriber (admin)
// @ROUTE       DELETE /api/v1/newsletter/:id
// @ACCESS      Admin
const deleteSubscriber = asyncHandler(async (req, res) => {
  const subscriber = await Subscriber.findById(req.params.id);

  if (!subscriber) {
    res.status(404);
    throw new Error("Subscriber not found");
  }

  await subscriber.deleteOne();
  res.json({ success: true, message: "Subscriber removed." });
});

// @DESCRIPTION Export all subscribers as a CSV file (admin)
// @ROUTE       GET /api/v1/newsletter/export
// @ACCESS      Admin
const exportSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscriber.find().sort("-createdAt").lean();

  const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = ["Email,Subscribed At"];
  for (const s of subscribers) {
    rows.push(`${escapeCsv(s.email)},${escapeCsv(new Date(s.createdAt).toISOString())}`);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="nriju-subscribers.csv"');
  res.send(rows.join("\n"));
});

export { subscribe, getSubscribers, deleteSubscriber, exportSubscribers };
