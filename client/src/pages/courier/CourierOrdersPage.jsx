import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Check,
  CircleAlert,
  Loader2,
  LogOut,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import { clearAuth } from "../../slices/authSlice";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { formatNaira, toKobo } from "../../utils/formatMoney";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const COLLECTION_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "transfer", label: "Transfer" },
];

const handoffCodeHasExpired = (order) =>
  Boolean(order.handoffOtpExpiresAt) && new Date(order.handoffOtpExpiresAt).getTime() <= Date.now();

const CourierOrdersPage = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [collecting, setCollecting] = useState(null);
  const [reissueOrderId, setReissueOrderId] = useState(null);
  const [collection, setCollection] = useState({
    otp: "",
    method: "cash",
    amount: "",
    reference: "",
  });

  const ordersQuery = useQuery({
    queryKey: ["courier", "orders"],
    queryFn: async () => (await api.get("/courier/orders")).data.data || [],
    refetchInterval: 30_000,
  });
  const startMutation = useMutation({
    mutationFn: (orderId) => api.post(`/courier/orders/${orderId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "orders"] });
      toast.success("Delivery started. The customer can now view the handoff code.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not start delivery."),
  });
  const collectMutation = useMutation({
    mutationFn: ({ orderId, payload, prepaid }) =>
      api.post(
        prepaid ? `/courier/orders/${orderId}/handoff` : `/courier/orders/${orderId}/collect`,
        prepaid ? { otp: payload.otp } : payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "orders"] });
      setCollecting(null);
      toast.success("Payment and handoff recorded for reconciliation.");
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Could not confirm collection."),
  });
  const reissueMutation = useMutation({
    mutationFn: (orderId) => api.post(`/courier/orders/${orderId}/handoff-code/reissue`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "orders"] });
      toast.success("New handoff code issued. The customer has been notified.");
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Could not reissue the handoff code."),
  });

  const openCollection = (order) => {
    setCollecting(order._id);
    setCollection({ otp: "", method: "cash", amount: String(order.total / 100), reference: "" });
  };
  const submitCollection = (event, order) => {
    event.preventDefault();
    collectMutation.mutate({
      orderId: order._id,
      payload: { ...collection, amount: toKobo(collection.amount) },
      prepaid: order.paymentMethod !== "pay_on_delivery",
    });
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* clear locally */
    }
    dispatch(clearAuth());
    window.location.assign("/login");
  };

  return (
    <main className="min-h-screen bg-background-soft px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Courier operations
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-text">Assigned deliveries</h1>
            <p className="mt-2 text-sm text-text-secondary">Signed in as {user?.name}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 items-center gap-2 rounded-button border border-border bg-surface px-4 text-sm font-semibold text-text"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </header>

        <div className="mt-8 space-y-4">
          {ordersQuery.isPending ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : null}
          {ordersQuery.isSuccess && !ordersQuery.data.length ? (
            <div className="rounded-card border border-border-soft bg-surface p-10 text-center">
              <Truck className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 font-heading text-xl font-bold text-text">
                No assigned deliveries
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                New assignments will appear here automatically.
              </p>
            </div>
          ) : null}
          {ordersQuery.data?.map((order) => (
            <article
              key={order._id}
              className="rounded-card border border-border-soft bg-surface p-5 shadow-soft sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft pb-4">
                <div>
                  <p className="text-xs text-text-muted">{order.orderNumber}</p>
                  <h2 className="mt-1 font-heading text-xl font-bold text-text">
                    {order.shippingAddress?.name}
                  </h2>
                  <p className="mt-1 flex items-start gap-2 text-sm text-text-secondary">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {order.shippingAddress?.line1}, {order.shippingAddress?.city},{" "}
                    {order.shippingAddress?.state}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text">
                    {order.shippingAddress?.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-chip bg-accent-soft px-3 py-1 text-xs font-semibold capitalize text-primary">
                    {order.status.replaceAll("_", " ")}
                  </span>
                  <p className="mt-3 font-heading text-xl font-bold text-text">
                    {formatNaira(order.total)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {order.paymentMethod === "pay_on_delivery"
                      ? "Collect at handoff"
                      : "Paid online"}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                {order.items.map((item) => (
                  <li key={item._id} className="flex justify-between gap-4">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span>{formatNaira(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              {order.status === "on_the_way" && handoffCodeHasExpired(order) ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-background-soft p-4 text-sm text-text-secondary">
                  <CircleAlert
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-text">Handoff code expired</p>
                    <p className="mt-1 text-xs leading-5">
                      Issue a new code before collecting payment or confirming delivery.
                    </p>
                  </div>
                </div>
              ) : null}

              {collecting === order._id ? (
                <form
                  onSubmit={(event) => submitCollection(event, order)}
                  className="mt-5 rounded-xl border border-primary/20 bg-accent-soft p-4"
                >
                  <h3 className="font-heading font-bold text-text">
                    {order.paymentMethod === "pay_on_delivery"
                      ? "Confirm payment and handoff"
                      : "Confirm customer handoff"}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    {order.paymentMethod === "pay_on_delivery"
                      ? "Count or verify the payment first. Then enter the code shown by the customer. A successful confirmation marks the delivery complete and creates a reconciliation record."
                      : "The payment is already confirmed. Enter the code shown by the customer to record a secure delivery handoff."}
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label
                      className={`text-sm font-semibold text-text ${order.paymentMethod !== "pay_on_delivery" ? "sm:col-span-2" : ""}`}
                    >
                      Handoff code
                      <input
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength="6"
                        required
                        value={collection.otp}
                        onChange={(event) =>
                          setCollection((current) => ({
                            ...current,
                            otp: event.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className="mt-2 min-h-11 w-full rounded-button border border-border bg-background px-3 tracking-[0.25em] outline-none focus:border-primary"
                      />
                    </label>
                    {order.paymentMethod === "pay_on_delivery" ? (
                      <>
                        <label className="text-sm font-semibold text-text">
                          Amount received (₦)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={collection.amount}
                            onChange={(event) =>
                              setCollection((current) => ({
                                ...current,
                                amount: event.target.value,
                              }))
                            }
                            className="mt-2 min-h-11 w-full rounded-button border border-border bg-background px-3 outline-none focus:border-primary"
                          />
                        </label>
                        <div className="sm:col-span-2">
                          <span className="text-sm font-semibold text-text">Collection method</span>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {COLLECTION_METHODS.map((method) => (
                              <button
                                key={method.value}
                                type="button"
                                aria-pressed={collection.method === method.value}
                                onClick={() =>
                                  setCollection((current) => ({ ...current, method: method.value }))
                                }
                                className={`min-h-11 rounded-button border text-sm font-semibold ${collection.method === method.value ? "border-primary bg-primary text-on-accent" : "border-border bg-background text-text"}`}
                              >
                                {method.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="text-sm font-semibold text-text sm:col-span-2">
                          POS or transfer reference
                          <input
                            value={collection.reference}
                            required={collection.method !== "cash"}
                            onChange={(event) =>
                              setCollection((current) => ({
                                ...current,
                                reference: event.target.value,
                              }))
                            }
                            placeholder={
                              collection.method === "cash" ? "Optional for cash" : "Required"
                            }
                            className="mt-2 min-h-11 w-full rounded-button border border-border bg-background px-3 outline-none focus:border-primary"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setCollecting(null)}
                      className="min-h-11 rounded-button border border-border bg-background px-4 font-semibold text-text"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={collectMutation.isPending}
                      className="inline-flex min-h-11 items-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-accent"
                    >
                      <Check className="h-4 w-4" />
                      {collectMutation.isPending ? "Confirming..." : "Confirm handoff"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  {order.status !== "on_the_way" ? (
                    <button
                      type="button"
                      onClick={() => startMutation.mutate(order._id)}
                      disabled={startMutation.isPending}
                      className="inline-flex min-h-11 items-center gap-2 rounded-button border border-primary px-4 font-semibold text-primary"
                    >
                      <Truck className="h-4 w-4" />
                      Start delivery
                    </button>
                  ) : null}
                  {order.status === "on_the_way" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setReissueOrderId(order._id)}
                        disabled={reissueMutation.isPending}
                        aria-busy={
                          reissueMutation.isPending && reissueMutation.variables === order._id
                        }
                        className={`inline-flex min-h-11 items-center gap-2 rounded-button px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          handoffCodeHasExpired(order)
                            ? "bg-primary text-on-accent"
                            : "border border-primary text-primary"
                        }`}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            reissueMutation.isPending && reissueMutation.variables === order._id
                              ? "animate-spin"
                              : ""
                          }`}
                          aria-hidden="true"
                        />
                        {handoffCodeHasExpired(order)
                          ? "Reissue expired code"
                          : "Reissue handoff code"}
                      </button>
                      {!handoffCodeHasExpired(order) ? (
                        <button
                          type="button"
                          onClick={() => openCollection(order)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-accent"
                        >
                          {order.paymentMethod === "pay_on_delivery" ? (
                            <Banknote className="h-4 w-4" />
                          ) : (
                            <PackageCheck className="h-4 w-4" />
                          )}
                          {order.paymentMethod === "pay_on_delivery"
                            ? "Confirm payment and handoff"
                            : "Confirm handoff"}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
      <ConfirmModal
        open={Boolean(reissueOrderId)}
        title="Issue a new handoff code?"
        description="The customer's current code will stop working immediately. A new code and expiry time will appear in their order, and they will receive a notification."
        confirmLabel="Issue new code"
        variant="primary"
        onConfirm={() => {
          const orderId = reissueOrderId;
          setReissueOrderId(null);
          if (orderId) reissueMutation.mutate(orderId);
        }}
        onCancel={() => setReissueOrderId(null)}
      />
    </main>
  );
};

export default CourierOrdersPage;
