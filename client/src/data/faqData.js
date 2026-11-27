import {
  Boxes,
  CreditCard,
  Headset,
  Package,
  RotateCcw,
  ShoppingBag,
  Snowflake,
  Truck,
  UserRound,
} from "lucide-react";

// Category metadata — icon + label per the help-centre spec.
export const CATEGORY_META = [
  { id: "orders", label: "Orders & Shopping", icon: ShoppingBag },
  { id: "delivery", label: "Delivery & Pickup", icon: Truck },
  { id: "products", label: "Products & Quality", icon: Package },
  { id: "storage", label: "Storage & Food Safety", icon: Snowflake },
  { id: "payments", label: "Payments & Promotions", icon: CreditCard },
  { id: "returns", label: "Returns & Refunds", icon: RotateCcw },
  { id: "account", label: "My Account", icon: UserRound },
  { id: "bulk", label: "Bulk & Business", icon: Boxes },
  { id: "support", label: "Customer Support", icon: Headset },
];

export const FAQ_SECTIONS = {
  orders: [
    {
      q: "What is Nriju?",
      a: "Nriju is a food brand dedicated to making authentic Nigerian food more accessible and convenient. We bring together delicious meals, traditional soups and stews, quality proteins, dried foods, snacks and other carefully selected food products for everyday enjoyment.",
    },
    {
      q: "How do I place an order?",
      a: "Browse our shop, select your preferred products and quantities, and add them to your cart. When you're ready, proceed to checkout, provide the required information, select an available fulfilment option and complete your payment.",
    },
    {
      q: "Do I need an account to place an order?",
      a: "Creating a Nriju account gives you a more convenient shopping experience. You can manage your delivery addresses, save your favourite products, access your order history and manage your personal information. Available checkout options will be displayed when you proceed with your purchase.",
    },
    {
      q: "Is there a minimum order amount?",
      a: "Any applicable minimum order requirement will be communicated during checkout. Minimum order requirements may vary depending on the delivery location, product selection or fulfilment method.",
    },
    {
      q: "How do I know if my order has been successfully placed?",
      a: "Once your order has been successfully submitted, you will receive an order confirmation containing your order details and a unique order reference. If you have made a payment but have not received confirmation, please contact our customer support team before attempting another payment.",
    },
    {
      q: "How can I check the status of my order?",
      a: "Sign in to your Nriju account and visit your order history to view the latest available information about your order. You can also contact our customer support team using your order number if you require additional assistance.",
    },
    {
      q: "Can I modify my order after placing it?",
      a: "Order amendments may be possible before preparation or fulfilment begins. Please contact us as soon as possible if you need to change your items, quantities or delivery information. Once an order is being prepared or has been dispatched, modifications may no longer be possible.",
    },
    {
      q: "Can I cancel my order?",
      a: "Orders may generally be cancelled without charge before preparation or fulfilment begins. Cancellation requests received after this stage will be assessed based on the order's status and the nature of the products involved. Please refer to our Returns, Refunds & Replacements Policy for further information.",
    },
    {
      q: "What happens if a product I ordered becomes unavailable?",
      a: "If an item becomes unavailable after you place your order, we may contact you to offer a suitable alternative, arrange fulfilment at a later date or provide a refund for the unavailable item. We will not substitute a materially different product without your agreement.",
    },
    {
      q: "Can I order products that are currently out of stock?",
      a: "Products marked as out of stock are generally unavailable for immediate purchase. Availability may change as new stock arrives. You can check the product page periodically or contact our team for information about expected restocking.",
    },
  ],
  delivery: [
    {
      q: "Where does Nriju deliver?",
      a: "Nriju operates from Lagos, Nigeria. Available delivery locations depend on the products in your order and our current delivery coverage. Certain products, particularly frozen, chilled and freshly prepared foods, may have more limited delivery coverage due to their storage and handling requirements. Please check the available delivery options during checkout or contact us to confirm whether we deliver to your location.",
    },
    {
      q: "How long does delivery take?",
      a: "Delivery times depend on your location, product availability, order preparation requirements and the selected fulfilment method. Estimated delivery information will be communicated through the applicable ordering process. We recommend placing time-sensitive orders in advance.",
    },
    {
      q: "Do you offer same-day delivery?",
      a: "Same-day delivery may be available depending on your location, the time your order is placed, product availability and our delivery capacity. Please confirm availability before placing an order that requires same-day delivery.",
    },
    {
      q: "How much does delivery cost?",
      a: "Delivery charges may vary based on your location, order requirements and the selected delivery method. Any applicable delivery fee will be communicated before you complete your purchase.",
    },
    {
      q: "Do you offer free delivery?",
      a: "Free delivery may be available during selected promotional campaigns or for qualifying orders. Applicable conditions, including minimum order values or eligible locations, will be communicated as part of the offer.",
    },
    {
      q: "Can I schedule a delivery for a specific date or time?",
      a: "If you require delivery on a particular date or within a specific timeframe, please contact us in advance to confirm availability. Scheduled deliveries are subject to product availability, preparation requirements and delivery capacity.",
    },
    {
      q: "Can I pick up my order instead of having it delivered?",
      a: "Pickup is available for eligible orders through designated collection arrangements. Please select pickup where available during checkout or contact our team to confirm the collection location and when your order will be ready.",
    },
    {
      q: "How are frozen and chilled products delivered?",
      a: "Temperature-sensitive products require special handling to help preserve their quality and safety during transportation. Delivery arrangements are determined by the nature of the product and the destination. Upon receiving your order, please transfer frozen and chilled products promptly to appropriate storage.",
    },
    {
      q: "Can I order from outside Lagos?",
      a: "Delivery outside Lagos depends on the products you wish to purchase and the available transportation arrangements. Certain dried, preserved and shelf-stable products may be more suitable for long-distance delivery than fresh or frozen foods. Please contact our team to confirm availability before placing your order.",
    },
    {
      q: "Can someone else receive my order on my behalf?",
      a: "Yes. You may nominate a trusted person to receive your order. Please ensure that the recipient has the necessary delivery information, is available at the agreed location and understands any immediate food storage requirements.",
    },
    {
      q: "What happens if I am unavailable when my order arrives?",
      a: "Our delivery team may attempt to contact you or your authorised recipient to complete the delivery. If delivery cannot be completed, additional delivery arrangements or charges may apply. Certain perishable products may not be suitable for redelivery due to food safety considerations.",
    },
    {
      q: "What should I do if my delivery is delayed?",
      a: "Please check your order status or contact our customer support team with your order reference. Delivery delays may occasionally occur due to traffic, weather, operational circumstances or other unforeseen events. We will work with you to establish the status of your order and determine an appropriate resolution.",
    },
  ],
  products: [
    {
      q: "What types of food products does Nriju offer?",
      a: "Our product range brings together authentic Nigerian meals, soups, stews, swallows, quality proteins, dried and preserved foods, frozen products and snacks. Visit our shop to explore our latest product selection, available sizes and current prices.",
    },
    {
      q: "Are Nriju products freshly prepared?",
      a: "Our products are prepared, processed or preserved according to their individual characteristics and intended use. Some products are supplied freshly prepared, while others are dried, frozen or packaged for convenience and preservation. Please refer to each product's description for information about its specific condition.",
    },
    {
      q: "Where do you source your ingredients and proteins?",
      a: "We prioritise suitable ingredients and responsible sourcing practices that support product quality and consistency. If you require specific information about a product's origin, ingredients or processing, please contact our team before purchasing.",
    },
    {
      q: "How does Nriju maintain product quality?",
      a: "We are committed to maintaining appropriate standards of hygiene, preparation, packaging, storage and handling throughout our operations. If you have any concerns about the quality or condition of a product you receive, please let us know so we can investigate and assist you.",
    },
    {
      q: "Are all your products ready to eat?",
      a: "Not necessarily. Some Nriju products are ready to eat, while others require reheating, cooking, thawing, soaking or further preparation. Always check the product description and packaging instructions before consumption.",
    },
    {
      q: "How can I find out what ingredients are in a product?",
      a: "Ingredient information can be found on the relevant product page or packaging. If you require additional information about a particular ingredient, seasoning, additive or preparation method, please contact our customer support team before purchasing.",
    },
    {
      q: "Do your products contain allergens?",
      a: "Some products may contain common food allergens, including fish, shellfish, groundnuts, soy, wheat, milk, eggs or other ingredients, depending on the recipe and preparation environment. Please review the available ingredient and allergen information carefully. If you have a food allergy or dietary restriction, contact us before ordering. Unless explicitly confirmed for a particular product, we cannot guarantee the absence of allergen cross-contact.",
    },
    {
      q: "Do you offer products suitable for special dietary requirements?",
      a: "Suitability for vegetarian, vegan, gluten-free, low-sodium, halal and other dietary requirements varies by product. Please review the relevant product information or contact our team to confirm suitability before purchasing.",
    },
    {
      q: "Can I request a different spice level?",
      a: "Certain freshly prepared products may be available with alternative spice levels where this option is offered. Packaged, dried and pre-prepared products are generally supplied according to their established recipes. Please contact us in advance regarding specific requirements.",
    },
    {
      q: "Will the product I receive look exactly like the photographs?",
      a: "We aim to represent our products as accurately as possible. However, natural variations in colour, shape, texture and size may occur, particularly with meat, fish and traditionally prepared food products. These variations do not necessarily indicate a difference in quality. The product should remain consistent with its advertised description.",
    },
    {
      q: "Are product weights and portion sizes accurate?",
      a: "Our products are supplied according to the stated weight, quantity or portion information, subject to any lawful and clearly disclosed variations. If you believe there is a material discrepancy with your order, please contact our customer support team.",
    },
    {
      q: "How do I know the shelf life of a product?",
      a: "Shelf life varies according to the product, processing method, packaging and storage conditions. Please refer to the applicable expiry or use-by information, storage instructions and product description. Contact us if you require clarification before purchasing.",
    },
  ],
  storage: [
    {
      q: "How should I store my Nriju products after delivery?",
      a: "Storage requirements vary by product. Freshly prepared meals should be consumed promptly or refrigerated appropriately. Frozen products should be transferred to suitable freezer storage. Chilled products should be refrigerated promptly. Shelf-stable products should be stored according to their packaging instructions. Always follow the product-specific storage instructions.",
    },
    {
      q: "How should I store dried meat and preserved food products?",
      a: "Follow the storage instructions provided for the specific product. Products confirmed to be shelf-stable should generally be kept in a cool, dry place away from moisture, direct sunlight and excessive heat. After opening, refrigeration or another storage method may be required. Not all dried or smoked meat products are suitable for room-temperature storage.",
    },
    {
      q: "Can I eat dried or smoked meat directly from the pack?",
      a: "This depends on the individual product and how it has been processed. Some dried or smoked meats may be ready to eat, while others require cooking, soaking or reheating before consumption. Always check the preparation instructions before eating.",
    },
    {
      q: "How should I thaw frozen meat and fish?",
      a: "The preferred method is to thaw frozen food in a refrigerator using a suitable container to prevent leakage and cross-contamination. Avoid leaving frozen meat or fish to thaw at room temperature. Follow any additional instructions provided on the packaging.",
    },
    {
      q: "Can I refreeze a product after thawing it?",
      a: "This depends on how the product was thawed and whether it remained at a safe temperature. As a general precaution, avoid repeated thawing and refreezing. Products that have been improperly thawed or exposed to unsafe temperatures should not be refrozen or consumed. If you are unsure about the product's temperature history, prioritise safety.",
    },
    {
      q: "How should I reheat prepared meals, soups and stews?",
      a: "Follow any reheating instructions provided with the product. Reheat food thoroughly and evenly until it reaches a safe serving temperature. Where possible, reheat only the portion you intend to consume. Avoid repeatedly reheating and cooling the same food.",
    },
    {
      q: "How long can I keep leftover meals?",
      a: "Storage duration depends on the type of food, preparation method and refrigeration conditions. Refrigerate leftovers promptly and follow any product-specific storage and use-by instructions. If you are uncertain about the safety of stored food, do not consume it.",
    },
    {
      q: "What should I do if there is a power outage?",
      a: "Keep refrigerator and freezer doors closed as much as possible to help maintain their internal temperature. If perishable products have been exposed to unsafe temperatures for an extended period, they may no longer be suitable for consumption, even if they appear or smell normal. Do not taste food to determine whether it is still safe.",
    },
    {
      q: "Is it safe to consume a product after its expiry date?",
      a: "You should not consume products beyond their stated expiry or use-by date. Where a product carries a best-before date instead, follow the applicable product guidance. If you are uncertain about its safety or suitability, contact us for assistance.",
    },
    {
      q: "What should I do if a product has an unusual smell or appearance?",
      a: "Stop consuming the product and contact our customer support team. Where it is safe to do so, retain the packaging, product label, batch information and photographs to help us investigate. Do not taste additional quantities of the product to determine whether it is safe.",
    },
  ],
  payments: [
    {
      q: "What payment methods do you accept?",
      a: "Available payment methods are displayed during checkout through our supported payment channels. Depending on availability, these may include debit card payments, bank transfers and other supported electronic payment options.",
    },
    {
      q: "Is it safe to make payments on the Nriju website?",
      a: "We use supported payment service providers to facilitate secure online transactions. Nriju will never ask you to disclose your card PIN, banking password or one-time password through customer support channels. Only complete payments through our official and authorised payment channels.",
    },
    {
      q: "Do you accept payment on delivery?",
      a: "Available payment arrangements will be displayed during checkout. Please contact our team if you require clarification about payment options for your order.",
    },
    {
      q: "What currency are your prices displayed in?",
      a: "Our website prices are displayed in Nigerian Naira (NGN), represented by the ₦ symbol. Any applicable charges will be communicated before you complete your purchase.",
    },
    {
      q: "Are delivery charges included in product prices?",
      a: "Delivery charges are generally calculated separately from product prices unless a particular offer explicitly states otherwise. Your applicable order total will be displayed before payment.",
    },
    {
      q: "How do I use a discount or coupon code?",
      a: "Enter your valid coupon code in the designated field during checkout. If the code meets the applicable conditions, the discount will be reflected in your order total before payment.",
    },
    {
      q: "Why is my coupon code not working?",
      a: "A coupon may be unavailable because it has expired, reached its usage limit, does not apply to the selected products or requires a minimum order amount. Some coupons may also be restricted to eligible customers or specific promotional periods. Please check the conditions associated with the offer.",
    },
    {
      q: "Can I use more than one coupon on an order?",
      a: "Coupon combinations depend on the conditions of the applicable promotion. Checkout will indicate whether your selected discount can be applied.",
    },
    {
      q: "What happens if the price of a product changes after I order?",
      a: "Confirmed purchases are generally based on the prices applicable when the order was placed. Subsequent price changes do not ordinarily alter the amount paid for a confirmed order. Any exceptional pricing issue will be handled in accordance with applicable consumer protection requirements.",
    },
    {
      q: "My payment failed, but my account was debited. What should I do?",
      a: "Please avoid making repeated payments until the transaction status has been established. Contact our customer support team with your order number or payment reference and relevant transaction information. We will assist you in verifying the payment. Where appropriate, your bank or payment provider may initiate a reversal.",
    },
    {
      q: "What if I accidentally pay twice?",
      a: "Please contact us with the relevant transaction references. Once a duplicate payment has been confirmed, we will arrange the appropriate refund or assist with the payment-provider reversal process.",
    },
  ],
  returns: [
    {
      q: "Can I return a food product after delivery?",
      a: "Due to the nature of food products and the importance of maintaining food safety, change-of-mind returns are generally not accepted after delivery. However, you may be eligible for a refund, replacement or another appropriate resolution where a product is defective, unsafe, damaged, incorrect or otherwise fails to meet applicable quality standards. Please refer to our Returns, Refunds & Replacements Policy.",
    },
    {
      q: "What if I receive a damaged or incorrect product?",
      a: "Contact our customer support team with your order reference, details of the affected item and photographs where reasonably available. We will assess the issue and arrange an appropriate resolution, which may include a refund or replacement.",
    },
    {
      q: "What if an item is missing from my order?",
      a: "Please report the missing item to us, preferably within 48 hours of receiving your order. Once the issue has been confirmed, we will arrange delivery of the missing item or provide an appropriate refund.",
    },
    {
      q: "What if my food arrives cold, thawed or at an unsuitable temperature?",
      a: "Some products are intentionally supplied chilled or frozen, while others may be intended for reheating before consumption. If a product arrives at a temperature inconsistent with its intended delivery condition, or you suspect that its safety or quality has been compromised, please contact us promptly. Do not consume a product that may be unsafe.",
    },
    {
      q: "How long do I have to report a product issue?",
      a: "We recommend reporting issues with frozen, chilled and fresh foods within 24 hours of delivery and issues with dried or shelf-stable products within seven calendar days. Missing or incorrect items should preferably be reported within 48 hours. Hidden defects and food safety concerns should be reported as soon as they are discovered. These recommended timeframes do not limit your statutory consumer rights.",
    },
    {
      q: "Can I request a refund if I have already opened the product?",
      a: "Opening a product does not automatically make it ineligible for a refund. If a defect or quality concern becomes apparent only after opening, preparation or consumption, please contact our team so we can assess the circumstances.",
    },
    {
      q: "Do I need to provide an unboxing video?",
      a: "No. An unboxing video is not mandatory. Photographs, product labels, order information and other reasonably available evidence can help us investigate your complaint.",
    },
    {
      q: "Will I need to return the affected product physically?",
      a: "Not always. Certain food products may be unsuitable for return transportation due to hygiene or food safety concerns. Our team will advise whether collection, photographic evidence or another appropriate procedure is required.",
    },
    {
      q: "Who pays for return or replacement delivery?",
      a: "Nriju will cover reasonable return and replacement delivery costs where an eligible claim results from a defective product, fulfilment error or another circumstance for which Nriju is responsible. Please refer to our Returns, Refunds & Replacements Policy for further details.",
    },
    {
      q: "How long does it take to receive a refund?",
      a: "We aim to initiate approved refunds within two business days of approval. Once processed by our payment provider, funds may take approximately 3–10 business days to reflect in your account, depending on the payment method and financial institution.",
    },
    {
      q: "How will my refund be issued?",
      a: "Approved monetary refunds are ordinarily returned through the original payment method. Where this is not technically possible, we may arrange another secure and mutually agreed payment method.",
    },
    {
      q: "Can discounted or promotional products be refunded?",
      a: "Yes. Discounted products remain eligible for appropriate remedies where they are defective, damaged, unsafe or incorrectly supplied. Refunds will ordinarily reflect the actual amount paid for the affected product.",
    },
    {
      q: "What if I am not satisfied with the outcome of my complaint?",
      a: "You may contact our customer support team to request a further review. We are committed to resolving complaints fairly and transparently. You also retain your rights under applicable Nigerian consumer protection laws.",
    },
  ],
  account: [
    {
      q: "How do I create a Nriju account?",
      a: "Select the registration option on our website and provide the required information. Follow the displayed instructions to complete your account registration.",
    },
    {
      q: "What should I do if I forget my password?",
      a: "Select the Forgot Password option on the sign-in page and follow the password recovery instructions. For your security, never share your password reset code or recovery information with anyone.",
    },
    {
      q: "How do I update my personal information?",
      a: "Sign in to your account and navigate to your profile settings. You can update the personal information supported by your account, including your name and contact details.",
    },
    {
      q: "Can I save multiple delivery addresses?",
      a: "Yes. Your Nriju account allows you to manage multiple delivery addresses for convenient ordering. You can add or remove addresses and select your preferred address when placing an order.",
    },
    {
      q: "Can I save products to purchase later?",
      a: "Yes. Use the wishlist feature to save products you are interested in purchasing later. Saving a product to your wishlist does not reserve stock or guarantee its current price.",
    },
    {
      q: "Where can I view my previous orders?",
      a: "Sign in to your account and navigate to your order history to view information about your previous purchases.",
    },
    {
      q: "Can I leave a review for a product?",
      a: "Yes. Eligible customers can leave reviews for products they have purchased. Review access is available for qualifying products from completed orders. We welcome honest feedback that helps other customers make informed purchasing decisions.",
    },
    {
      q: "How is my personal information protected?",
      a: "We handle personal information in accordance with our Privacy Policy and applicable data protection requirements. Please refer to our Privacy Policy for information about how we collect, use, store and protect customer information.",
    },
    {
      q: "Can I delete my Nriju account?",
      a: "You may contact our customer support team to request account deletion or assistance with your personal information. Certain transaction records may need to be retained where required for legal, accounting or regulatory purposes.",
    },
    {
      q: "What should I do if I experience a technical problem on the website?",
      a: "Please contact us with a description of the issue, the page you were using and a screenshot where available. If the issue occurred during payment, include the relevant order or transaction reference, but never share confidential banking credentials.",
    },
  ],
  bulk: [
    {
      q: "Do you accept bulk orders?",
      a: "We welcome enquiries for larger quantities of Nriju products, including purchases for households, events, organisations and businesses. Please contact our team in advance so we can confirm availability, pricing, preparation requirements and delivery arrangements.",
    },
    {
      q: "Can I order food for an event or special occasion?",
      a: "If you are planning an event, celebration or gathering, contact our team to discuss your food requirements. We will confirm which products and fulfilment arrangements are available for your occasion.",
    },
    {
      q: "Do you offer wholesale or reseller arrangements?",
      a: "Businesses and individuals interested in wholesale purchases, distribution or resale are welcome to contact us to discuss potential arrangements. Pricing, quantities and supply terms will be determined according to the applicable business requirements.",
    },
    {
      q: "Can I request custom quantities or packaging?",
      a: "Custom quantities or packaging may be considered for qualifying bulk or business orders. Availability depends on the products involved, preparation requirements, packaging capacity and order volume.",
    },
    {
      q: "How far in advance should I place a bulk order?",
      a: "Lead times vary depending on the size of your order, product availability and preparation requirements. We recommend contacting our team as early as possible so that appropriate arrangements can be made.",
    },
    {
      q: "Do bulk orders qualify for special pricing?",
      a: "Special pricing may be available for qualifying bulk purchases, depending on the products, quantities and applicable commercial arrangements. Please contact us for a personalised quotation.",
    },
  ],
  support: [
    {
      q: "How can I contact Nriju?",
      a: "You can reach our customer support team through our official telephone, WhatsApp and website contact channels. Telephone: +234 812 847 0172. WhatsApp: +234 903 495 1027. You can also visit our Contact Us page for additional assistance.",
    },
    {
      q: "What are your customer support hours?",
      a: "Our standard customer support hours are Monday to Saturday, from 8:00 AM to 8:00 PM, West Africa Time. Operating hours may vary during public holidays and special periods. Messages received outside our operating hours will be attended to as soon as reasonably possible during the next operating period.",
    },
    {
      q: "What information should I provide when contacting customer support?",
      a: "For order-related enquiries, please provide your order number, the name associated with your purchase and a brief description of your concern. Providing relevant information helps us understand your request and resolve it more efficiently.",
    },
    {
      q: "Can I suggest a new product or provide feedback?",
      a: "Absolutely. We value your feedback and welcome suggestions about new products, recipes, packaging and ways we can improve your experience. Please contact our team through any of our official support channels.",
    },
    {
      q: "Where can I find your other policies?",
      a: "Our website provides additional information about delivery, returns and refunds, privacy and the terms that apply to your purchases. Please refer to the relevant policy pages for more comprehensive information.",
    },
  ],
};
