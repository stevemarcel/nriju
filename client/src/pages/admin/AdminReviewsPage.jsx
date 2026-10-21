import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  FilterBar,
  StatusPill,
  formatDate,
  confirmDelete,
} from "../../components/admin/AdminPrimitives";
import { Star } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_MAP = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
};

const AdminReviewsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "reviews", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/reviews/all?${params.toString()}`);
      return res.data;
    },
  });

  const reviews = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const moderateMutation = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/reviews/${id}/moderate`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  const handleModerate = (r, newStatus) => {
    if (!confirmDelete(`Mark this review as ${newStatus}?`)) return;
    moderateMutation.mutate({ id: r._id, patch: { status: newStatus } });
  };

  return (
    <div>
      <AdminPageHeader title="Reviews" subtitle={`${reviews.length} reviews on this page.`} />

      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        selects={[
          {
            label: "status",
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setPage(1);
            },
            options: FILTER_OPTIONS,
          },
        ]}
      />

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={6} />
          ) : !reviews.length ? (
            <EmptyState
              icon={<Star className="mx-auto w-10 h-10 text-text-muted" />}
              title="No reviews found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-background-soft/50">
                  <th className="text-left font-medium py-3 px-4">Product</th>
                  <th className="text-left font-medium py-3 px-4">Reviewer</th>
                  <th className="center font-medium py-3 px-4">Rating</th>
                  <th className="text-left font-medium py-3 px-4">Title</th>
                  <th className="center font-medium py-3 px-4">Status</th>
                  <th className="text-right font-medium py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((r) => (
                  <tr key={r._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4 text-text">{r.product?.name || "—"}</td>
                    <td className="py-3 px-4 text-text-muted">{r.user?.name || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{r.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted max-w-xs truncate">{r.title}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusPill status={r.status} map={STATUS_MAP} />
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.status === "pending" && (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleModerate(r, "approved")}
                            className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleModerate(r, "rejected")}
                            className="px-2 py-1 text-xs bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
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

export default AdminReviewsPage;
