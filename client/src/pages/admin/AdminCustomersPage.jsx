import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  AdminTableHeader,
  AdminTablePagination,
  ADMIN_TABLE_HEAD_ROW_CLASS,
  TableSkeleton,
  EmptyState,
  FilterBar,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import { Users, UserCheck, UserX, Mail } from "lucide-react";

const AdminCustomersPage = () => {
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
        subtitle="Manage customer accounts, contact details and account status."
      />

      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        selects={[]}
      />

      <div className="overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm">
        <AdminTableHeader
          title="Customer list"
          description="Review contact details and account status."
          total={meta.total}
          countLabel="customers"
        />
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !customers.length ? (
            <EmptyState
              icon={<Users className="mx-auto w-10 h-10 text-text-muted" />}
              title="No customers found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                  <th className="px-4 py-4 text-left">Customer</th>
                  <th className="px-4 py-4 text-left">Email</th>
                  <th className="px-4 py-4 text-left">Phone</th>
                  <th className="px-4 py-4 text-center">Verified</th>
                  <th className="px-4 py-4 text-center">Active</th>
                  <th className="px-4 py-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="admin-table divide-y divide-border">
                {customers.map((u) => (
                  <tr key={u._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm shrink-0">
                            {u.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <span className="font-medium text-text truncate">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted truncate max-w-88">{u.email}</td>
                    <td className="py-3 px-4 text-text-muted truncate max-w-48">
                      {u.phone || "—"}
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isPending && customers.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
};

export default AdminCustomersPage;
