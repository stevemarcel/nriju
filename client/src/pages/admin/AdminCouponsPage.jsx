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
  formatNaira,
} from "../../components/admin/AdminPrimitives";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Plus, Edit, Trash2, Save, X, Ticket, Search } from "lucide-react";
import { toKobo } from "../../utils/formatMoney";

const COUPON_STATUS_MAP = {
  active: { label: "Active", cls: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-600" },
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
    <div>
      <AdminPageHeader
        title="Coupons"
        subtitle={`${coupons.length} coupons on this page.`}
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
            placeholder="Search coupons..."
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
      </div>

      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
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
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
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
                      <StatusPill status={c.isActive ? "active" : "inactive"} map={COUPON_STATUS_MAP} />
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
      </div>

      <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} />

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
    </div>
  );
};

const CouponFormModal = ({ mode, coupon, onClose, onSaved }) => {
  const [form, setForm] = useState(() => {
    if (mode === "edit" && coupon) {
      return {
        code: coupon.code ?? "",
        type: coupon.type ?? "percent",
        value: coupon.value ?? "",
        minOrder: coupon.minOrder ? coupon.minOrder / 100 : "",
        maxDiscount: coupon.maxDiscount ? coupon.maxDiscount / 100 : "",
        expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 10) : "",
        usageLimit: coupon.usageLimit ?? "",
        isActive: coupon.isActive ?? true,
      };
    }
    return {
      code: "",
      type: "percent",
      value: "",
      minOrder: "",
      maxDiscount: "",
      expiryDate: "",
      usageLimit: "",
      isActive: true,
    };
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (e) => {
      e.preventDefault();
      const payload = {
        code: form.code,
        type: form.type,
        value: form.type === "percent" ? Number(form.value) : toKobo(form.value),
        minOrder: form.minOrder ? toKobo(form.minOrder) : 0,
        maxDiscount: form.maxDiscount ? toKobo(form.maxDiscount) : null,
        expiryDate: form.expiryDate,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        isActive: form.isActive,
      };
      if (mode === "edit" && coupon) {
        return api.put(`/coupons/${coupon._id}`, payload);
      }
      return api.post("/coupons", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      onSaved();
    },
  });

  if (!mode) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-xl font-bold text-text">
            {mode === "create" ? "Add Coupon" : `Edit "${coupon?.code}"`}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-background-soft">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => saveMutation.mutate(e)}
          className="flex-1 overflow-y-auto p-5 space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat amount</option>
                <option value="freeship">Free shipping</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {form.type === "percent" ? "Percent value *" : "Flat amount (₦) *"}
              </label>
              <input
                type="number"
                step={form.type === "percent" ? "1" : "0.01"}
                required
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Min Order (₦)</label>
              <input
                type="number"
                step="0.01"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Max Discount (₦)</label>
              <input
                type="number"
                step="0.01"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Expiry Date *</label>
              <input
                type="date"
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : "" })
                }
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                placeholder="Unlimited"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label className="text-sm">Active</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-muted hover:bg-background-soft rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" /> {mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCouponsPage;
