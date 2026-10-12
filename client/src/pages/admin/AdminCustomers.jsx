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
} from "../../components/admin/AdminPrimitives";
import { Users, UserCheck, UserX, Mail } from "lucide-react";

const AdminCustomers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "customers", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      params.set("role", "customer");
      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    },
  });

  const customers = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        subtitle={`Showing ${customers.length} of ${meta.total} customers.`}
      />

      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        selects={[]}
      />

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !customers.length ? (
            <EmptyState
              icon={<Users className="mx-auto w-10 h-10 text-text-muted" />}
              title="No customers found"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background/50">
                  <th className="text-left font-medium py-3 px-4">Customer</th>
                  <th className="text-left font-medium py-3 px-4">Email</th>
                  <th className="text-left font-medium py-3 px-4">Phone</th>
                  <th className="text-center font-medium py-3 px-4">Verified</th>
                  <th className="text-center font-medium py-3 px-4">Active</th>
                  <th className="text-right font-medium py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((u) => (
                  <tr key={u._id} className="hover:bg-background/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center">
                            <Users className="w-4 h-4 text-text-muted" />
                          </div>
                        )}
                        <span className="font-medium text-text">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{u.email}</td>
                    <td className="py-3 px-4 text-text-muted">{u.phone || "—"}</td>
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

export { AdminCustomers };
