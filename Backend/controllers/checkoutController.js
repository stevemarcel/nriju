import asyncHandler from "express-async-handler";
import { calculateCheckoutPricing } from "../services/checkoutPricingService.js";

const quoteCheckout = asyncHandler(async (req, res) => {
  const pricing = await calculateCheckoutPricing({
    items: req.body.items,
    deliveryMethod: req.body.deliveryMethod,
    couponCode: req.body.couponCode,
    pickupLocationId: req.body.pickupLocationId,
  });

  res.json({
    success: true,
    data: {
      subtotal: pricing.subtotalKobo,
      discount: pricing.discountKobo,
      vatRateBasisPoints: pricing.vatRateBasisPoints,
      vatAmount: pricing.vatAmountKobo,
      deliveryFee: pricing.deliveryFeeKobo,
      total: pricing.totalKobo,
      freeShipping: pricing.freeShipping,
      coupon: pricing.coupon ? { code: pricing.coupon.code, type: pricing.coupon.type } : null,
      availableDeliveryMethods: pricing.availableDeliveryMethods,
      eta: pricing.eta,
      payOnDelivery: pricing.payOnDelivery,
    },
  });
});

export { quoteCheckout };
