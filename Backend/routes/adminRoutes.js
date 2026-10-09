import { Router } from "express";
import {
  getStats,
  getUsers,
  updateUser,
  getActivityLogs,
} from "../controllers/adminController.js";
import { admin, superAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/stats", admin, getStats);
router.get("/users", admin, getUsers);
router.patch("/users/:id", admin, updateUser);
router.get("/activity-logs", admin, getActivityLogs);

export default router;