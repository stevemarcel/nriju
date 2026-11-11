import express from "express";
import {
  getInventory,
  getInventoryStats,
  addStock,
  removeStock,
  adjustStockDirect,
  damageStock,
} from "../controllers/inventoryController.js";
import { auth, admin } from "../middleware/auth.js";

const router = express.Router();

router.use(auth);
router.use(admin);

router.get("/", getInventory);
router.get("/stats", getInventoryStats);

router.post("/:productId/add", addStock);
router.post("/:productId/remove", removeStock);
router.post("/:productId/adjust", adjustStockDirect);
router.post("/:productId/damage", damageStock);

export default router;
