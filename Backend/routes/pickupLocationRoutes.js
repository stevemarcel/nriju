import { Router } from "express";
import {
  createPickupLocation,
  getAllPickupLocations,
  getPickupLocations,
  updatePickupLocation,
} from "../controllers/pickupLocationController.js";
import { admin, auth } from "../middleware/auth.js";

const router = Router();

router.get("/", getPickupLocations);
router.get("/all", auth, admin, getAllPickupLocations);
router.post("/", auth, admin, createPickupLocation);
router.patch("/:id", auth, admin, updatePickupLocation);

export default router;
