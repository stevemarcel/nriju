import { Router } from "express";
import {
  getInventory,
  getInventoryAlerts,
  createInventoryBatch,
  updateInventoryBatch,
  voidInventoryBatch,
  recomputeProductStock,
} from "../controllers/inventoryController.js";
import { auth, admin } from "../middleware/auth.js";

const router = Router();

// Admin-only inventory routes
router.use(auth);
router.use(admin);
router.get("/", getInventory);
router.get("/alerts", getInventoryAlerts);
router.post("/", createInventoryBatch);
router.put("/:id", updateInventoryBatch);
router.delete("/:id", voidInventoryBatch);
router.post("/:productId/recompute", recomputeProductStock);

export default router;
