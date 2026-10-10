import asyncHandler from "express-async-handler";
import Coupon from "../models/Coupon.js";

// @DESCRIPTION Validate a coupon code against a cart
// @ROUTE       POST /api/v1/coupons/validate
// @ACCESS      Public (used at checkout)
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal, items } = req.body;

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
  }).populate("applicableCategories");

  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code");
  }

  if (coupon.expiryDate < new Date()) {
    res.status(400);
    throw new Error("Coupon has expired");
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error("Coupon usage limit reached");
  }

  if (subtotal < coupon.minOrder) {
    res.status(400);
    throw new Error(`Minimum order is ₦${(coupon.minOrder / 100).toLocaleString()}`);
  }

  // Check if coupon applies to specific categories
  if (coupon.applicableCategories.length > 0 && items) {
    const itemCategoryIds = items.map((i) => i.categoryId);
    const applies = coupon.applicableCategories.some((cat) =>
      itemCategoryIds.includes(cat._id.toString()),
    );
    if (!applies) {
      res.status(400);
      throw new Error("Coupon does not apply to items in your cart");
    }
  }

  const discountKobo = coupon.discountKoboFor(subtotal);

  res.json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.type === "percent" ? coupon.value : coupon.value / 100,
      discount: discountKobo,
      minOrder: coupon.minOrder,
    },
  });
});

// @DESCRIPTION List all coupons (admin)
// @ROUTE       GET /api/v1/coupons
// @ACCESS      Admin
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort("-createdAt");
  res.json({ success: true, data: coupons });
});

// @DESCRIPTION Create a new coupon (admin)
// @ROUTE       POST /api/v1/coupons
// @ACCESS      Admin
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    type,
    value,
    minOrder,
    maxDiscount,
    expiryDate,
    usageLimit,
    applicableCategories,
    isActive,
  } = req.body;

  const coupon = await Coupon.create({
    code,
    type,
    value,
    minOrder,
    maxDiscount,
    expiryDate,
    usageLimit,
    applicableCategories,
    isActive,
  });

  res.status(201).json({ success: true, data: coupon });
});

// @DESCRIPTION Update a coupon (admin)
// @ROUTE       PUT /api/v1/coupons/:id
// @ACCESS      Admin
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  const allowed = [
    "type",
    "value",
    "minOrder",
    "maxDiscount",
    "expiryDate",
    "usageLimit",
    "applicableCategories",
    "isActive",
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) coupon[key] = req.body[key];
  }

  await coupon.save();
  res.json({ success: true, data: coupon });
});

// @DESCRIPTION Delete a coupon (admin)
// @ROUTE       DELETE /api/v1/coupons/:id
// @ACCESS      Admin
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  await coupon.deleteOne();
  res.json({ success: true, message: "Coupon deleted" });
});

export { validateCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon };
