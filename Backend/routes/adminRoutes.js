import { Router } from "express";
import {
  getStats,
  getUsers,
  getUser,
  updateUser,
  getActivityLogs,
  getUserAvatarSource,
  uploadUserAvatar,
  deleteUserAvatar,
} from "../controllers/adminController.js";
import { auth, admin, superAdmin } from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = Router();

// Every admin route requires an authenticated user first so req.user is populated
router.use(auth);
router.get("/stats", admin, getStats);
router.get("/users", admin, getUsers);
router.get("/users/:id", admin, getUser);
router.patch("/users/:id", admin, updateUser);
router.get("/users/:id/avatar/source", admin, getUserAvatarSource);
router.post("/users/:id/avatar", admin, uploadAvatar, uploadUserAvatar);
router.delete("/users/:id/avatar", admin, deleteUserAvatar);
router.get("/activity-logs", admin, getActivityLogs);

export default router;
