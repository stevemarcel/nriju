import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  AdminStatCard,
  ADMIN_TABLE_HEAD_ROW_CLASS,
  EmptyState,
  StatusPill,
  TableSkeleton,
  formatDate,
  formatNaira,
} from "../../components/admin/AdminPrimitives";
import {
  Activity,
  ChevronRight,
  Banknote,
  Boxes,
  CalendarDays,
  Clock3,
  Layers3,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Ticket,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";

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

const ACTIVITY_STATUS_MAP = {
  create: {
    label: "Created",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  update: {
    label: "Updated",
    cls: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
  },
  delete: {
    label: "Deleted",
    cls: "bg-rose-100 text-rose-700",
    dotColor: "bg-rose-500",
  },
  role_change: {
    label: "Role change",
    cls: "bg-blue-100 text-blue-700",
    dotColor: "bg-blue-500",
  },
  status_toggle: {
    label: "Status change",
    cls: "bg-violet-100 text-violet-700",
    dotColor: "bg-violet-500",
  },
};

const QUICK_ACTIONS = [
  { label: "Add product", to: "/admin/products", icon: Plus, primary: true },
  { label: "Manage inventory", to: "/admin/inventory", icon: Layers3 },
  { label: "Create coupon", to: "/admin/coupons", icon: Ticket },
  { label: "View orders", to: "/admin/orders", icon: ShoppingCart },
  { label: "Manage users", to: "/admin/users", icon: Users },
];

const buildSalesSeries = (points = []) => {
  const pointMap = new Map(points.map((point) => [point.date, point]));
  const today = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    const point = pointMap.get(key);

    return {
      date: key,
      label: date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      }),
      revenue: Number(point?.revenue || 0) / 100,
      orders: Number(point?.orders || 0),
    };
  });
};

const TrendBadge = ({ value }) => {
  const change = Number(value || 0);
  const isPositive = change > 0;
  const isUnchanged = change === 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  if (isUnchanged) {
    return (
      <span
        title="Compared with the previous 30 days"
        aria-label="No change compared with the previous 30 days"
        className="inline-flex items-center rounded-full bg-background px-2 py-1 text-xs font-semibold text-text-muted"
      >
        No change
      </span>
    );
  }

  return (
    <span
      title="Compared with the previous 30 days"
      aria-label={`${Math.abs(change)}% ${isPositive ? "increase" : "decrease"} compared with the previous 30 days`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
        isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {Math.abs(change)}%
    </span>
  );
};

const SalesChart = ({ data }) => {
  const width = 720;
  const height = 280;
  const left = 72;
  const right = 20;
  const top = 18;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1);
  const maxOrders = Math.max(...data.map((point) => point.orders), 1);
  const columnWidth = plotWidth / data.length;
  const barWidth = Math.max(4, columnWidth * 0.55);
  const orderPoints = data
    .map((point, index) => {
      const x = left + index * columnWidth + columnWidth / 2;
      const y = top + plotHeight - (point.orders / maxOrders) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="sales-chart-title sales-chart-description"
        className="h-72 w-full"
      >
        <title id="sales-chart-title">Revenue and order trend</title>
        <desc id="sales-chart-description">
          Daily revenue bars and order-count line for the last 30 days.
        </desc>

        {[0, 1, 2, 3, 4].map((step) => {
          const y = top + (plotHeight / 4) * step;
          const value = maxRevenue * (1 - step / 4);

          return (
            <g key={step}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
              />
              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize="10"
              >
                ₦
                {Math.round(value).toLocaleString("en-NG", {
                  notation: "compact",
                })}
              </text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const barHeight = (point.revenue / maxRevenue) * plotHeight;
          const x = left + index * columnWidth + (columnWidth - barWidth) / 2;

          return (
            <rect
              key={point.date}
              x={x}
              y={top + plotHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx="3"
              fill="var(--color-accent-soft)"
            />
          );
        })}

        <polyline
          points={orderPoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((point, index) => {
          if (index % 5 !== 0 && index !== data.length - 1) return null;
          const x = left + index * columnWidth + columnWidth / 2;
          const orderY = top + plotHeight - (point.orders / maxOrders) * plotHeight;

          return (
            <g key={`${point.date}-label`}>
              <circle cx={x} cy={orderY} r="4" fill="var(--color-primary)" />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize="10"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-5 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/15" aria-hidden="true" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
          Orders
        </span>
      </div>
    </div>
  );
};

const PanelLink = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
  >
    {children}
    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
  </Link>
);

const DashboardPanel = ({ title, description, action, children, className = "" }) => (
  <section
    className={`min-w-0 overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm ${className}`}
  >
    <header className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
        {description ? <p className="text-xs text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
    {children}
  </section>
);

const SummaryCard = ({ title, description, to, linkLabel, icon: Icon, tone, children }) => (
  <section className="rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3">
      <div>
        <h2 className="font-heading font-semibold text-text">{title}</h2>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <PanelLink to={to}>{linkLabel}</PanelLink>
    </div>
    <div className="flex items-center gap-4">
      <span className={`rounded-xl p-3 ${tone}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  </section>
);

const AdminDashboardPage = () => {
  const { data: stats, isPending } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data.data,
  });

  const salesSeries = useMemo(() => buildSalesSeries(stats?.salesOverview), [stats?.salesOverview]);

  const userTotal =
    Number(stats?.usersByRole?.customers || 0) +
    Number(stats?.usersByRole?.admins || 0) +
    Number(stats?.usersByRole?.superAdmins || 0);

  const statCards = [
    {
      label: "Revenue (30 days)",
      value: formatNaira(stats?.period?.revenue || 0),
      icon: Banknote,
      tone: "success",
      meta: stats ? <TrendBadge value={stats.period?.revenueChange} /> : null,
    },
    {
      label: "Orders (30 days)",
      value: Number(stats?.period?.orders || 0).toLocaleString("en-NG"),
      icon: ShoppingCart,
      tone: "warning",
      meta: stats ? <TrendBadge value={stats.period?.ordersChange} /> : null,
    },
    {
      label: "Stock cost value",
      value: formatNaira(stats?.inventory?.stockValue || 0),
      icon: Boxes,
      tone: "success",
      meta: <span className="text-right text-xs text-text-muted">Known stock costs</span>,
    },
    {
      label: "Customers",
      value: Number(stats?.counts?.customers || 0).toLocaleString("en-NG"),
      icon: Users,
      tone: "warning",
      meta: <span className="text-right text-xs text-text-muted">Customer accounts</span>,
    },
    {
      label: "Active products",
      value: Number(stats?.counts?.activeProducts || 0).toLocaleString("en-NG"),
      icon: Package,
      tone: "primary",
      meta: <span className="text-right text-xs text-text-muted">Active catalogue</span>,
    },
    {
      label: "Low stock alerts",
      value: Number(stats?.counts?.lowStock || 0).toLocaleString("en-NG"),
      icon: TriangleAlert,
      tone: "danger",
      meta: <span className="text-right text-xs text-text-muted">Needs replenishment</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Monitor store performance, inventory health, customer activity and admin operations."
      />

      <section
        aria-label="Store overview"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
      >
        {statCards.map((card) => (
          <AdminStatCard key={card.label} {...card} loading={isPending} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Sales overview"
          description="Revenue and completed orders for the last 30 days."
          action={
            <span className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-on-accent">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Last 30 days
            </span>
          }
        >
          <div className="p-4 sm:p-5">
            {isPending ? (
              <div className="h-72 animate-pulse rounded-xl bg-background-soft" />
            ) : salesSeries.some((point) => point.orders > 0) ? (
              <SalesChart data={salesSeries} />
            ) : (
              <EmptyState
                icon={<Activity className="mx-auto h-10 w-10 text-text-muted" />}
                title="No completed sales yet"
                description="Revenue and order trends will appear after the first completed order."
              />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent orders"
          description="Latest customer orders and fulfilment status."
          action={<PanelLink to="/admin/orders">View all orders</PanelLink>}
        >
          <div className="overflow-x-auto">
            {isPending ? (
              <TableSkeleton rows={5} cols={5} />
            ) : !stats?.recentOrders?.length ? (
              <EmptyState
                icon={<ShoppingCart className="mx-auto h-10 w-10 text-text-muted" />}
                title="No orders yet"
              />
            ) : (
              <table className="w-full min-w-145 text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="admin-table divide-y divide-border">
                  {stats.recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-background-soft/30">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-text">
                        {order.orderNumber}
                      </td>
                      <td className="max-w-40 truncate px-4 py-3 text-text-secondary">
                        {order.user?.name || order.guestName || "Guest"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-text">
                        {formatNaira(order.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill status={order.status} map={ORDER_STATUS_MAP} dot />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-text-muted">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Low stock alerts"
          description="Products that need replenishment soon."
          action={<PanelLink to="/admin/inventory">View inventory</PanelLink>}
        >
          <div className="overflow-x-auto">
            {isPending ? (
              <TableSkeleton rows={4} cols={3} />
            ) : !stats?.inventory?.lowStockProducts?.length ? (
              <EmptyState
                icon={<TriangleAlert className="mx-auto h-10 w-10 text-emerald-600" />}
                title="Stock levels look healthy"
              />
            ) : (
              <table className="w-full min-w-112 text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="admin-table divide-y divide-border">
                  {stats.inventory.lowStockProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-background-soft/30">
                      <td className="px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt=""
                              width="40"
                              height="40"
                              loading="lazy"
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background-soft">
                              <Package className="h-5 w-5 text-text-muted" aria-hidden="true" />
                            </span>
                          )}
                          <span className="truncate font-medium text-text">{product.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-text">
                        {product.stock.toLocaleString("en-NG")} {product.unit}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-amber-500"
                            aria-hidden="true"
                          />
                          Low stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent activity"
          description="Important admin actions and changes across the store."
          action={<PanelLink to="/admin/activities">View all activities</PanelLink>}
        >
          <div className="overflow-x-auto">
            {isPending ? (
              <TableSkeleton rows={5} cols={3} />
            ) : !stats?.recentActivity?.length ? (
              <EmptyState
                icon={<Clock3 className="mx-auto h-10 w-10 text-text-muted" />}
                title="No recent activity"
              />
            ) : (
              <table className="w-full min-w-140 text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="admin-table divide-y divide-border">
                  {stats.recentActivity.map((entry) => (
                    <tr key={entry._id} className="hover:bg-background-soft/30">
                      <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={entry.actionType || "update"}
                          map={ACTIVITY_STATUS_MAP}
                          dot
                        />
                      </td>
                      <td className="max-w-80 px-4 py-3">
                        <span className="block truncate text-text-secondary">
                          {entry.description || "Activity recorded"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="User overview"
          description="Store staff and customers."
          to="/admin/users"
          linkLabel="View users"
          icon={Users}
          tone="bg-emerald-50 text-emerald-600"
        >
          <div className="grid grid-cols-4 divide-x divide-border text-center">
            {[
              [userTotal, "Total"],
              [stats?.usersByRole?.superAdmins || 0, "Super admin"],
              [stats?.usersByRole?.admins || 0, "Admins"],
              [stats?.usersByRole?.customers || 0, "Customers"],
            ].map(([value, label]) => (
              <div key={label} className="px-1">
                <strong className="block font-heading text-lg text-text">{value}</strong>
                <span className="text-[11px] text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </SummaryCard>

        <SummaryCard
          title="Coupons and promotions"
          description="Available customer discounts."
          to="/admin/coupons"
          linkLabel="View coupons"
          icon={Ticket}
          tone="bg-rose-50 text-rose-600"
        >
          <div className="grid grid-cols-2 divide-x divide-border text-center">
            {[
              [stats?.coupons?.active || 0, "Active"],
              [stats?.coupons?.total || 0, "Total coupons"],
            ].map(([value, label]) => (
              <div key={label}>
                <strong className="block font-heading text-xl text-text">{value}</strong>
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </SummaryCard>

        <SummaryCard
          title="Reviews"
          description="Customer feedback and store rating."
          to="/admin/reviews"
          linkLabel="View reviews"
          icon={Star}
          tone="bg-amber-50 text-amber-600"
        >
          <div className="grid grid-cols-2 divide-x divide-border text-center">
            <div>
              <strong className="block font-heading text-xl text-text">
                {stats?.reviews?.averageRating || 0} / 5
              </strong>
              <span className="text-xs text-text-muted">Approved rating</span>
            </div>
            <div>
              <strong className="block font-heading text-xl text-text">
                {stats?.reviews?.total || 0}
              </strong>
              <span className="text-xs text-text-muted">Total reviews</span>
            </div>
          </div>
        </SummaryCard>
      </div>

      <DashboardPanel
        title="Quick actions"
        description="Common admin tasks for managing the store."
      >
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
          {QUICK_ACTIONS.map(({ label, to, icon: Icon, primary }) => (
            <Link
              key={label}
              to={to}
              className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                primary
                  ? "border-primary bg-primary text-on-accent hover:bg-primary/90"
                  : "border-border bg-background text-text hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
};

export default AdminDashboardPage;
