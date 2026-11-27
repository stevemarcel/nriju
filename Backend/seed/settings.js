// Seed store settings — NR-05
// Money values (delivery fees) are stored as INTEGER KOBO, matching the
// convention used everywhere else in the app. Naira only appears at render
// time (AdminSettingsPage converts naira -> kobo on save, DeliveryPage
// divides by 100 on read). Booleans are real booleans, not strings, so the
// public delivery page can check them directly.
export default [
  {
    key: "business_name",
    value: "Nriju",
  },
  {
    key: "business_phone",
    value: "+234 800 000 0000",
  },
  {
    key: "business_email",
    value: "orders@nriju.com",
  },
  {
    key: "business_address",
    value: "Lagos, Nigeria",
  },
  {
    key: "delivery_fee_own",
    value: 500000,
  },
  {
    key: "delivery_fee_thirdparty",
    value: 750000,
  },
  {
    key: "delivery_fee_increment_per_5000",
    value: 70000,
  },
  {
    key: "vat_rate_basis_points",
    value: 750,
  },
  {
    key: "pay_on_delivery_enabled",
    value: true,
  },
  {
    key: "pay_on_delivery_max_order_kobo",
    value: 10000000,
  },
  {
    key: "handoff_otp_expiry_minutes",
    value: 240,
  },
  {
    key: "pickup_available",
    value: true,
  },
  {
    key: "pickup_instructions",
    value:
      "Show your order number at the pickup counter. Items are ready within 30 min of the 'ready for pickup' notification.",
  },
  {
    key: "whatsapp_number",
    value: "+234 800 000 0000",
  },
  {
    key: "instagram_handle",
    value: "@nriju",
  },
  {
    key: "facebook_page",
    value: "Nriju",
  },
  {
    key: "opening_hours",
    value: "Mon - Sat, 8am - 8pm",
  },
  {
    key: "return_policy",
    value:
      "Returns are accepted within 7 days of delivery for packaged goods. Cooked items must be returned the same day, unopened and still warm. Contact us with your order number and we will arrange a pickup or refund.",
  },
  {
    key: "privacy_policy",
    value:
      "Nriju collects the information you provide (name, phone, email and delivery address) to fulfil your orders and keep you posted on them. We never sell your data. Payment details are handled by our payment partner and never touch our servers.",
  },
  {
    key: "terms_and_conditions",
    value:
      "By ordering from Nriju you agree that cooked items are perishable and non-returnable except when delivered cold or late. Delivery times are estimates and may vary by location. Prices are in Nigerian naira and may change until your order is confirmed. Contact us with any questions before you buy.",
  },
];
