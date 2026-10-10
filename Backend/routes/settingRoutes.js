import { Router } from "express";
import {
  getPublicSettings,
  getSettings,
  updateSetting,
  updateSettings,
} from "../controllers/settingController.js";
import { admin } from "../middleware/auth.js";

const router = Router();

router.get("/public", getPublicSettings);
router.get("/", admin, getSettings);
router.put("/:key", admin, updateSetting);
router.put("/", admin, updateSettings);

export default router;
