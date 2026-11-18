import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminSearchInput,
  AdminTableHeader,
  AdminTablePagination,
  ADMIN_TABLE_HEAD_ROW_CLASS,
  TableSkeleton,
  EmptyState,
  StatusPill,
  formatNaira,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import OrderDetailsModal from "../../components/admin/OrderDetailsModal";
import Dropdown from "../../components/ui/Dropdown";
import {
  ShoppingCart,
  Eye,
  Package,
  Check,
  Clock,
  Truck,
  CheckCircle,
  X,
  RotateCcw,
} from "lucide-react";

const STATUS_OPTIONS = [
  {
    value: "",
    label: "All statuses",
    Icon: ShoppingCart,
    color: "text-text-muted",
  },
  { value: "pending", label: "Pending", Icon: Clock, color: "text-amber-500" },
  {
    value: "confirmed",
    label: "Confirmed",
    Icon: CheckCircle,
    color: "text-blue-500",
  },
  {
    value: "preparing",
    label: "Preparing",
    Icon: Package,
    color: "text-violet-500",
  },
  {
    value: "ready_for_pickup",
    label: "Ready for pickup",
    Icon: Truck,
    color: "text-cyan-500",
  },
  {
    value: "on_the_way",
    label: "On the way",
    Icon: Truck,
    color: "text-indigo-500",
  },
  {
    value: "delivered",
    label: "Delivered",
    Icon: CheckCircle,
    color: "text-emerald-500",
  },
  {
    value: "picked_up",
    label: "Picked up",
    Icon: CheckCircle,
    color: "text-emerald-500",
  },
  { value: "cancelled", label: "Cancelled", Icon: X, color: "text-rose-500" },
  {
    value: "refunded",
    label: "Refunded",
    Icon: RotateCcw,
    color: "text-slate-500",
  },
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
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/orders/all?${params.toString()}`);
      return res.data;
    },
  });

  const orders = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 10 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        subtitle="Track orders, update statuses and review customer purchases."
      />

      {/* Filter bar */}
      <AdminFilterBar
        filterCount={1}
        ariaLabel="Order filters"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search orders..."
            ariaLabel="Search orders"
          />
        }
      >
        {/* Status Filter */}
        <div className="relative min-w-0">
          <Dropdown
            trigger={
              <>
                {(() => {
                  const { Icon, color } = STATUS_OPTIONS.find((s) => s.value === statusFilter);
                  return (
                    <Icon className={`w-4 h-4 mr-2 ${color} text-white group-hover:text-white`} />
                  );
                })()}
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
                  statusFilter === s.value ? "text-primary font-semibold bg-primary/5" : "text-text"
                }`}
              >
                <s.Icon className={`w-4 h-4 ${s.color}`} />
                <span className="flex-1">{s.label}</span>
                {statusFilter === s.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </Dropdown>
        </div>
      </AdminFilterBar>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <AdminTableHeader
          title="Order list"
          description="Review purchases and update fulfilment status."
          total={meta.total}
          countLabel="orders"
        />
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
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
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
        {!isPending && orders.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>

      {/* Order detail drawer */}
      {detailOrder && (
        <OrderDetailsModal
          order={detailOrder}
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

export default AdminOrdersPage;
