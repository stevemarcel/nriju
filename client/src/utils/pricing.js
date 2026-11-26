export const DEFAULT_VAT_RATE_BASIS_POINTS = 750;

export const configuredVatRateBasisPoints = (value, fallback = DEFAULT_VAT_RATE_BASIS_POINTS) => {
  const rate = Number(value);
  return Number.isSafeInteger(rate) && rate >= 0 && rate <= 10000 ? rate : fallback;
};

export const calculateVatKobo = ({
  subtotalKobo,
  discountKobo = 0,
  vatRateBasisPoints = DEFAULT_VAT_RATE_BASIS_POINTS,
}) => {
  const subtotal = Math.max(0, Number(subtotalKobo) || 0);
  const discount = Math.max(0, Math.min(subtotal, Number(discountKobo) || 0));
  const rate = configuredVatRateBasisPoints(vatRateBasisPoints);
  return Math.round(((subtotal - discount) * rate) / 10000);
};

export const calculateOrderTotalKobo = ({
  subtotalKobo,
  discountKobo = 0,
  vatKobo = 0,
  deliveryFeeKobo = 0,
}) =>
  Math.max(
    0,
    Number(subtotalKobo) - Number(discountKobo) + Number(vatKobo) + Number(deliveryFeeKobo),
  );

export const formatVatRate = (basisPoints) => {
  const rate = configuredVatRateBasisPoints(basisPoints) / 100;
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0+$/, "");
};
