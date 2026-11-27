import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import api from "../../services/api";
import { clearAll, getCartItemProductId } from "../../slices/cartSlice";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { formatNaira } from "../../utils/formatMoney";
import { formatVatRate } from "../../utils/pricing";

const DELIVERY_OPTIONS = [
  {
    value: "thirdparty",
    label: "Third-party delivery",
    description: "Tracked delivery through an external logistics partner.",
    icon: Truck,
  },
  {
    value: "own",
    label: "Nriju own fleet",
    description: "Direct delivery by a Nriju courier, including fresh orders.",
    icon: PackageCheck,
  },
  {
    value: "pickup",
    label: "Pick up in store",
    description: "Choose a convenient Nriju collection point. No delivery fee.",
    icon: Store,
  },
];

const ADDRESS_FIELDS = [
  {
    key: "name",
    label: "Full name",
    autoComplete: "name",
    placeholder: "Your full name",
  },
  {
    key: "phone",
    label: "Phone number",
    autoComplete: "tel",
    placeholder: "+234",
  },
  {
    key: "line1",
    label: "Street address",
    autoComplete: "address-line1",
    placeholder: "House number and street",
  },
  {
    key: "line2",
    label: "Landmark or apartment",
    autoComplete: "address-line2",
    placeholder: "Optional",
    optional: true,
  },
  {
    key: "city",
    label: "City",
    autoComplete: "address-level2",
    placeholder: "City",
  },
  {
    key: "state",
    label: "State",
    autoComplete: "address-level1",
    placeholder: "State",
  },
];

const methodsForCart = (items) => {
  const types = new Set(items.map((item) => item.product?.productType).filter(Boolean));
  if (types.has("cooked") || types.has("fresh") || !types.size) return ["own", "pickup"];
  return ["own", "thirdparty", "pickup"];
};

const Stepper = ({ current }) => {
  const steps = ["Delivery", "Payment", "Confirmation"];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Checkout progress">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = number === current;
        const complete = number < current;
        return (
          <li key={label} className="min-w-0">
            <div
              className={`h-1 rounded-full ${active || complete ? "bg-primary" : "bg-border-soft"}`}
            />
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active || complete
                    ? "bg-primary text-on-accent"
                    : "bg-background-soft text-text-muted"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : number}
              </span>
              <span
                className={`truncate text-xs font-semibold sm:text-sm ${
                  active ? "text-text" : "text-text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const OrderSummary = ({
  quote,
  itemCount,
  couponDraft,
  setCouponDraft,
  appliedCoupon,
  onApplyCoupon,
  couponPending,
  couponError,
  quotePending,
}) => (
  <aside className="rounded-card border border-border-soft bg-surface p-5 shadow-soft sm:p-6 lg:sticky lg:top-24">
    <h2 className="font-heading text-xl font-bold text-text">Order summary</h2>
    <dl className="mt-5 space-y-3 border-t border-border-soft pt-5 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-text-secondary">Subtotal ({itemCount} items)</dt>
        <dd className="font-semibold tabular-nums text-text">
          {quote ? formatNaira(quote.subtotal) : "—"}
        </dd>
      </div>
      {quote?.discount > 0 ? (
        <div className="flex justify-between gap-4 text-success">
          <dt>Coupon discount</dt>
          <dd className="font-semibold tabular-nums">−{formatNaira(quote.discount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-4">
        <dt className="text-text-secondary">
          VAT {quote ? `(${formatVatRate(quote.vatRateBasisPoints)}%)` : ""}
        </dt>
        <dd className="font-medium tabular-nums text-text">
          {quote ? formatNaira(quote.vatAmount) : "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-text-secondary">Delivery</dt>
        <dd className="font-medium tabular-nums text-text">
          {quote ? (quote.deliveryFee === 0 ? "Free" : formatNaira(quote.deliveryFee)) : "—"}
        </dd>
      </div>
    </dl>

    <form className="mt-5 border-t border-border-soft pt-5" onSubmit={onApplyCoupon}>
      <label
        htmlFor="checkout-coupon"
        className="flex items-center gap-2 text-sm font-semibold text-text"
      >
        <Tag className="h-4 w-4 text-primary" aria-hidden="true" /> Coupon code
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="checkout-coupon"
          value={couponDraft}
          onChange={(event) => setCouponDraft(event.target.value.toUpperCase())}
          placeholder="Enter code"
          className="min-h-11 min-w-0 flex-1 rounded-button border border-border bg-background px-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="submit"
          disabled={couponPending || !couponDraft.trim()}
          className="min-h-11 rounded-button bg-primary px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {couponPending ? "Checking" : "Apply"}
        </button>
      </div>
      {appliedCoupon ? (
        <p className="mt-2 text-xs font-medium text-success">{appliedCoupon} applied.</p>
      ) : null}
      {couponError ? (
        <p className="mt-2 text-xs text-error" role="alert">
          {couponError}
        </p>
      ) : null}
    </form>

    <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-border-soft pt-5">
      <span className="font-heading text-lg font-bold text-text">Total</span>
      <span className="font-heading text-2xl font-bold tabular-nums text-text">
        {quotePending ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Updating total" />
        ) : quote ? (
          formatNaira(quote.total)
        ) : (
          "—"
        )}
      </span>
    </div>

    <ul className="mt-6 space-y-2 border-t border-border-soft pt-5 text-xs leading-5 text-text-secondary">
      <li className="flex gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Server-verified prices, VAT, delivery and coupon totals.
      </li>
      <li className="flex gap-2">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Online payments continue securely through Paystack.
      </li>
    </ul>
  </aside>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);
  const availableMethods = useMemo(() => methodsForCart(items), [items]);
  const [step, setStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState(() =>
    availableMethods.includes("thirdparty") ? "thirdparty" : "own",
  );
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [formError, setFormError] = useState("");

  const savedAddress = user?.addresses?.find((entry) => entry.isDefault) || user?.addresses?.[0];
  const [address, setAddress] = useState({
    name: savedAddress?.name || user?.name || "",
    phone: savedAddress?.phone || user?.phone || "",
    line1: savedAddress?.line1 || "",
    line2: savedAddress?.line2 || "",
    city: savedAddress?.city || "",
    state: savedAddress?.state || "",
  });

  const orderItems = useMemo(
    () =>
      items.map((item) => ({
        productId: getCartItemProductId(item),
        quantity: item.quantity,
      })),
    [items],
  );
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const quotePayload = useMemo(
    () => ({
      items: orderItems,
      deliveryMethod,
      ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      ...(deliveryMethod === "pickup" && pickupLocationId ? { pickupLocationId } : {}),
    }),
    [appliedCoupon, deliveryMethod, orderItems, pickupLocationId],
  );

  const pickupQuery = useQuery({
    queryKey: ["pickup-locations", "active"],
    queryFn: async () => (await api.get("/pickup-locations")).data.data || [],
  });
  const quoteQuery = useQuery({
    queryKey: ["checkout-quote", quotePayload],
    queryFn: async () =>
      (
        await api.post("/checkout/quote", quotePayload, {
          skipGlobalErrorToast: true,
        })
      ).data.data,
    enabled: items.length > 0 && (deliveryMethod !== "pickup" || Boolean(pickupLocationId)),
    retry: false,
  });
  const quote = quoteQuery.data;

  const couponMutation = useMutation({
    mutationFn: async (code) =>
      (
        await api.post(
          "/checkout/quote",
          { ...quotePayload, couponCode: code },
          { skipGlobalErrorToast: true },
        )
      ).data.data,
    onSuccess: (_data, code) => {
      setAppliedCoupon(code);
      setCouponError("");
    },
    onError: (error) => {
      setCouponError(error?.response?.data?.message || "That coupon could not be applied.");
    },
  });

  const createOrder = useMutation({
    mutationFn: (payload) => api.post("/orders", payload),
  });
  const initializePayment = useMutation({
    mutationFn: (orderId) =>
      api.post("/payments/initialize", {
        orderId,
        callbackUrl: `${window.location.origin}/checkout/result`,
      }),
  });

  const chooseDelivery = (method) => {
    if (!availableMethods.includes(method)) return;
    setDeliveryMethod(method);
    setFormError("");
    if (method === "thirdparty" && paymentMethod !== "paystack") setPaymentMethod("paystack");
  };

  const continueToPayment = () => {
    if (deliveryMethod === "pickup" && !pickupLocationId) {
      setFormError("Choose a pickup point to continue.");
      return;
    }
    if (deliveryMethod !== "pickup") {
      const missing = ADDRESS_FIELDS.filter(
        (field) => !field.optional && !address[field.key].trim(),
      );
      if (missing.length) {
        setFormError("Complete all required shipping address fields.");
        return;
      }
    }
    if (!quote || quoteQuery.isError) {
      setFormError(
        quoteQuery.error?.response?.data?.message || "We could not confirm this delivery option.",
      );
      return;
    }
    setFormError("");
    setStep(2);
  };

  const handleApplyCoupon = (event) => {
    event.preventDefault();
    const code = couponDraft.trim().toUpperCase();
    if (code) couponMutation.mutate(code);
  };

  const handlePlaceOrder = async () => {
    if (!quote) return;
    setFormError("");
    try {
      const selectedPayment =
        paymentMethod === "offline"
          ? deliveryMethod === "pickup"
            ? "pay_at_pickup"
            : "pay_on_delivery"
          : "paystack";
      const response = await createOrder.mutateAsync({
        items: orderItems,
        deliveryMethod,
        paymentMethod: selectedPayment,
        shippingAddress: address,
        ...(pickupLocationId ? { pickupLocationId } : {}),
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      });
      const order = response.data.data;

      if (selectedPayment === "paystack") {
        const payment = await initializePayment.mutateAsync(order._id);
        sessionStorage.setItem(
          "nriju:pending-payment",
          JSON.stringify({
            orderId: order._id,
            reference: payment.data.data.reference,
            createdAt: Date.now(),
          }),
        );
        window.location.assign(payment.data.data.authorization_url);
        return;
      }

      dispatch(clearAll());
      navigate(`/checkout/result?order=${order._id}&mode=offline`, {
        replace: true,
      });
    } catch (error) {
      setFormError(
        error?.response?.data?.message || "We could not place your order. Please try again.",
      );
    }
  };

  if (!items.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-3xl font-bold text-text">Your cart is empty</h1>
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="mt-6 rounded-button bg-primary px-6 py-3 font-semibold text-on-accent"
          >
            Return to the shop
          </button>
        </div>
      </main>
    );
  }

  const pickupLocations = pickupQuery.data || [];
  const offlineAllowed =
    quote?.payOnDelivery?.enabled && ["own", "pickup"].includes(deliveryMethod);
  const busy = createOrder.isPending || initializePayment.isPending;

  return (
    <main className="min-h-screen bg-background-soft px-3 py-6 sm:px-4 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Secure checkout
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Complete your order
          </h1>
          <div className="mx-auto mt-6 max-w-2xl">
            <Stepper current={step} />
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.8fr)] lg:items-start xl:gap-12">
          <section>
            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-text">
                    How should we fulfil your order?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Availability follows the most time-sensitive product in your cart.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {DELIVERY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = deliveryMethod === option.value;
                    const disabled =
                      !availableMethods.includes(option.value) ||
                      (option.value === "pickup" &&
                        pickupQuery.isSuccess &&
                        !pickupLocations.length);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => chooseDelivery(option.value)}
                        className={`min-h-40 rounded-card border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          selected
                            ? "border-primary bg-accent-soft"
                            : "border-border-soft bg-surface hover:border-primary/40"
                        } disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            selected
                              ? "bg-primary text-on-accent"
                              : "bg-background-soft text-primary"
                          }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="mt-4 block font-heading text-base font-bold text-text">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-text-secondary">
                          {disabled && option.value !== "pickup"
                            ? "Unavailable for fresh items in this cart."
                            : option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {deliveryMethod === "pickup" ? (
                  <div className="h-(--checkout-panel-height) overflow-hidden rounded-card border border-border-soft bg-surface shadow-soft">
                    <div className="border-b border-border-soft p-5">
                      <h3 className="font-heading text-xl font-bold text-text">
                        Choose a pickup point
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        The list scrolls independently when more locations are added.
                      </p>
                    </div>
                    <div className="h-[calc(var(--checkout-panel-height)-6.5rem)] space-y-3 overflow-y-auto p-4 sm:p-5">
                      {pickupQuery.isPending ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : null}
                      {pickupQuery.isSuccess && !pickupLocations.length ? (
                        <div className="flex h-full items-center justify-center text-center text-sm text-text-secondary">
                          No pickup points are available right now.
                        </div>
                      ) : null}
                      {pickupLocations.map((location) => {
                        const selected = pickupLocationId === location._id;
                        return (
                          <button
                            key={location._id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setPickupLocationId(location._id)}
                            className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                              selected
                                ? "border-primary bg-accent-soft"
                                : "border-border-soft bg-background hover:border-primary/40"
                            }`}
                          >
                            <span className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                  selected ? "bg-primary text-on-accent" : "bg-surface text-primary"
                                }`}
                              >
                                <MapPin className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-3">
                                  <strong className="text-sm text-text">{location.name}</strong>
                                  {selected ? (
                                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                                  ) : null}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-text-secondary">
                                  {location.addressLine}, {location.city}, {location.state}
                                </span>
                                {location.openingHours ? (
                                  <span className="mt-2 block text-xs font-medium text-text">
                                    {location.openingHours}
                                  </span>
                                ) : null}
                                {location.instructions ? (
                                  <span className="mt-1 block text-xs text-text-muted">
                                    {location.instructions}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-(--checkout-panel-height) overflow-y-auto rounded-card border border-border-soft bg-surface p-5 shadow-soft sm:p-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                        <Building2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-heading text-xl font-bold text-text">
                          Shipping address
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Used for delivery and courier contact.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {ADDRESS_FIELDS.map((field) => (
                        <div
                          key={field.key}
                          className={
                            field.key === "line1" || field.key === "line2" ? "sm:col-span-2" : ""
                          }
                        >
                          <label
                            htmlFor={`address-${field.key}`}
                            className="text-sm font-semibold text-text"
                          >
                            {field.label}
                            {field.optional ? "" : " *"}
                          </label>
                          <input
                            id={`address-${field.key}`}
                            value={address[field.key]}
                            autoComplete={field.autoComplete}
                            onChange={(event) =>
                              setAddress((current) => ({
                                ...current,
                                [field.key]: event.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                            className="mt-2 min-h-11 w-full rounded-button border border-border bg-background px-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formError || quoteQuery.isError ? (
                  <p
                    className="rounded-xl border border-error-border bg-error-soft p-3 text-sm text-error"
                    role="alert"
                  >
                    {formError || quoteQuery.error?.response?.data?.message}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={continueToPayment}
                    disabled={quoteQuery.isPending}
                    className="inline-flex min-h-12 items-center gap-2 rounded-button bg-primary px-6 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Continue to payment <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-text">Choose how to pay</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Your delivery details are saved for this order. Select one payment route below.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "paystack"}
                    onClick={() => setPaymentMethod("paystack")}
                    className={`w-full rounded-card border p-5 text-left transition-colors ${
                      paymentMethod === "paystack"
                        ? "border-primary bg-accent-soft"
                        : "border-border-soft bg-surface hover:border-primary/40"
                    }`}
                  >
                    <span className="flex items-start gap-4">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          paymentMethod === "paystack"
                            ? "bg-primary text-on-accent"
                            : "bg-background-soft text-primary"
                        }`}
                      >
                        <CreditCard className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span>
                        <strong className="font-heading text-base text-text">
                          Pay securely with Paystack
                        </strong>
                        <span className="mt-1 block text-sm leading-6 text-text-secondary">
                          Paystack will show every channel enabled for this account, including card,
                          bank, transfer, USSD, QR, mobile money and Apple Pay where supported.
                        </span>
                        <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                          <Landmark className="h-4 w-4" aria-hidden="true" /> Hosted and verified by
                          Paystack
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!offlineAllowed}
                    aria-pressed={paymentMethod === "offline"}
                    onClick={() => setPaymentMethod("offline")}
                    className={`w-full rounded-card border p-5 text-left transition-colors ${
                      paymentMethod === "offline"
                        ? "border-primary bg-accent-soft"
                        : "border-border-soft bg-surface hover:border-primary/40"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="flex items-start gap-4">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          paymentMethod === "offline"
                            ? "bg-primary text-on-accent"
                            : "bg-background-soft text-primary"
                        }`}
                      >
                        <Banknote className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span>
                        <strong className="font-heading text-base text-text">
                          {deliveryMethod === "pickup" ? "Pay at pickup" : "Payment on delivery"}
                        </strong>
                        <span className="mt-1 block text-sm leading-6 text-text-secondary">
                          {offlineAllowed
                            ? "Pay the exact order total by cash, POS or transfer. For delivery, share the six-digit handoff code only after payment and receipt of the order."
                            : "This option is unavailable for the selected delivery method or order value."}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>

                <div className="rounded-card border border-border-soft bg-surface p-5">
                  <h3 className="font-heading font-bold text-text">Fulfilment details</h3>
                  <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-text-muted">Method</p>
                      <p className="mt-1 font-semibold text-text">
                        {DELIVERY_OPTIONS.find((option) => option.value === deliveryMethod)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Estimated window</p>
                      <p className="mt-1 font-semibold text-text">
                        {quote?.eta || "Confirmed after order placement"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-text-muted">Destination</p>
                      <p className="mt-1 font-semibold text-text">
                        {deliveryMethod === "pickup"
                          ? pickupLocations.find((location) => location._id === pickupLocationId)
                              ?.name
                          : `${address.line1}, ${address.city}, ${address.state}`}
                      </p>
                    </div>
                  </div>
                </div>

                {formError ? (
                  <p
                    className="rounded-xl border border-error-border bg-error-soft p-3 text-sm text-error"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button border border-border bg-surface px-5 font-semibold text-text hover:border-primary/40"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={busy || !quote || (paymentMethod === "offline" && !offlineAllowed)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-6 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing
                      </>
                    ) : paymentMethod === "paystack" ? (
                      <>
                        Continue to Paystack <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Place order <Check className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          <OrderSummary
            quote={quote}
            itemCount={itemCount}
            couponDraft={couponDraft}
            setCouponDraft={setCouponDraft}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={handleApplyCoupon}
            couponPending={couponMutation.isPending}
            couponError={couponError}
            quotePending={quoteQuery.isPending}
          />
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
