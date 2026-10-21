import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import {
  AdminPageHeader,
  StatusPill,
  TableSkeleton,
  EmptyState,
  formatNaira,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import { Package, ShoppingCart, Users, Star, TrendingUp, Clock } from "lucide-react";

const ORDER_STATUS_MAP = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "Preparing", cls: "bg-violet-100 text-violet-700" },
  ready_for_pickup: { label: "Ready", cls: "bg-cyan-100 text-cyan-700" },
  on_the_way: { label: "On the way", cls: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
  picked_up: { label: "Picked up", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-700" },
  refunded: { label: "Refunded", cls: "bg-slate-200 text-slate-600" },
};

const AdminDashboardPage = () => {
  const { data: stats, isPending } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data.data,
  });

  const { data: settings } = usePublicSettings();

  const cards = stats
    ? [
        {
          label: "Total Orders",
          value: stats.counts.orders,
          icon: ShoppingCart,
          accent: "text-primary",
        },
        { label: "Products", value: stats.counts.products, icon: Package, accent: "text-primary" },
        { label: "Customers", value: stats.counts.customers, icon: Users, accent: "text-primary" },
        {
          label: "Pending Reviews",
          value: stats.counts.pendingReviews,
          icon: Star,
          accent: "text-amber-500",
        },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader title="Dashboard" subtitle="High-level overview of the Nriju store." />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isPending
          ? [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-surface rounded-xl border border-border animate-pulse"
              />
            ))
          : cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="p-5 bg-surface rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">{c.label}</span>
                    <Icon className={`w-5 h-5 ${c.accent}`} />
                  </div>
                  <div className="font-heading text-3xl font-bold mt-2">{c.value}</div>
                </div>
              );
            })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue */}
        <div className="lg:col-span-1 p-6 bg-surface rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold">Revenue (excluding cancelled/refunded)</h2>
          </div>
          {isPending ? (
            <div className="h-10 bg-background-soft rounded animate-pulse mt-4" />
          ) : stats?.revenue !== undefined ? (
            <div className="font-heading text-3xl font-bold mt-4">{formatNaira(stats.revenue)}</div>
          ) : (
            <div className="font-heading text-3xl font-bold mt-4 text-text-muted">—</div>
          )}
          <p className="text-xs text-text-muted mt-2">
            Business: {settings?.business_name || "Nriju"}
          </p>
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Orders
            </h2>
            <a href="/admin/orders" className="text-sm text-primary hover:underline">
              View all →
            </a>
          </div>
          <div className="divide-y divide-border">
            {isPending ? (
              <TableSkeleton rows={5} cols={4} />
            ) : !stats?.recentOrders?.length ? (
              <div className="p-8 text-center text-text-muted text-sm">No orders yet.</div>
            ) : (
              stats.recentOrders?.slice(0, 5).map((o) => (
                <div key={o._id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{o.orderNumber}</span>
                      <StatusPill status={o.status} map={ORDER_STATUS_MAP} />
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {o.user?.name || "Guest"} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-heading font-semibold text-sm">{formatNaira(o.total)}</div>
                    <div className="text-xs text-text-muted">{o.items.length} item(s)</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
