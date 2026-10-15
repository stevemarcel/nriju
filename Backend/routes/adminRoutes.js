import { Router } from "express";
import { getStats, getUsers, updateUser, getActivityLogs } from "../controllers/adminController.js";
import { auth, admin, superAdmin } from "../middleware/auth.js";

const router = Router();

// Every admin route requires an authenticated user first so req.user is populated
router.use(auth);
router.get("/stats", admin, getStats);
router.get("/users", admin, getUsers);
router.patch("/users/:id", admin, updateUser);
router.get("/activity-logs", admin, getActivityLogs);

export default router;
