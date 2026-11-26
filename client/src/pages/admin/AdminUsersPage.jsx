import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "../../components/admin/AdminPrimitives";
import { formatDate } from "../../utils/formatDate";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import Dropdown from "../../components/ui/Dropdown";
import {
  Users,
  User,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  ShieldCheck,
  Eye,
  Check,
  Loader2,
  Truck,
} from "lucide-react";

const getInitials = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const ROLE_OPTIONS = [
  {
    value: "",
    label: "All roles",
    roles: [],
    icon: Users,
    color: "text-text-muted",
  },
  {
    value: "customer",
    label: "Customers",
    roles: ["customer"],
    icon: User,
    color: "text-slate-500",
  },
  {
    value: "admin",
    label: "Admins",
    roles: ["admin", "superAdmin"],
    icon: Shield,
    color: "text-blue-600",
  },
  {
    value: "courier",
    label: "Couriers",
    roles: ["courier"],
    icon: Truck,
    color: "text-primary",
  },
  {
    value: "superAdmin",
    label: "Super Admins",
    roles: ["superAdmin"],
    icon: ShieldCheck,
    color: "text-amber-500",
  },
];

const ROLE_MAP = {
  superAdmin: {
    label: "Super Admin",
    cls: "bg-amber-100 text-amber-800",
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  admin: {
    label: "Admin",
    cls: "bg-blue-100 text-blue-800",
    icon: <Shield className="w-3 h-3" />,
  },
  customer: {
    label: "Customer",
    cls: "bg-slate-100 text-slate-700",
    icon: <User className="w-3 h-3" />,
  },
  courier: {
    label: "Courier",
    cls: "bg-red-50 text-primary",
    icon: <Truck className="w-3 h-3" />,
  },
};

const ACTIVE_STATUS_MAP = {
  true: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  false: {
    label: "Inactive",
    cls: "bg-slate-100 text-slate-600",
    dotColor: "bg-slate-500",
  },
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [processingActions, setProcessingActions] = useState({});

  const { data, isPending } = useQuery({
    queryKey: ["admin", "users", page, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });

      if (search) params.set("search", search);

      const selectedRole = ROLE_OPTIONS.find((option) => option.value === roleFilter);

      if (selectedRole?.roles.length) {
        params.set("roles", selectedRole.roles.join(","));
      }

      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    },
  });

  const users = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/admin/users/${id}`, patch),

    onMutate: ({ id, action }) => {
      setProcessingActions((prev) => ({
        ...prev,
        [`${id}:${action}`]: true,
      }));
    },

    onSuccess: (_response, { id, patch }) => {
      // Immediately update every cached users list.
      queryClient.setQueriesData({ queryKey: ["admin", "users"] }, (old) => {
        if (!old || !Array.isArray(old.data)) return old;

        return {
          ...old,
          data: old.data.map((user) => (user._id === id ? { ...user, ...patch } : user)),
        };
      });

      // Refresh from the server in the background.
      queryClient.invalidateQueries({
        queryKey: ["admin", "users"],
      });
    },

    onSettled: (_data, _error, variables) => {
      if (!variables) return;

      const key = `${variables.id}:${variables.action}`;

      setProcessingActions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
  });

  const isProcessingAction = (id, action) => Boolean(processingActions[`${id}:${action}`]);

  const [confirmTarget, setConfirmTarget] = useState(null);

  const toggleRole = (u) => {
    if (u.role === "superAdmin") return; // protected
    const next = u.role === "admin" ? "customer" : "admin";
    setConfirmTarget({ target: u, action: "role", next });
  };

  const toggleActive = (u) => {
    setConfirmTarget({ target: u, action: "active", nextState: !u.isActive });
  };

  const confirmDetails = (() => {
    if (!confirmTarget) return null;

    const { target, action } = confirmTarget;
    const name = target.name;

    if (action === "role") {
      const promoting = confirmTarget.next === "admin";

      return {
        title: promoting ? "Grant Admin Access?" : "Remove Admin Access?",
        description: promoting
          ? `${name}'s role will change from Customer to Admin, granting access to the administrative features and permissions assigned to the Admin role.`
          : `${name}'s role will change from Admin to Customer, removing their administrative permissions.`,
        confirmLabel: promoting ? "Grant Admin Access" : "Remove Admin Access",
        variant: "primary",
      };
    }

    const activating = confirmTarget.nextState;

    return {
      title: activating ? "Reactivate Account?" : "Deactivate Account?",
      description: activating
        ? `${name}'s account will be reactivated and its status changed to Active.`
        : `${name}'s account will be marked as inactive. You can reactivate the account later from this page.`,
      confirmLabel: activating ? "Reactivate Account" : "Deactivate Account",
      variant: activating ? "success" : "destructive",
    };
  })();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff & Users"
        subtitle="Manage staff access, customer accounts and account status."
      />

      {/* Filter bar */}
      <AdminFilterBar
        filterCount={1}
        ariaLabel="User filters"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search users..."
            ariaLabel="Search users"
            icon={Users}
          />
        }
      >
        {/* Role Filter */}
        <div className="relative min-w-0">
          <Dropdown
            trigger={
              <>
                {(() => {
                  const { icon, color } = ROLE_OPTIONS.find((s) => s.value === roleFilter);
                  const Icon = icon || Users;
                  return (
                    <Icon className={`w-4 h-4 mr-2 ${color} text-white group-hover:text-white`} />
                  );
                })()}
                <span className="flex-1 text-left whitespace-nowrap">
                  {" "}
                  {ROLE_OPTIONS.find((s) => s.value === roleFilter).label}
                </span>
              </>
            }
            color="primary"
            noBorder
            fullWidth
            menuClassName="sm:w-48"
          >
            {ROLE_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setRoleFilter(s.value);
                  setPage(1);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                  roleFilter === s.value ? "text-primary font-semibold bg-primary/5" : "text-text"
                }`}
              >
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="flex-1">{s.label}</span>
                {roleFilter === s.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </Dropdown>
        </div>
      </AdminFilterBar>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <AdminTableHeader
          title="User accounts"
          description="Review access, roles and account status."
          total={meta.total}
          countLabel="users"
        />
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !users.length ? (
            <EmptyState
              icon={<Users className="mx-auto w-10 h-10 text-text-muted" />}
              title="No users found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                  <th className="text-left py-4 px-4">User</th>
                  <th className="text-left py-4 px-4">Email</th>
                  <th className="text-left py-4 px-4">Role</th>
                  <th className="text-center py-4 px-4">Verified</th>
                  <th className="text-center py-4 px-4">Status</th>
                  <th className="text-right py-4 px-4">Joined</th>
                  <th className="text-right py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-background-soft"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full shrink-0 ring-2 ring-background-soft bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                            {getInitials(u.name)}
                          </span>
                        )}
                        <span className="font-medium text-text">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{u.email}</td>
                    <td className="py-3 px-4">
                      {isProcessingAction(u._id, "role") ? (
                        <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Updating role...
                        </span>
                      ) : (
                        <StatusPill status={u.role} map={ROLE_MAP} />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.isVerified ? (
                        <UserCheck className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <UserX className="w-4 h-4 text-rose-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isProcessingAction(u._id, "active") ? (
                        <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-amber-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {u.isActive ? "Deactivating..." : "Activating..."}
                        </span>
                      ) : (
                        <StatusPill status={String(u.isActive)} map={ACTIVE_STATUS_MAP} dot />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/users/${u._id}`)}
                          className="w-7 h-7 rounded bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                          title="View full profile"
                        >
                          <Eye className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                          onClick={() => toggleRole(u)}
                          disabled={u.role === "superAdmin" || isProcessingAction(u._id, "role")}
                          className={`w-7 h-7 rounded bg-background-soft hover:bg-primary/10 ${
                            u.role === "admin" ? "text-blue-600" : "text-slate-600"
                          } ${
                            u.role === "superAdmin" || isProcessingAction(u._id, "role")
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                          }`}
                          title={
                            u.role === "superAdmin"
                              ? "Protected"
                              : isProcessingAction(u._id, "role")
                                ? "Updating role..."
                                : "Change role"
                          }
                        >
                          {isProcessingAction(u._id, "role") ? (
                            <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" />
                          ) : u.role === "admin" || u.role === "superAdmin" ? (
                            <ShieldOff className="w-3.5 h-3.5 mx-auto" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 mx-auto" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={isProcessingAction(u._id, "active")}
                          className={`w-7 h-7 rounded bg-background-soft hover:bg-primary/10 ${
                            u.isActive ? "text-emerald-600" : "text-rose-600"
                          } ${
                            isProcessingAction(u._id, "active")
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                          }`}
                          title={
                            isProcessingAction(u._id, "active")
                              ? "Updating account..."
                              : u.isActive
                                ? "Deactivate Account"
                                : "Activate Account"
                          }
                        >
                          {isProcessingAction(u._id, "active") ? (
                            <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" />
                          ) : u.isActive ? (
                            <UserCheck className="w-3.5 h-3.5 mx-auto" />
                          ) : (
                            <UserX className="w-3.5 h-3.5 mx-auto" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isPending && users.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>

      {confirmTarget && (
        <ConfirmModal
          adminStyle
          open={!!confirmTarget}
          title={confirmDetails.title}
          description={confirmDetails.description}
          variant={confirmDetails.variant}
          confirmLabel={confirmDetails.confirmLabel}
          onConfirm={() => {
            if (!confirmTarget) return;

            if (confirmTarget.action === "role") {
              updateMutation.mutate({
                id: confirmTarget.target._id,
                action: "role",
                patch: { role: confirmTarget.next },
              });
            } else {
              updateMutation.mutate({
                id: confirmTarget.target._id,
                action: "active",
                patch: { isActive: confirmTarget.nextState },
              });
            }

            setConfirmTarget(null);
          }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;
