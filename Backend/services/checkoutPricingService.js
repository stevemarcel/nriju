import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import PickupLocation from "../models/PickupLocation.js";
import Product from "../models/Product.js";
import Setting from "../models/Setting.js";
import { computeAvailableStock } from "./inventoryService.js";
import {
  allowedMethods,
  calculateDeliveryFeeKobo,
  cartEta,
  configuredDeliveryFee,
  DEFAULT_DELIVERY_FEE_STEP_KOBO,
  DEFAULT_DELIVERY_FEES_KOBO,
} from "../utils/delivery.js";
import {
  calculateOrderTotalKobo,
  calculateVatKobo,
  configuredVatRateBasisPoints,
  DEFAULT_VAT_RATE_BASIS_POINTS,
} from "../utils/pricing.js";

const CHECKOUT_SETTING_KEYS = [
  "delivery_fee_own",
  "delivery_fee_thirdparty",
  "delivery_fee_increment_per_5000",
  "vat_rate_basis_points",
  "pay_on_delivery_enabled",
  "pay_on_delivery_max_order_kobo",
  "pickup_available",
];

const fail = (message, statusCode = 400, details = undefined) => {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  if (details) error.details = details;
  throw error;
};

export const normalizeCheckoutItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) fail("Cart is empty.");

  const merged = new Map();
  for (const item of items) {
    const productId = String(item?.productId || item?.product || "");
    if (!mongoose.isValidObjectId(productId)) fail("An order item has an invalid product.");

    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      fail("Order item quantities must be positive whole numbers.");
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
};

const withSession = (query, session) => (session ? query.session(session) : query);

const getSettings = async (session) => {
  const query = Setting.find({ key: { $in: CHECKOUT_SETTING_KEYS } })
    .select("key value")
    .lean();
  const settings = await withSession(query, session);
  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
};

const getCoupon = async ({ couponCode, subtotalKobo, products, session }) => {
  if (!couponCode) return { coupon: null, discountKobo: 0, freeShipping: false };

  const query = Coupon.findOne({
    code: String(couponCode).trim().toUpperCase(),
    isActive: true,
  });
  const coupon = await withSession(query, session);

  if (!coupon) fail("Invalid coupon code.");
  if (coupon.expiryDate && coupon.expiryDate < new Date()) fail("Coupon has expired.");
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    fail("Coupon usage limit has been reached.");
  }
  if (subtotalKobo < coupon.minOrder) {
    fail(`Minimum order for this coupon is ₦${(coupon.minOrder / 100).toLocaleString("en-NG")}.`);
  }

  if (coupon.applicableCategories?.length) {
    const productCategoryIds = new Set(products.map((product) => String(product.category)));
    const applies = coupon.applicableCategories.some((categoryId) =>
      productCategoryIds.has(String(categoryId)),
    );
    if (!applies) fail("Coupon does not apply to the products in this cart.");
  }

  const rawDiscount = coupon.discountKoboFor(subtotalKobo);
  const discountKobo = Math.max(0, Math.min(subtotalKobo, Number(rawDiscount) || 0));
  return {
    coupon,
    discountKobo,
    freeShipping: coupon.type === "freeship",
  };
};

const getPickupLocation = async (pickupLocationId, session) => {
  if (!pickupLocationId || !mongoose.isValidObjectId(pickupLocationId)) {
    fail("Choose a pickup location.");
  }
  const location = await withSession(
    PickupLocation.findOne({ _id: pickupLocationId, isActive: true }),
    session,
  );
  if (!location) fail("The selected pickup location is unavailable.", 409);
  return location;
};

export const calculateCheckoutPricing = async ({
  items,
  deliveryMethod,
  couponCode,
  pickupLocationId,
  session = null,
  checkStock = true,
}) => {
  const normalizedItems = normalizeCheckoutItems(items);
  const productIds = normalizedItems.map((item) => item.productId);
  const [products, settings] = await Promise.all([
    withSession(Product.find({ _id: { $in: productIds } }), session),
    getSettings(session),
  ]);
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  let subtotalKobo = 0;
  const orderItems = [];
  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive) fail("One or more products are unavailable.", 404);

    if (checkStock) {
      const available = await computeAvailableStock(product._id, session);
      if (available < item.quantity) {
        fail(`${product.name} has only ${available} available.`, 409);
      }
    }

    subtotalKobo += product.price * item.quantity;
    if (!Number.isSafeInteger(subtotalKobo)) fail("Order total is too large.");
    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.images?.[0] || "",
      stockAllocations: [],
      costOfGoodsSold: null,
    });
  }

  const productTypes = products.map((product) => product.productType);
  const availableDeliveryMethods = allowedMethods(productTypes);
  if (
    deliveryMethod === "pickup" &&
    (settings.pickup_available === false || settings.pickup_available === "false")
  ) {
    fail("Store pickup is currently unavailable.", 409);
  }
  if (!availableDeliveryMethods.includes(deliveryMethod)) {
    fail("This delivery method is not available for the products in your cart.", 409, {
      availableDeliveryMethods,
    });
  }

  const pickupLocation =
    deliveryMethod === "pickup" ? await getPickupLocation(pickupLocationId, session) : null;
  const { coupon, discountKobo, freeShipping } = await getCoupon({
    couponCode,
    subtotalKobo,
    products,
    session,
  });

  let deliveryFeeKobo = 0;
  if (deliveryMethod !== "pickup" && !freeShipping) {
    const settingKey = deliveryMethod === "own" ? "delivery_fee_own" : "delivery_fee_thirdparty";
    deliveryFeeKobo = calculateDeliveryFeeKobo({
      subtotalKobo,
      baseFeeKobo: configuredDeliveryFee(
        settings[settingKey],
        DEFAULT_DELIVERY_FEES_KOBO[deliveryMethod],
      ),
      feeStepKobo: configuredDeliveryFee(
        settings.delivery_fee_increment_per_5000,
        DEFAULT_DELIVERY_FEE_STEP_KOBO,
      ),
      deliveryMethod,
    });
  }

  const vatRateBasisPoints = configuredVatRateBasisPoints(
    settings.vat_rate_basis_points,
    DEFAULT_VAT_RATE_BASIS_POINTS,
  );
  const vatAmountKobo = calculateVatKobo({
    subtotalKobo,
    discountKobo,
    vatRateBasisPoints,
  });
  const totalKobo = calculateOrderTotalKobo({
    subtotalKobo,
    discountKobo,
    vatKobo: vatAmountKobo,
    deliveryFeeKobo,
  });

  const podMaxOrder = Number(settings.pay_on_delivery_max_order_kobo);
  const payOnDelivery = {
    enabled:
      settings.pay_on_delivery_enabled !== false &&
      settings.pay_on_delivery_enabled !== "false" &&
      ["own", "pickup"].includes(deliveryMethod) &&
      (!Number.isSafeInteger(podMaxOrder) || podMaxOrder <= 0 || totalKobo <= podMaxOrder),
    maximumOrderKobo: Number.isSafeInteger(podMaxOrder) ? podMaxOrder : null,
  };

  return {
    normalizedItems,
    products,
    orderItems,
    subtotalKobo,
    discountKobo,
    vatRateBasisPoints,
    vatAmountKobo,
    deliveryFeeKobo,
    totalKobo,
    coupon,
    freeShipping,
    pickupLocation,
    availableDeliveryMethods,
    eta: cartEta(productTypes),
    payOnDelivery,
  };
};
