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
  StatusPill,
} from "../../components/admin/AdminPrimitives";
import { formatDate } from "../../utils/formatDate";
import { formatNaira } from "../../utils/formatMoney";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import CouponFormModal from "../../components/admin/CouponFormModal";
import { Plus, Edit, Trash2, Ticket } from "lucide-react";

const COUPON_STATUS_MAP = {
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

// A coupon is inactive when it is toggled off OR its expiry date has passed.
const isCouponActive = (c) => {
  if (!c.isActive) return false;
  if (c.expiryDate && new Date(c.expiryDate) < new Date(new Date().toDateString())) return false;
  return true;
};

const AdminCouponsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | "create" | {edit}

  const { data, isPending } = useQuery({
    queryKey: ["admin", "coupons", page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      // No search param in the API; we filter client-side below instead.
      const res = await api.get(`/coupons?${new URLSearchParams({ page, limit: 20 }).toString()}`);
      return res.data;
    },
  });

  const coupons = search
    ? (data?.data ?? []).filter(
        (c) =>
          c.code?.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : (data?.data ?? []);
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });

  const [deleteTarget, setDeleteTarget] = useState(null);

  // The old delete handler called api.delete without awaiting, then
  // invalidated — which could fire before the request landed. A real
  // mutation keeps the request in flight until the cache clears.
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/coupons/${id}`),
    onSuccess: invalidate,
  });

  const handleDelete = (c) => setDeleteTarget(c);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Coupons"
        subtitle="Create and manage discount codes, usage limits and expiry dates."
        action={
          <button
            onClick={() => setModal("create")}
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white font-medium rounded-lg inline-flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Coupon
          </button>
        }
      />

      {/* Filter bar */}
      <AdminFilterBar
        filterCount={0}
        ariaLabel="Coupon search"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search coupons..."
            ariaLabel="Search coupons"
          />
        }
      />

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <AdminTableHeader
          title="Discount codes"
          description="Review availability, usage limits and expiry dates."
          total={meta.total}
          countLabel="coupons"
        />
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={7} />
          ) : !coupons.length ? (
            <EmptyState
              icon={<Ticket className="mx-auto w-10 h-10 text-text-muted" />}
              title="No coupons found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                  <th className="text-left py-4 px-4">Code</th>
                  <th className="text-left py-4 px-4">Type</th>
                  <th className="text-right py-4 px-4">Value</th>
                  <th className="text-right py-4 px-4">Min Order</th>
                  <th className="text-center py-4 px-4">Status</th>
                  <th className="text-right py-4 px-4">Expires</th>
                  <th className="text-center py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {coupons.map((c) => (
                  <tr key={c._id} className="hover:bg-background-soft/30">
                    <td className="py-3 px-4">
                      <span className="font-medium text-text">{c.code}</span>
                      <span className="block text-xs text-text-muted">
                        {c.usedCount || 0}/{c.usageLimit || "∞"} used
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-text-muted">{c.type}</td>
                    <td className="py-3 px-4 text-right font-medium text-text">
                      {c.type === "percent" ? `${c.value}%` : formatNaira(c.value)}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatNaira(c.minOrder || 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusPill status={String(isCouponActive(c))} map={COUPON_STATUS_MAP} dot />
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(c.expiryDate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setModal({ edit: c })}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isPending && coupons.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>

      <CouponFormModal
        key={modal ? (modal === "create" ? "create" : "edit-" + modal.edit._id) : "closed"}
        mode={modal === "create" ? "create" : modal?.edit ? "edit" : null}
        coupon={modal?.edit}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          invalidate();
        }}
      />

      {deleteTarget && (
        <ConfirmModal
          open
          title="Delete coupon?"
          description={`This will permanently remove "${deleteTarget.code}". This action cannot be undone.`}
          confirmLabel="Delete"
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

export default AdminCouponsPage;
