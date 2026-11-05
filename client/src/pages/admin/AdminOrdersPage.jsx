import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  StatusPill,
  formatNaira,
  formatDate,
  confirmDelete,
} from "../../components/admin/AdminPrimitives";
import Dropdown from "../../components/ui/Dropdown";
import {
  ShoppingCart,
  Eye,
  Package,
  Search,
  Check,
  Clock,
  Truck,
  CheckCircle,
  X,
  RotateCcw,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses", icon: <ShoppingCart className="w-4 h-4" /> },
  { value: "pending", label: "Pending", icon: <Clock className="w-4 h-4 text-amber-500" /> },
  {
    value: "confirmed",
    label: "Confirmed",
    icon: <CheckCircle className="w-4 h-4 text-blue-500" />,
  },
  { value: "preparing", label: "Preparing", icon: <Package className="w-4 h-4 text-violet-500" /> },
  {
    value: "ready_for_pickup",
    label: "Ready for pickup",
    icon: <Truck className="w-4 h-4 text-cyan-500" />,
  },
  { value: "on_the_way", label: "On the way", icon: <Truck className="w-4 h-4 text-indigo-500" /> },
  {
    value: "delivered",
    label: "Delivered",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  },
  {
    value: "picked_up",
    label: "Picked up",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  },
  { value: "cancelled", label: "Cancelled", icon: <X className="w-4 h-4 text-rose-500" /> },
  { value: "refunded", label: "Refunded", icon: <RotateCcw className="w-4 h-4 text-slate-500" /> },
];

const STATUS_MAP = {
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3 h-3" />,
  },
  confirmed: {
    label: "Confirmed",
    cls: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  preparing: {
    label: "Preparing",
    cls: "bg-violet-100 text-violet-700",
    icon: <Package className="w-3 h-3" />,
  },
  ready_for_pickup: {
    label: "Ready",
    cls: "bg-cyan-100 text-cyan-700",
    icon: <Truck className="w-3 h-3" />,
  },
  on_the_way: {
    label: "On the way",
    cls: "bg-indigo-100 text-indigo-700",
    icon: <Truck className="w-3 h-3" />,
  },
  delivered: {
    label: "Delivered",
    cls: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  picked_up: {
    label: "Picked up",
    cls: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-rose-100 text-rose-700",
    icon: <X className="w-3 h-3" />,
  },
  refunded: {
    label: "Refunded",
    cls: "bg-slate-200 text-slate-600",
    icon: <RotateCcw className="w-3 h-3" />,
  },
};

const AdminOrdersPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "orders", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/orders/all?${params.toString()}`);
      return res.data;
    },
  });

  const orders = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });

  return (
    <div>
      <AdminPageHeader title="Orders" subtitle={`${orders.length} orders on this page.`} />

      {/* Filter bar */}
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-4 mb-4 flex flex-col items-stretch md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-3 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search orders..."
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap flex-2">
          {/* Status Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
            <Dropdown
              trigger={
                <>
                  <div className="mr-2">
                    {STATUS_OPTIONS.find((s) => s.value === statusFilter).icon}
                  </div>
                  <span className="flex-1 text-left whitespace-nowrap">
                    {" "}
                    {STATUS_OPTIONS.find((s) => s.value === statusFilter).label}
                  </span>
                </>
              }
              color="primary"
              fullWidth
              menuClassName="sm:w-48"
            >
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatusFilter(s.value);
                    setPage(1);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                    statusFilter === s.value
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-text"
                  }`}
                >
                  {s.icon}
                  <span className="flex-1">{s.label}</span>
                  {statusFilter === s.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </Dropdown>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={7} />
          ) : !orders.length ? (
            <EmptyState
              icon={<ShoppingCart className="mx-auto w-10 h-10 text-text-muted" />}
              title="No orders found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
                  <th className="text-left py-4 px-4">Order</th>
                  <th className="text-left py-4 px-4">Customer</th>
                  <th className="text-center py-4 px-4">Items</th>
                  <th className="text-left py-4 px-4">Total</th>
                  <th className="text-center py-4 px-4">Status</th>
                  <th className="text-right py-4 px-4">Date</th>
                  <th className="text-center py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4">
                      <span className="font-medium text-text block truncate">
                        {o.orderNumber || "—"}
                      </span>
                      <span className="text-xs text-text-muted">{o.deliveryMethod}</span>
                    </td>
                    <td className="text-left py-3 px-4 text-text-muted">
                      <span className="block truncate text-text">
                        {o.user?.name || o.guestName || "—"}
                      </span>
                      <span className="text-xs text-text-muted">{o.user?.email || ""}</span>
                    </td>
                    <td className="text-center py-3 px-4">{o.items.length}</td>
                    <td className="text-left py-3 px-4 font-heading font-semibold">
                      {formatNaira(o.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusPill status={o.status} map={STATUS_MAP} />
                    </td>
                    <td className="text-right py-3 px-4 text-text-muted">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDetailOrder(o)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} />

      {/* Order detail drawer */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          statusMap={STATUS_MAP}
          statusOptions={STATUS_OPTIONS.filter((o) => o.value)}
          onClose={() => setDetailOrder(null)}
          onUpdated={() => {
            setDetailOrder(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
};

// ── Detail drawer ────────────────────────────────────────────────────
const OrderDetailModal = ({ order, statusMap, statusOptions, onClose, onUpdated }) => {
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || "");
  const updateMutation = useMutation({
    mutationFn: (updates) => api.patch(`/orders/${order._id}/status`, updates),
    onSuccess: onUpdated,
  });

  const handleSave = () => {
    if (!confirmDelete("Update this order status?")) return;
    updateMutation.mutate({ status, trackingCode });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-xl font-bold text-text">Order {order.orderNumber}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-background-soft">
            <Package className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Tracking code
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg text-sm"
                placeholder="Leave blank to clear"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-heading font-semibold mb-3">Items</h3>
            <div className="divide-y divide-border">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🍲</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text">{item.name}</span>
                    <span className="block text-xs text-text-muted">
                      {item.quantity} × {formatNaira(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Subtotal</span>
              <span className="ml-2 font-medium text-text">{formatNaira(order.subtotal)}</span>
            </div>
            <div>
              <span className="text-text-muted">Discount</span>
              <span className="ml-2 font-medium text-text">{formatNaira(order.discount || 0)}</span>
            </div>
            <div>
              <span className="text-text-muted">Delivery fee</span>
              <span className="ml-2 font-medium text-text">
                {formatNaira(order.deliveryFee || 0)}
              </span>
            </div>
            <div>
              <span className="text-text-muted font-semibold">Total</span>
              <span className="ml-2 font-heading font-bold text-text">
                {formatNaira(order.total)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-text-muted">Shipping to</span>
              <div className="text-sm text-text mt-1">
                {order.shippingAddress?.name}, {order.shippingAddress?.line1},{" "}
                {order.shippingAddress?.city}
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted hover:bg-background-soft rounded-lg"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/95 disabled:opacity-60 transition-colors"
          >
            Save status
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
