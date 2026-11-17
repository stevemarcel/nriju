import express from "express";
import {
  getInventory,
  getInventoryStats,
  getProductBatches,
  getInventoryMovements,
  addStock,
  removeStock,
  adjustStockDirect,
  damageStock,
  returnStock,
} from "../controllers/inventoryController.js";
import { auth, admin } from "../middleware/auth.js";

const router = express.Router();

router.use(auth, admin);

// Static paths must precede /:productId paths.
router.get("/", getInventory);
router.get("/stats", getInventoryStats);
router.get("/movements", getInventoryMovements);
router.get("/:productId/batches", getProductBatches);

router.post("/:productId/add", addStock);
router.post("/:productId/remove", removeStock);
router.post("/:productId/adjust", adjustStockDirect);
router.post("/:productId/damage", damageStock);
router.post("/:productId/return", returnStock);

export default router;
