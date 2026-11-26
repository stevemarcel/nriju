import asyncHandler from "express-async-handler";
import Setting from "../models/Setting.js";

const NON_NEGATIVE_INTEGER_KEYS = new Set([
  "delivery_fee_own",
  "delivery_fee_thirdparty",
  "delivery_fee_increment_per_5000",
  "pay_on_delivery_max_order_kobo",
]);

const normalizeSettingValue = (key, value) => {
  if (NON_NEGATIVE_INTEGER_KEYS.has(key)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      const error = new Error(`${key} must be a non-negative integer in kobo.`);
      error.status = 400;
      throw error;
    }
  }
  if (key === "vat_rate_basis_points") {
    if (!Number.isSafeInteger(value) || value < 0 || value > 10000) {
      const error = new Error("VAT rate must be between 0% and 100%.");
      error.status = 400;
      throw error;
    }
  }
  if (["pay_on_delivery_enabled", "pickup_available"].includes(key) && typeof value !== "boolean") {
    const error = new Error(`${key} must be true or false.`);
    error.status = 400;
    throw error;
  }
  if (
    key === "handoff_otp_expiry_minutes" &&
    (!Number.isSafeInteger(value) || value < 15 || value > 1440)
  ) {
    const error = new Error("Handoff code lifetime must be between 15 and 1440 minutes.");
    error.status = 400;
    throw error;
  }
  return value;
};

// @DESCRIPTION Get public settings (delivery fees, business info)
// @ROUTE       GET /api/v1/settings/public
// @ACCESS      Public
const getPublicSettings = asyncHandler(async (req, res) => {
  const keys = [
    "business_name",
    "business_phone",
    "business_email",
    "business_address",
    "delivery_fee_own",
    "delivery_fee_thirdparty",
    "delivery_fee_increment_per_5000",
    "vat_rate_basis_points",
    "pay_on_delivery_enabled",
    "pay_on_delivery_max_order_kobo",
    "pickup_available",
    "whatsapp_number",
    "instagram_handle",
    "facebook_page",
    "opening_hours",
    "return_policy",
    "privacy_policy",
    "terms_and_conditions",
  ];

  const settings = await Setting.find({ key: { $in: keys } });
  const result = {};
  settings.forEach((s) => {
    result[s.key] = s.value;
  });

  res.json({ success: true, data: result });
});

// @DESCRIPTION Get all settings (admin)
// @ROUTE       GET /api/v1/settings
// @ACCESS      Admin
const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find().sort("key");
  res.json({ success: true, data: settings });
});

// @DESCRIPTION Update a setting (admin)
// @ROUTE       PUT /api/v1/settings/:key
// @ACCESS      Admin
const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const value = normalizeSettingValue(key, req.body.value);

  let setting = await Setting.findOne({ key });
  if (!setting) {
    setting = await Setting.create({ key, value });
  } else {
    setting.value = value;
    await setting.save();
  }

  res.json({ success: true, data: setting });
});

// @DESCRIPTION Update multiple settings at once (admin)
// @ROUTE       PUT /api/v1/settings
// @ACCESS      Admin
const updateSettings = asyncHandler(async (req, res) => {
  const updates = req.body; // { key: value, ... }

  const updated = [];
  for (const [key, rawValue] of Object.entries(updates)) {
    const value = normalizeSettingValue(key, rawValue);
    let setting = await Setting.findOne({ key });
    if (!setting) {
      setting = await Setting.create({ key, value });
    } else {
      setting.value = value;
      await setting.save();
    }
    updated.push(setting);
  }

  res.json({ success: true, data: updated });
});

export { getPublicSettings, getSettings, updateSetting, updateSettings };
