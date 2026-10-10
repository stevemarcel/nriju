// Delivery rules per product type — the single source of truth for
// "which delivery options does this cart allow." The most restrictive
// item in the cart wins: one cooked item forces same-day own/pickup.
//
// Types match the Product.productType enum the seed actually uses. "fresh"
// (if ever introduced) inherits cooked's strict window by not being listed
// with third-party here — add a rule when a product first uses it.

export const ALL_METHODS = ["own", "thirdparty", "pickup"];

export const DELIVERY_RULES = {
  cooked: {
    methods: ["own", "pickup"],
    eta: "Same day",
    note: "Cooked fresh — own fleet or pickup only, same day.",
  },
  packaged: {
    methods: ["own", "thirdparty", "pickup"],
    eta: "3-4 working days",
    note: "Shelf-stable.",
  },
  // frozen (litre/portion cold chain, 3-4 working days): NOT used by the
  // approved 62-SKU catalog — the frozen fish/meat are sold packaged with a
  // keep-thawed-until-heating usage note. Define its rule only if we start
  // seeding true frozen SKUs, so cart rules never silently over-promise.
};

// Intersect the allowed delivery methods across every type present in one cart.
export const allowedMethods = (productTypes) =>
  [...new Set(productTypes)]
    .map((t) => DELIVERY_RULES[t]?.methods || ["own", "pickup"]) // unknown type → safest (no third-party)
    .reduce((acc, methods) => acc.filter((m) => methods.includes(m)), ALL_METHODS);

// Cart ETA is dictated by the most perishable item; cooked overrides packaged.
export const cartEta = (productTypes) => {
  const types = [...new Set(productTypes)];
  return types
    .map((t) => {
      if (t === "cooked") return 0;
      if (t === "fresh") return 0;
      return 1;
    })
    .includes(0)
    ? DELIVERY_RULES.cooked.eta
    : DELIVERY_RULES.packaged.eta;
};

export const isDeliveryMethodAllowed = (method, productTypes) =>
  allowedMethods(productTypes).includes(method);
