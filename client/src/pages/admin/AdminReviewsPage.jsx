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
import { Star, Search, Check, Clock, CheckCircle, X } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "", label: "All", icon: Star, color: "text-text-muted" },
  { value: "pending", label: "Pending", icon: Clock, color: "text-amber-500" },
  { value: "approved", label: "Approved", icon: CheckCircle, color: "text-emerald-500" },
  { value: "rejected", label: "Rejected", icon: X, color: "text-rose-500" },
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
  const [moderateTarget, setModerateTarget] = useState(null);

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

  const handleModerate = (r, newStatus) => setModerateTarget({ review: r, status: newStatus });

  return (
    <div>
      <AdminPageHeader title="Reviews" subtitle={`${reviews.length} reviews on this page.`} />

      {/* Filter bar */}
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-4 mb-4 flex flex-col items-stretch md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-3 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search reviews..."
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap flex-2">
          {/* Status Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
            <Dropdown
              trigger={
                <>
                  {(() => {
                    const { icon, color } = FILTER_OPTIONS.find((s) => s.value === statusFilter);
                    const Icon = icon || Star;
                    return (
                      <Icon className={`w-4 h-4 mr-2 ${color} text-white group-hover:text-white`} />
                    );
                  })()}
                  <span className="flex-1 text-left whitespace-nowrap">
                    {" "}
                    {FILTER_OPTIONS.find((s) => s.value === statusFilter).label}
                  </span>
                </>
              }
              color="primary"
              fullWidth
              menuClassName="sm:w-48"
            >
              {FILTER_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatusFilter(s.value);
                    setPage(1);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                    statusFilter === s.value
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-text"
                  }`}
                >
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="flex-1">{s.label}</span>
                  {statusFilter === s.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </Dropdown>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={7} />
          ) : !reviews.length ? (
            <EmptyState
              icon={<Star className="mx-auto w-10 h-10 text-text-muted" />}
              title="No reviews found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
                  <th className="text-left py-4 px-4">Product</th>
                  <th className="text-left py-4 px-4">Reviewer</th>
                  <th className="text-center py-4 px-4">Rating</th>
                  <th className="text-left py-4 px-4">Title</th>
                  <th className="text-center py-4 px-4">Status</th>
                  <th className="text-right py-4 px-4">Date</th>
                  <th className="text-center py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
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
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleModerate(r, "approved")}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleModerate(r, "rejected")}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
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

      {moderateTarget && (
        <ConfirmModal
          open={!!moderateTarget}
          title="Moderate review"
          description={`Mark this review as ${moderateTarget.status}?`}
          variant="primary"
          confirmLabel="Continue"
          onConfirm={() => {
            moderateMutation.mutate({
              id: moderateTarget.review._id,
              patch: { status: moderateTarget.status },
            });
            setModerateTarget(null);
          }}
          onCancel={() => setModerateTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminReviewsPage;
