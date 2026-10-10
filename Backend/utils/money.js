// All monetary values are stored and computed as INTEGER KOBO.
// Naira only appears at display time. This eliminates float rounding
// errors (0.1 + 0.2 !== 0.3) in subtotal/discount/total math.
// Paystack natively expects kobo, so amounts pass through unchanged.

const NAIRA_TO_KOBO = 100;

// Seed data and admin input are authored in naira; convert once at insert.
export const toKobo = (naira) => Math.round(Number(naira) * NAIRA_TO_KOBO);

export const toNaira = (kobo) => kobo / NAIRA_TO_KOBO;

// Display helper for server-rendered contexts (emails, PDFs).
export const formatNaira = (kobo) =>
  `₦${(kobo / NAIRA_TO_KOBO).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

// Coupon percent types store e.g. 10 for 10%. Rounding happens once, here.
export const percentOfKobo = (koboAmount, percent) => Math.round((koboAmount * percent) / 100);
