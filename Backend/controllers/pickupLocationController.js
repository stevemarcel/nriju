import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import PickupLocation from "../models/PickupLocation.js";
import Setting from "../models/Setting.js";
import { recordActivity } from "../utils/activityUtils.js";

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  throw error;
};

const getPickupLocations = asyncHandler(async (_req, res) => {
  const pickupSetting = await Setting.findOne({ key: "pickup_available" }).lean();
  if (pickupSetting && (pickupSetting.value === false || pickupSetting.value === "false")) {
    return res.json({ success: true, data: [] });
  }
  const locations = await PickupLocation.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: locations });
});

const getAllPickupLocations = asyncHandler(async (_req, res) => {
  const locations = await PickupLocation.find().sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: locations });
});

const createPickupLocation = asyncHandler(async (req, res) => {
  const location = await PickupLocation.create({
    ...req.body,
    code: String(req.body.code || "")
      .trim()
      .toUpperCase(),
    createdBy: req.user._id,
  });
  recordActivity(req, {
    action: "pickup_location.created",
    entity: "setting",
    entityId: location._id,
    entityName: location.name,
    actionType: "create",
    description: `created pickup location ${location.name}`,
  });
  res.status(201).json({ success: true, data: location });
});

const updatePickupLocation = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) fail("Invalid pickup location ID.");
  const location = await PickupLocation.findById(req.params.id);
  if (!location) fail("Pickup location not found.", 404);

  const allowed = [
    "name",
    "code",
    "addressLine",
    "city",
    "state",
    "landmark",
    "phone",
    "openingHours",
    "instructions",
    "coordinates",
    "isActive",
    "sortOrder",
  ];
  for (const field of allowed) {
    if (req.body[field] !== undefined) location[field] = req.body[field];
  }
  if (req.body.code !== undefined) location.code = String(req.body.code).trim().toUpperCase();
  location.updatedBy = req.user._id;
  await location.save();
  recordActivity(req, {
    action: "pickup_location.updated",
    entity: "setting",
    entityId: location._id,
    entityName: location.name,
    actionType: "update",
    description: `updated pickup location ${location.name}`,
  });
  res.json({ success: true, data: location });
});

export { getPickupLocations, getAllPickupLocations, createPickupLocation, updatePickupLocation };
