import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  FilterBar,
  formatNaira,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import ProductFormModal from "../../components/ui/ProductFormModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Plus, Edit, Trash2, Package, RotateCcw, Archive } from "lucide-react";
import { toast } from "sonner";

const AdminProductsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | active | archived
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | "create" | {edit: product}
  const [confirmTarget, setConfirmTarget] = useState(null); // { product, action: 'delete' }

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const { data, isPending } = useQuery({
    queryKey: ["admin", "products", page, search, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20, search });
      if (activeFilter !== "all") params.set("isActive", String(activeFilter === "active"));
      const res = await api.get(`/products/all?${params.toString()}`);
      return res.data;
    },
  });

  const products = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

  const archiveMutation = useMutation({
    mutationFn: async (p) => api.put(`/products/${p._id}`, { isActive: !p.isActive }),
    onSuccess: invalidate,
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id) => api.put(`/products/${id}`, { isActive: false }),
    onSuccess: invalidate,
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}?permanent=true`),
    onSuccess: () => {
      invalidate();
      toast.success("Product permanently deleted");
    },
  });

  const handleArchive = (p) => {
    archiveMutation.mutate(p);
  };

  const handleSoftDelete = (p) => {
    if (!window.confirm(`Archive "${p.name}"? This removes it from the store.`)) return;
    softDeleteMutation.mutate(p._id);
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
      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        selects={[
          {
            label: "filter",
            value: activeFilter,
            onChange: (v) => {
              setActiveFilter(v);
              setPage(1);
            },
            options: [
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
      />
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
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
                <tr className="bg-background-soft/50">
                  <th className="text-left font-medium py-3 px-4">Product</th>
                  <th className="text-left font-medium py-3 px-4">Category</th>
                  <th className="text-right font-medium py-3 px-4">Price</th>
                  <th className="text-right font-medium py-3 px-4">Stock</th>
                  <th className="text-center font-medium py-3 px-4">Status</th>
                  <th className="text-right font-medium py-3 px-4">Added</th>
                  <th className="text-center font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-background-soft/30">
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
                    <td className="py-3 px-4 text-text-muted">{p.category?.name || "—"}</td>
                    <td className="py-3 px-4 text-right font-heading font-semibold">
                      {formatNaira(p.price)}
                    </td>
                    <td className="py-3 px-4 text-right">{p.stock}</td>
                    <td className="py-3 px-4 text-center">
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleSoftDelete(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors"
                            >
                              <Archive className="w-3 h-3" /> Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleArchive(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-emerald-50  text-text-muted hover:text-emerald-700 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-500 text-text-muted hover:text-rose-200 transition-colors"
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

      {/* Permanent Delete Confirmation */}
      <ConfirmModal
        open={confirmTarget !== null}
        title="Permanently delete product?"
        description={`This will permanently remove "${confirmTarget?.product?.name}" and its images. This action cannot be undone.`}
        confirmLabel="Delete forever"
        confirmVariant="destructive"
        onConfirm={() => {
          if (confirmTarget?.action === "delete") {
            permanentDeleteMutation.mutate(confirmTarget.product._id);
          }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default AdminProductsPage;
