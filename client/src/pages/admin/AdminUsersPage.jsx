import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  StatusPill,
  formatDate,
} from "../../components/admin/AdminPrimitives";
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
  Check,
  Loader2,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "", label: "All roles", roles: [], icon: Users, color: "text-text-muted" },
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
};

const ACTIVE_STATUS_MAP = {
  true: { label: "Active", cls: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  false: { label: "Inactive", cls: "bg-slate-100 text-slate-600", dotColor: "bg-slate-500" },
};

const AdminUsersPage = () => {
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
    <div>
      <AdminPageHeader title="Staff & Users" />

      {/* Filter bar */}
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-4 mb-4 flex flex-col items-stretch md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-3 min-w-0">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap flex-2">
          {/* Role Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
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
        </div>
      </div>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
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
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
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
                      <span className="font-medium text-text">{u.name}</span>
                      {u.role === "superAdmin" && (
                        <ShieldCheck
                          className="w-3 h-3 text-amber-400 inline-block ml-1"
                          title="Super admin"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-muted">{u.email}</td>
                    <td className="py-3 px-4 text-center">
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
      </div>

      <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} />

      {confirmTarget && (
        <ConfirmModal
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
