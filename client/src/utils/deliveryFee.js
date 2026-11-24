export const FREE_DELIVERY_THRESHOLD_KOBO = 500000;
export const STANDARD_DELIVERY_CEILING_KOBO = 1000000;
export const DELIVERY_TOTAL_STEP_KOBO = 500000;
export const DEFAULT_DELIVERY_FEE_STEP_KOBO = 70000;

export const DEFAULT_DELIVERY_FEES_KOBO = {
  own: 500000,
  thirdparty: 750000,
};

export const configuredDeliveryFee = (value, fallback) => {
  const fee = Number(value);
  return Number.isSafeInteger(fee) && fee >= 0 ? fee : fallback;
};

export const calculateDeliveryFeeKobo = ({
  subtotalKobo,
  baseFeeKobo,
  feeStepKobo = DEFAULT_DELIVERY_FEE_STEP_KOBO,
  deliveryMethod,
}) => {
  if (deliveryMethod === "pickup") return 0;

  const subtotal = Math.max(0, Number(subtotalKobo) || 0);
  if (subtotal < FREE_DELIVERY_THRESHOLD_KOBO) return 0;

  const baseFee = Math.max(0, Number(baseFeeKobo) || 0);
  const feeStep = Math.max(0, Number(feeStepKobo) || 0);
  const additionalBands = Math.max(
    0,
    Math.ceil((subtotal - STANDARD_DELIVERY_CEILING_KOBO) / DELIVERY_TOTAL_STEP_KOBO),
  );

  return baseFee + additionalBands * feeStep;
};
