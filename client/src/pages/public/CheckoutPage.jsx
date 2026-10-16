import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../store/store";
import { clearLocal } from "../slices/cartSlice";
import api from "../services/api";
import { formatNaira, toKobo } from "../utils/formatMoney";
import {
  MapPin,
  Phone,
  Truck,
  Package,
  CreditCard,
  Wallet,
  Landmark,
  ArrowRight,
  ArrowLeft,
  Tag,
  ShoppingBag,
  Check,
} from "lucide-react";

const DELIVERY_FEE_KOBO = 150000; // ₦1,500 default (mirrors Backend createOrder)

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((s) => s.auth);

  // If the cart is empty but the user lands here directly, send them shopping.
  useEffect(() => {
    if (!items.length) navigate("/cart", { replace: true });
  }, [items, navigate]);

  // ── Form state across steps ─────────────────────────────────────
  const [step, setStep] = useState(1);

  // Pre-fill from the user's saved profile address when one exists, so
  // the customer doesn't have to retype it at checkout.
  const savedAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
  const [address, setAddress] = useState({
    name: savedAddress?.name || user?.name || "",
    phone: savedAddress?.phone || user?.phone || "",
    line1: savedAddress?.line1 || "",
    line2: savedAddress?.line2 || "",
    city: savedAddress?.city || "",
    state: savedAddress?.state || "",
  });
  const [deliveryMethod, setDeliveryMethod] = useState("thirdparty");
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountKobo, setDiscountKobo] = useState(0);
  const [couponError, setCouponError] = useState("");

  // ── Derived totals (items carry kobo prices from ProductCard) ──
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = deliveryMethod === "pickup" ? 0 : DELIVERY_FEE_KOBO;
  const total = subtotal - discountKobo + deliveryFee;

  // ── Coupon validation ───────────────────────────────────────────
  const couponMutation = useMutation({
    mutationFn: (code) =>
      api.post("/coupons/validate", {
        code,
        subtotal,
        items: items.map((i) => ({ productId: i.product, categoryId: i.categoryId })),
      }),
  });

  const handleValidateCoupon = async (e) => {
    e.preventDefault();
    setCouponError("");
    setAppliedCoupon(null);
    setDiscountKobo(0);

    if (!couponCode.trim()) return;

    try {
      const res = await couponMutation.promiseMutate(couponCode);
      console.log("coupon valid", res);
      setAppliedCoupon({ code: couponCode, ...res.data });
    } catch (err) {
      setCouponError(
        err?.response?.data?.message ||
          "Could not apply that coupon. Check the code and try again.",
      );
    }
  };

  // ── Order creation + Paystack redirect ─────────────────────────
  const { mutateAsync: createOrder, isPending: placingOrder } = useMutation({
    mutationFn: (payload) => api.post("/orders", payload),
  });

  const initializePayment = useMutation({
    mutationFn: (orderId) => api.post("/payments/initialize", { orderId }),
  });

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    try {
      const orderPayload = {
        items: items.map((i) => ({
          productId: i.product,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        deliveryMethod,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        paymentMethod,
      };

      const orderRes = await createOrder(orderPayload);
      const order = orderRes.data.data;

      // Pay on the Paystack flow; capture/cash just clear the cart.
      if (paymentMethod === "paystack") {
        const payRes = await initializePayment.mutateAsync(order._id);
        const payData = payRes?.data?.data || {};
        const authUrl = payData.authorization_url;
        if (authUrl) {
          // Persist the Paystack reference (not the order number) so the
          // callback page can look up and verify the payment.
          sessionStorage.setItem("nriju_paystack_ref", payData.reference);
          // Send the user through Paystack, with our callback as the
          // redirect target so the SPA can verify the payment on return.
          const url = new URL(authUrl);
          url.searchParams.set("redirect_url", `${window.location.origin}/checkout/success`);
          window.location.href = url.toString();
          return;
        }
      }

      // Non-card flow: just clear the cart and thank the user.
      dispatch(clearLocal());
      sessionStorage.setItem("nriju_order_ref", order.orderNumber || order._id);
      navigate("/checkout/success");
    } catch (err) {
      console.error("order failed", err);
    }
  };

  if (!items.length) return null; // guarded by the useEffect above

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      {/* ── Progress dots ────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            disabled={!items.length}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === s
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-muted"
            }`}
            type="button"
          >
            {s === 3 && placingOrder ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              s
            )}
          </button>
        ))}
      </div>

      <form onSubmit={step === 3 ? handlePlaceOrder : undefined}>
        {/* ── Step 1: Contact + address ───────────────────────── */}
        {step === 1 && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-5">
              <h2 className="font-heading text-xl font-bold text-text flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Delivery Address
              </h2>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="123 Freedom Way"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Additional info (optional)
                </label>
                <input
                  type="text"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="Landmark, floor, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">City *</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">State *</label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Order summary sticky on desktop */}
            <div>
              <OrderSummary
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                discountKobo={discountKobo}
                total={total}
                deliveryMethod={deliveryMethod}
                setDeliveryMethod={setDeliveryMethod}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Delivery + Payment ────────────────────────── */}
        {step === 2 && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold text-text flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Delivery Method
              </h2>

              <div className="space-y-3">
                {[
                  {
                    value: "thirdparty",
                    label: "Third-party delivery",
                    desc: "3–4 working days. ₦1,500 fee.",
                    icon: Truck,
                  },
                  {
                    value: "own",
                    label: "Nriju own fleet",
                    desc: "Same-day delivery for cooked items. ₦1,500 fee.",
                    icon: Truck,
                  },
                  {
                    value: "pickup",
                    label: "Pick up in store",
                    desc: "Collect from Lagos kitchen. Free.",
                    icon: Package,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <label
                      key={m.value}
                      className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                        deliveryMethod === m.value
                          ? "border-primary bg-primary/5"
                          : "border-border bg-surface hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={m.value}
                        checked={deliveryMethod === m.value}
                        onChange={() => setDeliveryMethod(m.value)}
                        className="mt-1"
                      />
                      <Icon className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-text">{m.label}</p>
                        <p className="text-sm text-text-muted">{m.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-6">
                <h2 className="font-heading text-xl font-bold text-text flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Payment Method
                </h2>

                <div className="space-y-3 mt-4">
                  <label className="flex items-center gap-4 p-4 border border-border rounded-xl cursor-pointer peer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paystack"
                      checked={paymentMethod === "paystack"}
                      onChange={() => setPaymentMethod("paystack")}
                      className="mt-1"
                    />
                    <Landmark className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-text">Card / Bank Transfer</p>
                      <p className="text-sm text-text-muted">
                        Secure payment via Paystack (Visa, Mastercard, Verve, bank transfer).
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-4 p-4 border border-border rounded-xl cursor-pointer peer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      className="mt-1"
                    />
                    <Wallet className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-text">Cash on Delivery / Pickup</p>
                      <p className="text-sm text-text-muted">
                        Pay cash when you receive your order.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <OrderSummary
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discountKobo={discountKobo}
              total={total}
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
            />
          </div>
        )}

        {/* ── Step 3: Review + Coupon ───────────────────────────── */}
        {step === 3 && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              {/* Address summary */}
              <div className="p-5 bg-surface border border-border rounded-xl">
                <h3 className="font-heading font-semibold text-text mb-3">Delivery to</h3>
                <p className="font-medium text-text">{address.name}</p>
                <p className="text-sm text-text-muted mt-1">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                  <br />
                  {address.city}, {address.state}
                  <br />
                  {address.phone}
                </p>
              </div>

              {/* Payment summary */}
              <div className="p-5 bg-surface border border-border rounded-xl">
                <h3 className="font-heading font-semibold text-text mb-3">Payment</h3>
                <p className="text-sm text-text-muted">
                  {paymentMethod === "paystack" ? "Pay via Paystack" : "Cash on delivery/pickup"} ·{" "}
                  {paymentMethod === "cash" ? "Pay in person" : "Secure card & bank transfer"}
                </p>
              </div>

              {/* Coupon */}
              <div className="p-5 bg-surface border border-border rounded-xl">
                <h3 className="font-heading font-semibold text-text mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Coupon
                </h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-sm font-medium text-emerald-800">
                      {appliedCoupon.code} applied — −{formatNaira(discountKobo)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setDiscountKobo(0);
                        setCouponCode("");
                      }}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleValidateCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                      />
                      <button
                        type="submit"
                        disabled={!couponCode || couponMutation.isPending}
                        className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/95 disabled:opacity-60 transition-colors"
                      >
                        Apply
                      </button>
                    </form>
                    {couponError && <p className="mt-2 text-xs text-rose-600">{couponError}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Order summary */}
            <OrderSummary
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discountKobo={discountKobo}
              total={total}
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
              hideDeliverySelector
            />
          </div>
        )}

        {/* ── Step navigation ─────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-5 py-2.5 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-surface disabled:opacity-40 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2 hover:bg-primary/95 transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={placingOrder}
              className="px-8 py-3 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-60 transition-colors"
            >
              {placingOrder ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Placing order...
                </>
              ) : (
                <>
                  <Check className="w-5 h-4" />
                  Place Order — {formatNaira(total)}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// ── Shared order summary sidebar ────────────────────────────────
const OrderSummary = ({
  subtotal,
  deliveryFee,
  discountKobo,
  total,
  deliveryMethod,
  setDeliveryMethod,
  hideDeliverySelector,
}) => {
  const { items } = useAppSelector((s) => s.cart);

  return (
    <div className="bg-surface border border-border rounded-xl p-6 sticky top-24">
      <h3 className="font-heading font-semibold text-text mb-4 flex items-center gap-2">
        <ShoppingBag className="w-4 h-4" /> Order Summary
      </h3>

      <div className="space-y-2 text-sm mb-4">
        {items.map((i) => (
          <div key={i.product} className="flex justify-between">
            <span className="text-text-muted truncate max-w-45">
              {i.name} × {i.quantity}
            </span>
            <span className="font-medium text-text">{formatNaira(i.price * i.quantity)}</span>
          </div>
        ))}
      </div>

      {!hideDeliverySelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-1.5">
            Delivery Method (quick switch)
          </label>
          <select
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="thirdparty">Third-party delivery (+₦1,500)</option>
            <option value="own">Nriju own fleet (+₦1,500)</option>
            <option value="pickup">Pickup (free)</option>
          </select>
        </div>
      )}

      <div className="border-t border-border pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Subtotal</span>
          <span className="font-medium text-text">{formatNaira(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Delivery</span>
          <span className="font-medium text-text">{formatNaira(deliveryFee)}</span>
        </div>
        {discountKobo > 0 && (
          <div className="flex justify-between">
            <span className="text-text-muted">Discount</span>
            <span className="font-medium text-emerald-600">−{formatNaira(discountKobo)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 mt-2 font-heading font-bold">
          <span>Total</span>
          <span className="text-text">{formatNaira(subtotal - discountKobo + deliveryFee)}</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
