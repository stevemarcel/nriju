import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  FilterBar,
  formatDate,
  confirmDelete,
} from "../../components/admin/AdminPrimitives";
import { Users, Shield, ShieldOff, UserCheck, UserX, ShieldCheck } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "customer", label: "Customers" },
  { value: "admin", label: "Admins" },
  { value: "superAdmin", label: "Super Admins" },
];

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "users", page, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    },
  });

  const users = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/admin/users/${id}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const toggleRole = (u) => {
    if (u.role === "superAdmin") return; // protected
    const next = u.role === "admin" ? "customer" : "admin";
    if (confirmDelete(`Change ${u.name}'s role to ${next}?`)) {
      updateMutation.mutate({ id: u._id, patch: { role: next } });
    }
  };

  const toggleActive = (u) => {
    if (!confirmDelete(`Set ${u.name} as ${u.isActive ? "inactive" : "active"}?`)) return;
    updateMutation.mutate({ id: u._id, patch: { isActive: !u.isActive } });
  };

  return (
    <div>
      <AdminPageHeader
        title="Staff & Users"
        subtitle={`Showing ${users.length} of ${meta.total} users.`}
      />

      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        selects={[
          {
            label: "role",
            value: roleFilter,
            onChange: (v) => {
              setRoleFilter(v);
              setPage(1);
            },
            options: ROLE_OPTIONS,
          },
        ]}
      />

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !users.length ? (
            <EmptyState
              icon={<Users className="mx-auto w-10 h-10 text-text-muted" />}
              title="No users found"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-soft/50">
                  <th className="text-left font-medium py-3 px-4">User</th>
                  <th className="text-left font-medium py-3 px-4">Email</th>
                  <th className="text-left font-medium py-3 px-4">Role</th>
                  <th className="text-center font-medium py-3 px-4">Verified</th>
                  <th className="text-center font-medium py-3 px-4">Active</th>
                  <th className="text-right font-medium py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          u.role === "superAdmin"
                            ? "bg-amber-100 text-amber-800"
                            : u.role === "admin"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.isVerified ? (
                        <UserCheck className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <UserX className="w-4 h-4 text-rose-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.isActive ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => toggleRole(u)}
                          className={`w-7 h-7 rounded bg-background-soft hover:bg-primary/10 ${
                            u.role === "admin" ? "text-blue-600" : "text-slate-600"
                          } ${u.role === "superAdmin" ? "opacity-40 cursor-not-allowed" : ""}`}
                          title={u.role === "superAdmin" ? "Protected" : "Toggle role"}
                          disabled={u.role === "superAdmin"}
                        >
                          {u.role === "admin" || u.role === "superAdmin" ? (
                            <ShieldOff className="w-3.5 h-3.5 mx-auto" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 mx-auto" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          className={`w-7 h-7 rounded bg-background-soft hover:bg-primary/10 ${
                            u.isActive ? "text-emerald-600" : "text-rose-600"
                          }`}
                          title={u.isActive ? "Deactivate" : "Activate"}
                        >
                          {u.isActive ? (
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
    </div>
  );
};

export default AdminUsers;
