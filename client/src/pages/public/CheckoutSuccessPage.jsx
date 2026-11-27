import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  PackageCheck,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import api from "../../services/api";
import { clearAll } from "../../slices/cartSlice";
import { useAppDispatch } from "../../store/store";
import { formatNaira } from "../../utils/formatMoney";

const CheckoutSuccessPage = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  let pendingPayment = null;
  try {
    const stored = JSON.parse(sessionStorage.getItem("nriju:pending-payment") || "null");
    if (stored?.createdAt > Date.now() - 60 * 60 * 1000) pendingPayment = stored;
  } catch {
    sessionStorage.removeItem("nriju:pending-payment");
  }
  const reference =
    searchParams.get("reference") || searchParams.get("trxref") || pendingPayment?.reference;
  const orderId = searchParams.get("order") || pendingPayment?.orderId;
  const offline = searchParams.get("mode") === "offline";

  const verification = useQuery({
    queryKey: ["payment-verification", reference],
    queryFn: async () => (await api.post(`/payments/verify/${reference}`)).data.data,
    enabled: Boolean(reference),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => (await api.get(`/orders/${orderId}`)).data.data,
    enabled: Boolean(orderId),
    retry: false,
  });

  const order = verification.data?.order || orderQuery.data;
  const success = offline ? orderQuery.isSuccess : verification.data?.status === "success";
  const failed = offline ? orderQuery.isError : verification.isError;
  const pending = offline ? orderQuery.isPending : verification.isPending;

  useEffect(() => {
    if (success) {
      dispatch(clearAll());
      sessionStorage.removeItem("nriju:pending-payment");
    }
  }, [dispatch, success]);

  if (!offline && !reference) {
    return (
      <ResultShell>
        <ResultIcon tone="error">
          <CircleAlert className="h-8 w-8" />
        </ResultIcon>
        <h1 className="mt-5 font-heading text-3xl font-bold text-text">
          Payment reference missing
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-text-secondary">
          We cannot confirm a payment from this link. Check your orders before trying again.
        </p>
        <ResultActions />
      </ResultShell>
    );
  }

  if (pending) {
    return (
      <ResultShell>
        <ResultIcon>
          <Loader2 className="h-8 w-8 animate-spin" />
        </ResultIcon>
        <h1 className="mt-5 font-heading text-3xl font-bold text-text">
          {offline ? "Loading your order" : "Confirming your payment"}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Keep this page open while we check the final order status.
        </p>
      </ResultShell>
    );
  }

  if (failed) {
    const message =
      verification.error?.response?.data?.message ||
      orderQuery.error?.response?.data?.message ||
      "We could not confirm this order.";
    return (
      <ResultShell>
        <ResultIcon tone="error">
          <CircleAlert className="h-8 w-8" />
        </ResultIcon>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-error">
          Not confirmed
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text">
          Your checkout needs attention
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-text-secondary">{message}</p>
        <div className="mt-6 rounded-xl border border-border-soft bg-background-soft p-4 text-left text-sm text-text-secondary">
          Check your bank before retrying. If you were charged, the Paystack webhook can still
          confirm the order; your account order history is the source of truth.
        </div>
        <ResultActions retry />
      </ResultShell>
    );
  }

  return (
    <ResultShell>
      <ResultIcon tone="success">
        <CheckCircle2 className="h-8 w-8" />
      </ResultIcon>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
        Order received
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-text sm:text-4xl">
        {offline ? "Your order is confirmed" : "Payment confirmed"}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
        {offline
          ? "We will prepare your order. Payment will be collected at handoff using the method you selected."
          : "Your payment was verified and the order is ready to move into fulfilment."}
      </p>

      {order ? (
        <div className="mt-8 w-full rounded-card border border-border-soft bg-surface p-5 text-left shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-soft pb-5">
            <div>
              <p className="text-xs text-text-muted">Order reference</p>
              <p className="mt-1 font-heading text-xl font-bold text-text">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Total</p>
              <p className="mt-1 font-heading text-xl font-bold tabular-nums text-text">
                {formatNaira(order.total)}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <StatusDetail
              icon={PackageCheck}
              label="Status"
              value={String(order.status).replaceAll("_", " ")}
            />
            <StatusDetail
              icon={ReceiptText}
              label="Payment"
              value={String(order.paymentStatus).replaceAll("_", " ")}
            />
            <StatusDetail
              icon={Clock3}
              label="Fulfilment"
              value={
                order.deliveryMethod === "pickup"
                  ? "Store pickup"
                  : order.deliveryMethod === "own"
                    ? "Nriju own fleet"
                    : "Third-party delivery"
              }
            />
          </div>
          {offline && order.paymentMethod === "pay_on_delivery" ? (
            <div className="mt-5 rounded-xl bg-accent-soft p-4 text-sm leading-6 text-text-secondary">
              The handoff code is generated by Nriju when your assigned courier starts the trip. It
              appears in your order details. Share it only after you receive the order and complete
              payment.
            </div>
          ) : null}
        </div>
      ) : null}

      <ResultActions />
    </ResultShell>
  );
};

const ResultShell = ({ children }) => (
  <main className="flex min-h-screen items-center justify-center bg-background-soft px-4 py-12">
    <section className="flex w-full max-w-2xl flex-col items-center rounded-card border border-border-soft bg-background p-6 text-center shadow-soft sm:p-10">
      {children}
    </section>
  </main>
);

const ResultIcon = ({ children, tone = "primary" }) => {
  const styles = {
    primary: "bg-accent-soft text-primary",
    success: "bg-success-soft text-success",
    error: "bg-error-soft text-error",
  };
  return (
    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${styles[tone]}`}>
      {children}
    </div>
  );
};

const StatusDetail = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 font-semibold capitalize text-text">{value}</p>
    </div>
  </div>
);

const ResultActions = ({ retry = false }) => (
  <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
    {retry ? (
      <Link
        to="/cart"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-6 font-semibold text-on-accent"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Return to cart
      </Link>
    ) : null}
    <Link
      to="/account/orders"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-6 font-semibold text-on-accent"
    >
      View your orders <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
    <Link
      to="/shop"
      className="inline-flex min-h-12 items-center justify-center rounded-button border border-border bg-surface px-6 font-semibold text-text"
    >
      Continue shopping
    </Link>
  </div>
);

export default CheckoutSuccessPage;
