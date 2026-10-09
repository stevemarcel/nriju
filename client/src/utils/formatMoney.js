// Storage is integer kobo everywhere; naira only exists at render time.

export const formatNaira = (kobo) =>
  `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const toNaira = (kobo) => kobo / 100;

// Admin forms accept naira; convert to kobo before sending to the API.
export const toKobo = (naira) => Math.round(Number(naira) * 100);
