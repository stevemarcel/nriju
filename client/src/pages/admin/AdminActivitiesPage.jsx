import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  StatusPill,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import Dropdown from "../../components/ui/Dropdown";
import {
  Shield,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  Users,
  ShoppingCart,
  Package,
  Ticket,
  Check,
  X,
  CirclePlus,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";

const ACTION_TYPE_OPTIONS = [
  { value: "", label: "All actions", icon: Clock, color: "text-text-muted" },
  { value: "create", label: "Created", icon: CirclePlus, color: "text-emerald-600" },
  { value: "update", label: "Updated", icon: Pencil, color: "text-amber-600" },
  { value: "delete", label: "Deleted", icon: Trash2, color: "text-rose-600" },
  { value: "role_change", label: "Role Change", icon: ShieldCheck, color: "text-blue-600" },
  { value: "status_toggle", label: "Status Change", icon: RefreshCw, color: "text-violet-600" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All entities", icon: Clock, color: "text-text-muted" },
  { value: "product", label: "Product", icon: Package, color: "text-green-600" },
  { value: "order", label: "Order", icon: ShoppingCart, color: "text-blue-600" },
  { value: "user", label: "User", icon: Users, color: "text-purple-600" },
  { value: "coupon", label: "Coupon", icon: Ticket, color: "text-amber-600" },
  { value: "inventory", label: "Inventory", icon: Package, color: "text-cyan-600" },
];

const ROLE_ICON_MAP = {
  superAdmin: <ShieldCheck className="w-4 h-4 text-amber-400" />,
  admin: <Shield className="w-4 h-4 text-blue-500" />,
  customer: <User className="w-4 h-4 text-text-muted" />,
};

const ACTION_TYPE_MAP = {
  create: { label: "Created", cls: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  update: { label: "Updated", cls: "bg-amber-100 text-amber-700", dotColor: "bg-amber-500" },
  delete: { label: "Deleted", cls: "bg-rose-100 text-rose-700", dotColor: "bg-rose-500" },
  role_change: { label: "Role Change", cls: "bg-blue-100 text-blue-700", dotColor: "bg-blue-500" },
  status_toggle: {
    label: "Status Change",
    cls: "bg-violet-100 text-violet-700",
    dotColor: "bg-violet-500",
  },
};

const AdminActivitiesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "activities", page, search, filterAction, filterEntity],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (filterAction) params.set("action", filterAction);
      if (filterEntity) params.set("entity", filterEntity);
      const res = await api.get(`/admin/activity-logs?${params.toString()}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Auto-invalidate activities when users are updated
  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event?.data?.queryKey?.[1] === "users" || event?.data?.type === "mutation") {
        queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const activities = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader title="Activity Log" />

      {/* Filter bar */}
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-4 mb-4 flex flex-col items-stretch md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-3 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search activities..."
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap flex-2">
          {/* Action Type Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
            <Dropdown
              trigger={
                <>
                  <Filter className="w-4 h-4 mr-2 text-white group-hover:text-white" />
                  <span className="flex-1 text-left whitespace-nowrap">
                    {ACTION_TYPE_OPTIONS.find((s) => s.value === filterAction)?.label ||
                      "All actions"}
                  </span>
                </>
              }
              color="primary"
              noBorder
              fullWidth
              menuClassName="sm:w-48"
            >
              {ACTION_TYPE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setFilterAction(s.value);
                    setPage(1);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                    filterAction === s.value
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-text"
                  }`}
                >
                  {s.icon && <s.icon className={`w-4 h-4 ${s.color || "text-text-muted"}`} />}
                  <span className="flex-1">{s.label}</span>
                  {filterAction === s.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </Dropdown>
          </div>

          {/* Entity Type Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
            <Dropdown
              trigger={
                <>
                  <Clock className="w-4 h-4 mr-2 text-white group-hover:text-white" />
                  <span className="flex-1 text-left whitespace-nowrap">
                    {ENTITY_TYPE_OPTIONS.find((s) => s.value === filterEntity)?.label ||
                      "All entities"}
                  </span>
                </>
              }
              color="primary"
              noBorder
              fullWidth
              menuClassName="sm:w-48"
            >
              {ENTITY_TYPE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setFilterEntity(s.value);
                    setPage(1);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                    filterEntity === s.value
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-text"
                  }`}
                >
                  {s.icon && <s.icon className={`w-4 h-4 ${s.color || "text-text-muted"}`} />}
                  <span className="flex-1">{s.label}</span>
                  {filterEntity === s.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </Dropdown>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !activities.length ? (
            <EmptyState
              icon={<Clock className="mx-auto w-10 h-10 text-text-muted" />}
              title="No activities found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
                  <th className="text-left py-4 px-4">Date</th>
                  <th className="text-left py-4 px-4">Performed By</th>
                  <th className="text-left py-4 px-4">Action</th>
                  <th className="text-left py-4 px-4">Description</th>
                  <th className="text-center py-4 px-4">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {activities.map((a) => (
                  <tr key={a._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4 text-text-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(a.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="font-medium text-text">{a.user?.name || "Unknown"}</span>

                        {a.user?.role && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-3 h-3 flex items-center">
                              {ROLE_ICON_MAP[a.user?.role] || <User className=" text-text-muted" />}
                            </div>

                            <span className="text-xs text-text-muted capitalize w-fit">
                              {a.user.role
                                .replace(/([A-Z])/g, " $1")
                                .trim()
                                .replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill status={a.actionType || a.action} map={ACTION_TYPE_MAP} dot />
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <span className="text-text text-sm truncate block">
                        {a.description || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedActivity(a)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
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

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

const ActivityDetailsModal = ({ activity, onClose }) => {
  const formatTimestamp = (isoStr) => {
    if (!isoStr) return "—";
    const date = new Date(isoStr);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-[20px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary/95 text-on-accent px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Activity Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Date & Time
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {formatTimestamp(activity.createdAt)}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Performer
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {activity.user?.name || "Unknown"}{" "}
                {activity.user?.role && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">
                    {activity.user.role.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                )}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Action Type
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {ACTION_TYPE_MAP[activity.actionType]?.label || activity.action}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Entity
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {activity.entityName || activity.entity || "—"}
              </p>
            </div>
          </div>

          {/* Description */}
          {activity.description && (
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Description
              </span>
              <p className="mt-2 text-sm text-text leading-relaxed">{activity.description}</p>
            </div>
          )}

          {/* Changes */}
          {activity.changes && activity.changes.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Changes Made
              </span>
              <div className="mt-3 space-y-2">
                {activity.changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-background-soft rounded-lg"
                  >
                    <span className="text-xs font-medium text-text-muted w-24 shrink-0 capitalize">
                      {change.field}
                    </span>
                    <span className="text-sm text-text-muted line-through flex-1">
                      {change.from}
                    </span>
                    <span className="text-text shrink-0">→</span>
                    <span className="text-sm font-medium text-emerald-600 flex-1 text-right">
                      {change.to}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {(activity.ip || activity.userAgent) && (
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Additional Info
              </span>
              <div className="mt-3 space-y-2 text-sm">
                {activity.ip && (
                  <div className="flex gap-2">
                    <span className="text-text-muted">IP:</span>
                    <span className="font-mono text-text">{activity.ip}</span>
                  </div>
                )}
                {activity.userAgent && (
                  <div className="flex gap-2">
                    <span className="text-text-muted">Browser:</span>
                    <span className="text-text truncate">{activity.userAgent}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-border/60">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Metadata
              </span>
              <pre className="mt-2 text-xs font-mono text-text-muted bg-background p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 px-6 py-4 bg-surface flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminActivitiesPage;
