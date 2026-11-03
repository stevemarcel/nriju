import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  formatNaira,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import ProductFormModal from "../../components/ui/ProductFormModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  RotateCcw,
  Archive,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const AdminProductsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | archived | lowStock | outOfStock
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | "create" | {edit: product}
  const [confirmTarget, setConfirmTarget] = useState(null); // { product, action: 'delete' }
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processingIds, setProcessingIds] = useState(new Set());
  const isProcessing = (id) => processingIds.has(id);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const { data, isPending } = useQuery({
    queryKey: ["admin", "products", page, search, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 10, search });
      if (statusFilter === "archived") params.set("isActive", "false");
      else if (statusFilter === "active") params.set("isActive", "true");
      else if (statusFilter === "lowStock") params.set("stockFilter", "lowStock");
      else if (statusFilter === "outOfStock") params.set("stockFilter", "outOfStock");
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await api.get(`/products/all?${params.toString()}`);
      return res.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["admin", "products", "stats", statusFilter, categoryFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter === "archived") params.set("isActive", "false");
      else if (statusFilter === "active") params.set("isActive", "true");
      else if (statusFilter === "lowStock") params.set("stockFilter", "lowStock");
      else if (statusFilter === "outOfStock") params.set("stockFilter", "outOfStock");
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      const res = await api.get(`/products/stats?${params.toString()}`);
      return res.data;
    },
  });

  const stats = statsData?.data ?? { total: 0, active: 0, lowStock: 0, outOfStock: 0 };

  const products = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p._id)),
    );

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    setConfirmTarget({ action: "bulk-archive", ids: [...selectedIds] });
  };

  const handleBulkRestore = () => {
    if (selectedIds.size === 0) return;
    setConfirmTarget({ action: "bulk-restore", ids: [...selectedIds] });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmTarget({ action: "bulk-delete", ids: [...selectedIds] });
  };

  const selectedProducts = products.filter((p) => selectedIds.has(p._id));
  const hasArchived = selectedProducts.some((p) => !p.isActive);
  const hasActive = selectedProducts.some((p) => p.isActive);

  // Optimistically flip the cached row status so the UI reflects the new
  // state immediately. Without this, invalidateQueries triggers an async
  // refetch while onSettled already clears the processing flag, so the row
  // flickers back to the stale status ("Active") before the refetch lands.
  // For deletions, drop the rows outright instead of leaving a stale
  // "Archived" entry behind.
  const optimisticUpdate = (ids, isActive, { remove = false } = {}) => {
    queryClient.setQueriesData(["admin", "products"], (old) => {
      // The prefix also matches the stats query, whose data is an object.
      if (!old || !Array.isArray(old.data)) return old;
      return {
        ...old,
        data: remove
          ? old.data.filter((p) => !ids.includes(p._id))
          : old.data.map((p) => (ids.includes(p._id) ? { ...p, isActive } : p)),
      };
    });
  };

  const archiveMutation = useMutation({
    mutationFn: async (p) => {
      optimisticUpdate([p._id], !p.isActive);
      setProcessingIds((prev) => new Set(prev).add(p._id));
      return api.put(`/products/${p._id}`, { isActive: !p.isActive });
    },
    onSuccess: (_data, p) => {
      invalidate();
      toast.success(p.isActive ? "Product archived" : "Product restored");
    },
    onError: invalidate,
    onSettled: (_data, _err, p) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(p._id);
        return next;
      }),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id) => {
      optimisticUpdate([id], false);
      setProcessingIds((prev) => new Set(prev).add(id));
      return api.put(`/products/${id}`, { isActive: false });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Product archived");
    },
    onError: invalidate,
    onSettled: (_data, _err, id) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => {
      optimisticUpdate([id], false, { remove: true });
      setProcessingIds((prev) => new Set(prev).add(id));
      return api.delete(`/products/${id}?permanent=true`);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Product permanently deleted");
    },
    onError: invalidate,
    onSettled: (_data, _err, id) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids) => {
      optimisticUpdate(ids, false);
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      return Promise.all(ids.map((id) => api.put(`/products/${id}`, { isActive: false })));
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidate();
      toast.success("Products archived");
    },
    onError: invalidate,
    onSettled: (_data, _err, ids) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => {
      optimisticUpdate(ids, false, { remove: true });
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      return Promise.all(ids.map((id) => api.delete(`/products/${id}?permanent=true`)));
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidate();
      toast.success("Products deleted");
    },
    onError: invalidate,
    onSettled: (_data, _err, ids) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }),
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: (ids) => {
      optimisticUpdate(ids, true);
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      return Promise.all(ids.map((id) => api.put(`/products/${id}`, { isActive: true })));
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidate();
      toast.success("Products restored");
    },
    onError: invalidate,
    onSettled: (_data, _err, ids) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }),
  });

  const handleArchive = (p) => {
    archiveMutation.mutate(p);
  };

  const handleSoftDelete = (p) => {
    setConfirmTarget({ product: p, action: "archive" });
  };

  const handlePermanentDelete = (p) => {
    setConfirmTarget({ product: p, action: "delete" });
  };

  const toggleModal = (v) => setModal(v);

  return (
    <div>
      <AdminPageHeader
        title="Products"
        subtitle={`${products.length} products on this page.`}
        action={
          <button
            onClick={() => toggleModal("create")}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2 hover:bg-primary/95 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
      />
      {/* Filter bar */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-primary text-white border-0 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
          >
            <option value="all">All Products</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="lowStock">Low in stock</option>
            <option value="outOfStock">Out of stock</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-primary text-white border-0 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "TOTAL", value: stats.total, color: "text-text" },
          { label: "ACTIVE", value: stats.active, color: "text-emerald-700" },
          { label: "LOW STOCK", value: stats.lowStock, color: "text-amber-600" },
          { label: "OUT OF STOCK", value: stats.outOfStock, color: "text-rose-600" },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide">{s.label}</div>
            <div className={`text-2xl font-heading font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-surface border border-border p-4 mb-4 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              {hasActive && (
                <button
                  onClick={handleBulkArchive}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" /> Archive ({selectedIds.size})
                </button>
              )}
              {hasArchived && (
                <button
                  onClick={handleBulkRestore}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background-soft hover:bg-emerald-50 text-text-muted hover:text-emerald-700 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Restore ({selectedIds.size})
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete ({selectedIds.size})
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={7} />
          ) : !products.length ? (
            <EmptyState
              icon={<Package className="mx-auto w-10 h-10 text-text-muted" />}
              title="No products found"
              description="Try adjusting the search or filters."
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
                  <th className="py-4 px-4 w-10">
                    <button
                      onClick={toggleAll}
                      aria-label={
                        products.length > 0 && selectedIds.size === products.length
                          ? "Deselect all products"
                          : "Select all products"
                      }
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                        products.length > 0 && selectedIds.size === products.length
                          ? "border-on-accent bg-on-accent"
                          : "border-white/60 bg-transparent hover:border-on-accent"
                      }`}
                    >
                      {products.length > 0 && selectedIds.size === products.length && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4">Product</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Price</th>
                  <th className="py-4 px-4">Stock</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Added</th>
                  <th className="py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {products.map((p) => (
                  <tr
                    key={p._id}
                    className={`hover:bg-background-soft/30 ${
                      selectedIds.has(p._id) ? "selected" : ""
                    }`}
                    style={
                      selectedIds.has(p._id)
                        ? { backgroundColor: "rgba(154, 43, 33, 0.08)" }
                        : undefined
                    }
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleSelect(p._id)}
                        aria-label={
                          selectedIds.has(p._id) ? `Deselect ${p.name}` : `Select ${p.name}`
                        }
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                          selectedIds.has(p._id)
                            ? "border-primary bg-primary"
                            : "border-border bg-transparent hover:border-primary/50"
                        }`}
                      >
                        {selectedIds.has(p._id) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-on-accent" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-background-soft flex items-center justify-center">
                            <Package className="w-5 h-5 text-text-muted" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-medium text-text truncate block">{p.name}</span>
                          <span className="text-xs text-text-muted">{p.unit}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-left py-3 px-4 text-text-muted">
                      {p.category?.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-left font-heading font-semibold">
                      {formatNaira(p.price)}
                    </td>
                    <td className="text-left py-3 px-4">{p.stock}</td>
                    <td className="py-3 px-4 text-center">
                      {isProcessing(p._id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {p.isActive ? (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          )}
                          {p.isActive ? "Active" : "Archived"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        {p.isActive ? (
                          <>
                            <button
                              onClick={() => toggleModal({ edit: p })}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleSoftDelete(p)}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Archive className="w-3 h-3" /> Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleArchive(p)}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-emerald-50  text-text-muted hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(p)}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-500 text-text-muted hover:text-rose-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        )}
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

      {/* Create / Edit Modal */}
      {modal && (
        <ProductFormModal
          key={modal === "create" ? "create" : `edit-${modal.edit._id}`}
          mode={modal === "create" ? "create" : "edit"}
          product={modal === "create" ? null : modal.edit}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            invalidate();
          }}
        />
      )}

      {/* Archive / Permanent Delete Confirmation */}
      <ConfirmModal
        open={confirmTarget !== null}
        title={
          confirmTarget?.action === "archive" || confirmTarget?.action === "bulk-archive"
            ? confirmTarget?.ids
              ? `Archive ${confirmTarget.ids.length} product${confirmTarget.ids.length > 1 ? "s" : ""}?`
              : "Archive product?"
            : confirmTarget?.action === "restore" || confirmTarget?.action === "bulk-restore"
              ? confirmTarget?.ids
                ? `Restore ${confirmTarget.ids.length} product${confirmTarget.ids.length > 1 ? "s" : ""}?`
                : "Restore product?"
              : confirmTarget?.action === "delete"
                ? "Permanently delete product?"
                : `Delete ${confirmTarget?.ids?.length} product${confirmTarget?.ids?.length > 1 ? "s" : ""}?`
        }
        description={
          confirmTarget?.ids ? (
            confirmTarget.action === "bulk-archive" ? (
              <>
                Archive {confirmTarget.ids.length} product{confirmTarget.ids.length > 1 ? "s" : ""}?
                They will be removed from the store.
              </>
            ) : confirmTarget.action === "bulk-restore" ? (
              <>
                Restore {confirmTarget.ids.length} product{confirmTarget.ids.length > 1 ? "s" : ""}?
                They will be back in the store.
              </>
            ) : (
              <>
                This will permanently remove {confirmTarget.ids.length} products and their images.
                This action cannot be undone.
              </>
            )
          ) : confirmTarget?.action === "archive" ? (
            `Archive "${confirmTarget?.product?.name}"? It will be removed from the store.`
          ) : confirmTarget?.action === "restore" ? (
            `Restore "${confirmTarget?.product?.name}"? It will be back in the store.`
          ) : (
            `This will permanently remove "${confirmTarget?.product?.name}" and its images. This action cannot be undone.`
          )
        }
        confirmLabel={
          confirmTarget?.action === "archive"
            ? "Archive"
            : confirmTarget?.action === "bulk-archive"
              ? `Archive ${confirmTarget.ids.length}`
              : confirmTarget?.action === "bulk-restore"
                ? `Restore ${confirmTarget.ids.length}`
                : confirmTarget?.action === "restore"
                  ? "Restore"
                  : confirmTarget?.action === "bulk-delete"
                    ? `Delete ${confirmTarget.ids.length}`
                    : "Delete forever"
        }
        confirmVariant={
          confirmTarget?.action === "archive" || confirmTarget?.action === "bulk-archive"
            ? "primary"
            : confirmTarget?.action === "restore" || confirmTarget?.action === "bulk-restore"
              ? "primary"
              : "destructive"
        }
        onConfirm={() => {
          if (confirmTarget?.action === "archive") {
            softDeleteMutation.mutate(confirmTarget.product._id);
          } else if (confirmTarget?.action === "delete") {
            permanentDeleteMutation.mutate(confirmTarget.product._id);
          } else if (confirmTarget?.action === "bulk-archive") {
            bulkArchiveMutation.mutate(confirmTarget.ids);
          } else if (confirmTarget?.action === "bulk-restore") {
            bulkRestoreMutation.mutate(confirmTarget.ids);
          } else if (confirmTarget?.action === "bulk-delete") {
            bulkDeleteMutation.mutate(confirmTarget.ids);
          }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default AdminProductsPage;
