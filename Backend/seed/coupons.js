// Seed coupons — NR-11
// expiryDate is required by the Coupon schema.
const expiry = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

export default [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minOrder: 5000,
    maxDiscount: 2000,
    expiryDate: expiry(30),
    usageLimit: 500,
    usedCount: 0,
    applicableCategories: [],
    isActive: true,
  },
  {
    code: "FREESHIP",
    type: "freeship",
    value: 0,
    minOrder: 3000,
    expiryDate: expiry(30),
    usageLimit: 300,
    usedCount: 0,
    applicableCategories: [],
    isActive: true,
  },
  {
    code: "SAVE500",
    type: "flat",
    value: 500,
    minOrder: 10000,
    expiryDate: expiry(14),
    usageLimit: 200,
    usedCount: 0,
    applicableCategories: [],
    isActive: true,
  },
];