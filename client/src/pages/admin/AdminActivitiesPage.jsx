import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import ActivityDetailsModal, { ACTION_TYPE_MAP } from "../../components/admin/ActivityDetailsModal";
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
} from "../../components/admin/AdminPrimitives";
import { formatDate } from "../../utils/formatDate";
import Dropdown from "../../components/ui/Dropdown";
import {
  Shield,
  ShieldCheck,
  Filter,
  Eye,
  Clock,
  User,
  Users,
  ShoppingCart,
  Truck,
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
  {
    value: "create",
    label: "Created",
    icon: CirclePlus,
    color: "text-emerald-600",
  },
  { value: "update", label: "Updated", icon: Pencil, color: "text-amber-600" },
  { value: "delete", label: "Deleted", icon: Trash2, color: "text-rose-600" },
  {
    value: "role_change",
    label: "Role Change",
    icon: ShieldCheck,
    color: "text-blue-600",
  },
  {
    value: "status_toggle",
    label: "Status Change",
    icon: RefreshCw,
    color: "text-violet-600",
  },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All entities", icon: Clock, color: "text-text-muted" },
  {
    value: "product",
    label: "Product",
    icon: Package,
    color: "text-green-600",
  },
  {
    value: "order",
    label: "Order",
    icon: ShoppingCart,
    color: "text-blue-600",
  },
  { value: "user", label: "User", icon: Users, color: "text-purple-600" },
  { value: "coupon", label: "Coupon", icon: Ticket, color: "text-amber-600" },
  {
    value: "inventory",
    label: "Inventory",
    icon: Package,
    color: "text-cyan-600",
  },
];

const ROLE_ICON_MAP = {
  system: <Clock className="w-4 h-4 text-text-muted" />,
  superAdmin: <ShieldCheck className="w-4 h-4 text-amber-400" />,
  admin: <Shield className="w-4 h-4 text-blue-500" />,
  courier: <Truck className="w-4 h-4 text-primary" />,
  customer: <User className="w-4 h-4 text-text-muted" />,
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
      if (filterAction) params.set("actionType", filterAction);
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Activity Log"
        subtitle="Review important customer, payment, fulfilment and administrative changes."
      />

      {/* Filter bar */}
      <AdminFilterBar
        filterCount={2}
        ariaLabel="Activity filters"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search activities..."
            ariaLabel="Search activities"
          />
        }
      >
        {/* Action Type Filter */}
        <div className="relative min-w-0">
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
                  filterAction === s.value ? "text-primary font-semibold bg-primary/5" : "text-text"
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
        <div className="relative min-w-0">
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
                  filterEntity === s.value ? "text-primary font-semibold bg-primary/5" : "text-text"
                }`}
              >
                {s.icon && <s.icon className={`w-4 h-4 ${s.color || "text-text-muted"}`} />}
                <span className="flex-1">{s.label}</span>
                {filterEntity === s.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </Dropdown>
        </div>
      </AdminFilterBar>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <AdminTableHeader
          title="Recent activity"
          description="Review important changes across the complete order workflow."
          total={meta.total}
          countLabel="activities"
        />
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
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
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
                        <span className="font-medium text-text">
                          {a.user?.name || (a.actorRole === "system" ? "Nriju system" : "Unknown")}
                        </span>

                        {(a.user?.role || a.actorRole) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-3 h-3 flex items-center">
                              {ROLE_ICON_MAP[a.user?.role || a.actorRole] || (
                                <User className="text-text-muted" />
                              )}
                            </div>

                            <span className="text-xs text-text-muted capitalize w-fit">
                              {(a.user?.role || a.actorRole)
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
        {!isPending && activities.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default AdminActivitiesPage;
