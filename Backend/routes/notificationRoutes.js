import { Router } from "express";
import {
  getNotifications,
  markRead,
  markAllRead,
  createNotification,
} from "../controllers/notificationController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, getNotifications);
router.patch("/:id/read", auth, markRead);
router.patch("/read-all", auth, markAllRead);
router.post("/", admin, createNotification);

export default router;
