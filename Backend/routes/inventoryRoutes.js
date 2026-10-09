import { Router } from "express";
import {
  getInventory,
  getInventoryAlerts,
  createInventoryBatch,
  updateInventoryBatch,
  voidInventoryBatch,
  recomputeProductStock,
} from "../controllers/inventoryController.js";
import { admin } from "../middleware/auth.js";

const router = Router();

router.get("/", admin, getInventory);
router.get("/alerts", admin, getInventoryAlerts);
router.post("/", admin, createInventoryBatch);
router.put("/:id", admin, updateInventoryBatch);
router.delete("/:id", admin, voidInventoryBatch);
router.post("/:productId/recompute", admin, recomputeProductStock);

export default router;