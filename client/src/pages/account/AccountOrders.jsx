import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { Link } from "react-router-dom";
import { Package, Search, Filter, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "../../utils/formatMoney";

const STATUS_MAP = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "Preparing", cls: "bg-violet-100 text-violet-700" },
  ready_for_pickup: { label: "Ready for Pickup", cls: "bg-cyan-100 text-cyan-700" },
  on_the_way: { label: "On the Way", cls: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
  picked_up: { label: "Picked Up", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-700" },
  refunded: { label: "Refunded", cls: "bg-slate-100 text-slate-600" },
};

const AccountOrders = () => {
  const [filter, setFilter] = useState("all");
  const { data: ordersData, isPending } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: async () => (await api.get("/orders")).data,
  });

  const orders = ordersData?.data || [];
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const filters = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "preparing", label: "Preparing" },
    { value: "on_the_way", label: "On the Way" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Top bar */}
      <div className="bg-surface border-b border-border-soft">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/account"
            className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Account</span>
          </Link>
          <span className="text-text-muted text-sm hidden sm:inline">/</span>
          <span className="text-sm text-text-muted hidden sm:inline">Orders</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">My Orders</h1>
          <p className="text-text-muted mt-1 text-sm">Track and manage your Nriju orders.</p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                filter === f.value
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface border-border-soft text-text hover:border-primary"
              }`}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({orders.filter((o) => o.status === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {isPending ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-surface rounded-xl border border-border-soft animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-border-soft">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-background flex items-center justify-center">
              <Package className="w-7 h-7 text-text-muted opacity-50" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-text">No orders found</h3>
            <p className="text-text-muted text-sm mt-1 max-w-sm mx-auto">
              {filter === "all"
                ? "You haven't placed any orders yet."
                : `No orders with status "${filter}".`}
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <div key={o._id} className="bg-surface rounded-xl border border-border-soft p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-heading font-semibold text-text text-sm">{o.orderNumber}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Ordered{" "}
                      {new Date(o.createdAt).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_MAP[o.status]?.cls || "bg-background text-text-muted"
                    }`}
                  >
                    {STATUS_MAP[o.status]?.label || o.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {o.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded bg-background flex items-center justify-center text-xs font-medium text-text-muted border border-border-soft">
                        {item.quantity}×
                      </div>
                      <span className="text-text truncate">{item.name}</span>
                      <span className="text-xs text-text-muted ml-auto">{formatNaira(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {o.items.length > 3 && (
                    <div className="text-xs text-text-muted">
                      +{o.items.length - 3} more item(s)
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border-soft">
                  <div>
                    <div className="font-heading font-bold text-text">{formatNaira(o.total)}</div>
                    <div className="text-xs text-text-muted capitalize">
                      {o.deliveryMethod} delivery
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                    </span>
                    <button className="text-sm text-primary hover:underline font-medium">
                      View details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountOrders;
