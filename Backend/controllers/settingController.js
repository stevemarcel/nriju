import asyncHandler from "express-async-handler";
import Setting from "../models/Setting.js";

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
  const { value } = req.body;

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
  for (const [key, value] of Object.entries(updates)) {
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
