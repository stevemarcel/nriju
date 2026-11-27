import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CircleAlert,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import { formatNaira, toKobo } from "../../utils/formatMoney";
import formatTimeAgo from "../../utils/formatTimeAgo";
import { phoneHref, whatsappHref } from "../../utils/contactLinks";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

// ? Status visual config: left-border colour strip + chip classes.
const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmed",
    strip: "border-l-amber-400",
    chip: "bg-amber-50 text-amber-700",
  },
  preparing: {
    label: "Preparing",
    strip: "border-l-violet-400",
    chip: "bg-violet-50 text-violet-700",
  },
  on_the_way: {
    label: "On the way",
    strip: "border-l-indigo-400",
    chip: "bg-indigo-50 text-indigo-700",
  },
};

// ? Tab definitions for the status filter row.
const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "on_the_way", label: "On the way" },
];

const COLLECTION_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "transfer", label: "Transfer" },
];

const handoffCodeHasExpired = (order) =>
  Boolean(order.handoffOtpExpiresAt) && new Date(order.handoffOtpExpiresAt).getTime() <= Date.now();

// ? Human-readable queue duration since the order was assigned to this courier.
const queueAge = (order) => {
  const ref = order.courierAssignedAt || order.createdAt;
  if (!ref) return null;
  const mins = Math.floor((Date.now() - new Date(ref).getTime()) / 60_000);
  if (mins < 60) return `${mins} min in queue`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m in queue`;
};

// ? Builds a Google Maps search URL from a shipping address.
const mapsUrl = (order) => {
  const addr = order.shippingAddress;
  if (!addr) return null;
  const q = encodeURIComponent([addr.line1, addr.city, addr.state].filter(Boolean).join(", "));
  return q ? `https://maps.google.com/?q=${q}` : null;
};

// ? Extracts the first up-to-3 unique product image URLs from an order.
const itemImages = (order) =>
  (order.items || [])
    .map((item) => item.product?.images?.[0] || item.image)
    .filter(Boolean)
    .filter((src, i, arr) => arr.indexOf(src) === i)
    .slice(0, 3);

const CourierOrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // * UI state
  const [collecting, setCollecting] = useState(null);
  const [reissueOrderId, setReissueOrderId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [collection, setCollection] = useState({
    otp: "",
    method: "cash",
    amount: "",
    reference: "",
  });

  // * Data — returns both active deliveries and today's completed ones.
  const ordersQuery = useQuery({
    queryKey: ["courier", "orders"],
    queryFn: async () => {
      const res = await api.get("/courier/orders");
      return { active: res.data.data || [], completed: res.data.completed || [] };
    },
    refetchInterval: 30_000,
  });

  // * Mutations
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

  // * Derived data
  const activeOrders = ordersQuery.data?.active ?? [];
  const completedOrders = ordersQuery.data?.completed ?? [];

  // ? Client-side filter: match order number, customer name, or phone.
  const searchQuery = search.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    let result = activeOrders;
    if (searchQuery) {
      result = result.filter((order) => {
        const name = (order.shippingAddress?.name || "").toLowerCase();
        const phone = (order.shippingAddress?.phone || "").toLowerCase();
        const orderNum = (order.orderNumber || "").toLowerCase();
        return (
          orderNum.includes(searchQuery) ||
          name.includes(searchQuery) ||
          phone.includes(searchQuery)
        );
      });
    }
    if (statusFilter) result = result.filter((order) => order.status === statusFilter);
    return result;
  }, [activeOrders, searchQuery, statusFilter]);

  // * Summary metrics
  const inTransitCount = activeOrders.filter((o) => o.status === "on_the_way").length;
  const collectTotalKobo = activeOrders
    .filter((o) => o.paymentMethod === "pay_on_delivery")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // ? Handlers
  const openCollection = (order) => {
    setCollecting(order._id);
    setCollection({
      otp: "",
      method: "cash",
      amount: String(order.total / 100),
      reference: "",
    });
  };

  const submitCollection = (event, order) => {
    event.preventDefault();
    collectMutation.mutate({
      orderId: order._id,
      payload: { ...collection, amount: toKobo(collection.amount) },
      prepaid: order.paymentMethod !== "pay_on_delivery",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Courier operations
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-text sm:text-3xl">
              Assigned deliveries
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => ordersQuery.refetch()}
          aria-label="Refresh deliveries"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary"
        >
          <RefreshCw className={`h-5 w-5 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* Today's summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-card border border-border-soft bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-text-muted">Active</p>
              <p className="font-heading text-xl font-bold text-text">{activeOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-card border border-border-soft bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Navigation className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-text-muted">In transit</p>
              <p className="font-heading text-xl font-bold text-text">{inTransitCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-card border border-border-soft bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Banknote className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-text-muted">To collect</p>
              <p className="font-heading text-xl font-bold text-text">
                {collectTotalKobo > 0 ? formatNaira(collectTotalKobo) : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + status tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order number, customer name or phone…"
            aria-label="Search deliveries"
            className="w-full min-h-11 rounded-card border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary"
          />
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter by status"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.value)}
                className={`shrink-0 rounded-chip px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-on-accent"
                    : "border border-border bg-surface text-text-secondary hover:bg-accent-soft hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order list */}
      <div className="space-y-4">
        {/* Skeleton */}
        {ordersQuery.isPending ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-card border border-border-soft bg-surface p-5 shadow-soft sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 border-b border-border-soft pb-4">
                  <div className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-background-soft" />
                    <div className="h-5 w-32 animate-pulse rounded bg-background-soft" />
                    <div className="h-4 w-40 animate-pulse rounded bg-background-soft" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded-chip bg-background-soft" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-background-soft" />
                  <div className="h-4 w-32 animate-pulse rounded bg-background-soft" />
                </div>
                <div className="mt-4 h-10 w-32 animate-pulse rounded-button bg-background-soft" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 && activeOrders.length > 0 ? (
          <div className="rounded-card border border-dashed border-border bg-surface p-10 text-center">
            <Search className="mx-auto h-10 w-10 text-text-muted" />
            <h2 className="mt-4 font-heading text-xl font-bold text-text">
              No matching deliveries
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              No deliveries match the current filter. Try clearing your search.
            </p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-surface p-10 text-center">
            <Truck className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-heading text-xl font-bold text-text">
              No assigned deliveries
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              New assignments will appear here automatically.
            </p>
          </div>
        ) : null}

        {filteredOrders.map((order) => {
          const cfg = STATUS_CONFIG[order.status] || {};
          const prepaid = order.paymentMethod !== "pay_on_delivery";
          const phone = order.shippingAddress?.phone;
          const mapsLink = mapsUrl(order);
          const queueLabel = queueAge(order);
          const images = itemImages(order);

          return (
            <article
              key={order._id}
              className={`overflow-hidden rounded-card border border-border-soft border-l-4 bg-surface shadow-soft ${cfg.strip || ""}`}
            >
              <div className="p-5 sm:p-6">
                {/* Customer + status/total */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-text-muted">{order.orderNumber}</p>
                      {queueLabel && (
                        <span className="inline-flex items-center gap-1 rounded-chip bg-background-soft px-2 py-0.5 text-[11px] text-text-muted">
                          <Clock className="h-3 w-3" />
                          {queueLabel}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 font-heading text-lg font-bold text-text sm:text-xl">
                      {order.shippingAddress?.name}
                    </h2>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-text-secondary">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>
                        {order.shippingAddress?.line1}, {order.shippingAddress?.city},{" "}
                        {order.shippingAddress?.state}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-chip px-2.5 py-1 text-xs font-semibold ${cfg.chip || "bg-background-soft text-text-muted"}`}
                    >
                      {cfg.label || order.status.replaceAll("_", " ")}
                    </span>
                    <p className="mt-2 font-heading text-xl font-bold text-text">
                      {formatNaira(order.total)}
                    </p>
                    {/* Payment emphasis */}
                    {prepaid ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-chip bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3 w-3" /> Paid online
                      </span>
                    ) : (
                      <p className="mt-1 text-xs font-bold text-primary">
                        {formatNaira(order.total)} to collect
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact row */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {phone && (
                      <a
                        href={phoneHref(phone)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-text transition-colors hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {phone}
                      </a>
                    )}
                    <div className="flex gap-1.5">
                      {phone && (
                        <a
                          href={phoneHref(phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Call ${order.shippingAddress?.name || "customer"}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {phone && (
                        <a
                          href={whatsappHref(phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${order.shippingAddress?.name || "customer"}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {mapsLink && (
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${order.shippingAddress?.name || "address"} in Google Maps`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product thumbnails + item list */}
                <div className="mt-4">
                  {images.length > 0 && (
                    <div className="mb-3 flex gap-2">
                      {images.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <ul className="space-y-1.5 text-sm text-text-secondary">
                    {order.items.map((item) => (
                      <li key={item._id} className="flex justify-between gap-4">
                        <span className="flex-1 truncate">
                          {item.quantity} × {item.name}
                        </span>
                        <span className="shrink-0 text-text">
                          {formatNaira(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expired handoff code warning */}
                {order.status === "on_the_way" && handoffCodeHasExpired(order) ? (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <CircleAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-amber-800">Handoff code expired</p>
                      <p className="mt-0.5 text-xs leading-5 text-amber-700">
                        Issue a new code before collecting payment or confirming delivery.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Collection form */}
                {collecting === order._id ? (
                  <form
                    onSubmit={(event) => submitCollection(event, order)}
                    className="mt-5 rounded-xl border border-primary/20 bg-accent-soft p-4"
                  >
                    <h3 className="font-heading font-bold text-text">
                      {prepaid ? "Confirm customer handoff" : "Confirm payment and handoff"}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {prepaid
                        ? "The payment is already confirmed. Enter the code shown by the customer to record a secure delivery handoff."
                        : "Count or verify the payment first. Then enter the code shown by the customer. A successful confirmation marks the delivery complete and creates a reconciliation record."}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label
                        className={`text-sm font-semibold text-text ${prepaid ? "sm:col-span-2" : ""}`}
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
                      {!prepaid ? (
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
                            <span className="text-sm font-semibold text-text">
                              Collection method
                            </span>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {COLLECTION_METHODS.map((method) => (
                                <button
                                  key={method.value}
                                  type="button"
                                  aria-pressed={collection.method === method.value}
                                  onClick={() =>
                                    setCollection((current) => ({
                                      ...current,
                                      method: method.value,
                                    }))
                                  }
                                  className={`min-h-11 rounded-button border text-sm font-semibold ${
                                    collection.method === method.value
                                      ? "border-primary bg-primary text-on-accent"
                                      : "border-border bg-background text-text"
                                  }`}
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
                        className="min-h-11 rounded-button border border-border bg-background px-4 font-semibold text-text transition-colors hover:bg-background-soft"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={collectMutation.isPending}
                        className="inline-flex min-h-11 items-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
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
                        className="inline-flex min-h-11 items-center gap-2 rounded-button border border-primary px-4 font-semibold text-primary transition-colors hover:bg-accent-soft disabled:opacity-60"
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
                              ? "bg-primary text-on-accent transition-opacity hover:opacity-90"
                              : "border border-primary text-primary transition-colors hover:bg-accent-soft"
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
                            className="inline-flex min-h-11 items-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-accent transition-opacity hover:opacity-90"
                          >
                            {prepaid ? (
                              <PackageCheck className="h-4 w-4" />
                            ) : (
                              <Banknote className="h-4 w-4" />
                            )}
                            {prepaid ? "Confirm handoff" : "Confirm payment and handoff"}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Completed today */}
      {completedOrders.length > 0 ? (
        <section className="rounded-card border border-border-soft bg-surface shadow-soft">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="flex w-full items-center justify-between rounded-card px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-background-soft"
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Completed today ({completedOrders.length})
            </span>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>
          {showCompleted ? (
            <div className="border-t border-border-soft p-4">
              <div className="space-y-2">
                {completedOrders.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between rounded-xl bg-background-soft px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div>
                        <p className="font-medium text-text">{order.orderNumber}</p>
                        <p className="text-xs text-text-muted">{formatTimeAgo(order.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold text-text">{formatNaira(order.total)}</p>
                      <p className="text-xs text-text-muted capitalize">
                        {order.status.replaceAll("_", " ")}
                        {order.collectionMethod ? ` · ${order.collectionMethod}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

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
    </div>
  );
};

export default CourierOrdersPage;
