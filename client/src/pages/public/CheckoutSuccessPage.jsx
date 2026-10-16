import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAppDispatch } from "../../store/store";
import { clearLocal } from "../../slices/cartSlice";
import api from "../../services/api";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ShoppingBag,
  MapPin,
  Truck,
  Calendar,
  FileText,
} from "lucide-react";

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const paystackRef = searchParams.get("reference");
  const orderRef = sessionStorage.getItem("nriju_order_ref");
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // "verifying" | "success" | "failed" | "error"

  // Paystack redirects the browser back here after checkout with a
  // `reference` query param. Verify the payment server-side so the
  // order isn't left "pending" — without this the payment is never
  // confirmed and the success screen shows a phantom order.
  const verify = useMutation({
    mutationFn: (ref) => api.post(`/payments/verify/${ref}`),
  });

  useEffect(() => {
    if (!paystackRef) return;
    let alive = true;
    setPaymentStatus("verifying");
    verify.mutateAsync(paystackRef, {
      onSuccess: (res) => {
        if (!alive) return;
        const status = res?.data?.data?.status;
        if (status === "success") {
          dispatch(clearLocal());
          sessionStorage.removeItem("nriju_order_ref");
          setPaymentStatus("success");
        } else {
          setPaymentStatus("failed");
        }
      },
      onError: () => {
        if (!alive) setPaymentStatus("error");
      },
    });
    return () => {
      alive = false;
    };
  }, [paystackRef, dispatch, verify]);

  // If we have a reference, try to look up the order details.
  // Otherwise fall back to a generic confirmation screen.
  const { data } = useQuery({
    queryKey: ["order", orderRef],
    queryFn: async () => {
      if (!orderRef) return null;
      // orderRef is the orderNumber (NRJ-...) or the _id — the public
      // route is GET /orders/:id, so we try a fetch only when it looks
      // like an ObjectId; otherwise we leave it as a reference string.
      if (orderRef.length === 24) {
        const res = await api.get(`/orders/${orderRef}`);
        return res.data.data;
      }
      return null;
    },
    enabled: !!orderRef,
  });

  useEffect(() => {
    if (data) setOrder(data);
  }, [data]);

  // Clear the reference so a page refresh doesn't re-fire the lookup.
  useEffect(() => {
    return () => sessionStorage.removeItem("nriju_order_ref");
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl">
      {paymentStatus === "verifying" && (
        <div className="text-center mb-10">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text mb-2">
            Confirming your payment…
          </h1>
          <p className="text-text-muted text-lg">
            Verifying with Paystack. This only takes a moment.
          </p>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-rose-500" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text mb-2">
            Payment didn't go through
          </h1>
          <p className="text-text-muted text-lg">
            No charge was made. Your order is still saved — try again.
          </p>
          <Link
            to="/checkout"
            className="inline-block mt-4 px-6 py-3 bg-primary text-white font-medium rounded-lg"
          >
            Back to checkout
          </Link>
        </div>
      )}

      {paymentStatus === "error" && (
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text mb-2">
            Something went wrong
          </h1>
          <p className="text-text-muted text-lg">
            We couldn't verify that payment. Contact us at{" "}
            <a href="mailto:orders@nriju.com" className="text-primary hover:underline">
              orders@nriju.com
            </a>
            .
          </p>
        </div>
      )}

      {(!paymentStatus || paymentStatus === "success") && (
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text mb-2">
            Order Confirmed
          </h1>
          <p className="text-text-muted text-lg">
            Thank you for your order. We're getting it ready now.
          </p>
        </div>
      )}

      {/* Order reference */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-text-muted">Order reference</p>
              <p className="font-heading font-bold text-xl text-primary">{orderRef || "N/A"}</p>
            </div>
          </div>
          <Link to="/account/orders" className="text-sm font-medium text-primary hover:underline">
            View in account →
          </Link>
        </div>
      </div>

      {/* Order details (if fetched) */}
      {order && (
        <div className="space-y-6 mb-8">
          {/* Items */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-text mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" /> What's in your order
            </h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center">
                      <span className="text-2xl">🍲</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text">{item.name}</p>
                    <p className="text-sm text-text-muted">
                      {item.quantity} × ₦{(item.price / 100).toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="text-right font-medium text-text">
                    ₦{((item.price * item.quantity) / 100).toLocaleString("en-NG")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery info */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-text mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Delivery Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Address</p>
                <p className="text-text font-medium mt-1">
                  {order.shippingAddress?.name}, {order.shippingAddress?.line1},{" "}
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Delivery method</p>
                <p className="text-text font-medium mt-1 capitalize">{order.deliveryMethod}</p>
              </div>
              <div>
                <p className="text-text-muted">Total</p>
                <p className="text-text font-heading font-bold text-lg mt-1">
                  ₦{(order.total / 100).toLocaleString("en-NG")}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Estimated arrival</p>
                <p className="text-text font-medium mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  {order.deliveryMethod === "pickup" ? "Same day (pickup)" : "Within 24 hours"}
                </p>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="bg-background border border-border rounded-xl p-6 text-center">
            <p className="text-text-muted text-sm mb-4">
              Questions? Email us at{" "}
              <a href="mailto:orders@nriju.com" className="text-primary hover:underline">
                orders@nriju.com
              </a>{" "}
              or call +234 800 000 0000.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/95 transition-colors inline-flex items-center gap-2"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {!orderRef && (
        <div className="bg-surface border border-border rounded-xl p-6 text-center mb-8">
          <p className="text-text-muted">
            Your order is being processed. Check your email for a confirmation and tracking updates.
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckoutSuccessPage;
