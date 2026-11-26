import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  createNotification,
} from "../controllers/notificationController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, getNotifications);
router.get("/unread-count", auth, getUnreadCount);
router.patch("/read-all", auth, markAllRead);
router.patch("/:id/read", auth, markRead);
router.post("/", auth, admin, createNotification);

export default router;
