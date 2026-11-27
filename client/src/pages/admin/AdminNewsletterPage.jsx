import { useState } from "react";
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
} from "../../components/admin/AdminPrimitives";
import { useAdminRealtimeRefresh } from "../../hooks/useAdminRealtimeRefresh";
import { formatDate } from "../../utils/formatDate";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Trash2, Download, Mail } from "lucide-react";
import { toast } from "sonner";

const AdminNewsletterPage = () => {
  useAdminRealtimeRefresh();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "newsletter", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      const res = await api.get(`/newsletter?${params.toString()}`);
      return res.data;
    },
  });

  const subscribers = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "newsletter"] });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/newsletter/${id}`),
    onSuccess: () => {
      toast.success("Subscriber removed");
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to remove subscriber");
    },
  });

  const handleExport = async () => {
    try {
      const res = await api.get("/newsletter/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "nriju-subscribers.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Subscriber list exported");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to export subscribers");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Newsletter Subscribers"
        subtitle="View and manage audience email subscriptions."
        action={
          <button
            onClick={handleExport}
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white font-medium rounded-lg inline-flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <AdminFilterBar
        filterCount={0}
        ariaLabel="Subscriber search"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search email addresses..."
            ariaLabel="Search subscribers"
          />
        }
      />

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <AdminTableHeader
          title="Subscribers"
          description="Audience members subscribed to receive email updates."
          total={meta.total}
          countLabel="subscribers"
        />
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={3} />
          ) : !subscribers.length ? (
            <EmptyState
              icon={<Mail className="mx-auto w-10 h-10 text-text-muted" />}
              title="No subscribers found"
              description={
                search
                  ? "No subscriber emails matched your search."
                  : "Subscribers will appear here when users sign up via the newsletter form."
              }
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                  <th className="text-left py-4 px-4">Email Address</th>
                  <th className="text-left py-4 px-4">Subscribed On</th>
                  <th className="text-center py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {subscribers.map((s) => (
                  <tr key={s._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4 font-medium text-text">{s.email}</td>
                    <td className="py-3 px-4 text-text-muted">{formatDate(s.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors"
                        title="Remove subscriber"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isPending && subscribers.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>

      {deleteTarget && (
        <ConfirmModal
          open
          title="Remove subscriber?"
          description={`This will permanently remove "${deleteTarget.email}" from the newsletter audience.`}
          confirmLabel="Remove"
          variant="destructive"
          adminStyle
          onConfirm={() => {
            deleteMutation.mutate(deleteTarget._id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminNewsletterPage;
