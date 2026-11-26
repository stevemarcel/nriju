import { Router } from "express";
import {
  subscribe,
  getSubscribers,
  deleteSubscriber,
  exportSubscribers,
} from "../controllers/newsletterController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

// Public subscription endpoint
router.post("/", subscribe);

// Admin-only management routes — auth middleware must be applied upstream
router.use(auth);
router.use(admin);
router.get("/", getSubscribers);
router.delete("/:id", deleteSubscriber);
router.get("/export", exportSubscribers);

export default router;
