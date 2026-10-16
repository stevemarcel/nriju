import { Router } from "express";
import {
  getPublicSettings,
  getSettings,
  updateSetting,
  updateSettings,
} from "../controllers/settingController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

router.get("/public", getPublicSettings);

// Admin-only management routes
router.use(auth);
router.use(admin);
router.get("/", getSettings);
router.put("/:key", updateSetting);
router.put("/", updateSettings);

export default router;
