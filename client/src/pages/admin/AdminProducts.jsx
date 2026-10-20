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
  confirmDelete,
} from "../../components/admin/AdminPrimitives";
import { Plus, Edit, Trash2, Save, X, Package } from "lucide-react";
import { toast } from "sonner";
import { toKobo } from "../../utils/formatMoney";

const CATEGORY_OPTIONS = []; // populated from /categories at runtime below

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | active | archived
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | "create" | {edit: product}

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

  // Soft delete: the backend only hides the product, it stays in the DB so
  // it can be restored. A hard DELETE would wipe it forever.
  const softDeleteMutation = useMutation({
    mutationFn: (id) => api.put(`/products/${id}`, { isActive: false }),
    onSuccess: invalidate,
  });

  const handleArchive = (p) => {
    archiveMutation.mutate(p, {
      onSuccess: () => {},
    });
  };

  const handleDelete = (p) => {
    if (!confirmDelete(`Archive "${p.name}"? This removes it from the store.`)) return;
    softDeleteMutation.mutate(p._id);
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
                        className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          p.isActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {p.isActive ? "Active" : "Archived"}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => toggleModal({ edit: p })}
                          className="w-7 h-7 rounded bg-background-soft hover:bg-primary/10 text-primary"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleArchive(p)}
                          className="w-7 h-7 rounded bg-background-soft hover:bg-primary/10 text-primary"
                          title={p.isActive ? "Archive" : "Restore"}
                        >
                          {p.isActive ? (
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          ) : (
                            <Package className="w-3.5 h-3.5 mx-auto" />
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

      {/* Create / Edit Modal */}
      <ProductFormModal
        key={modal ? (modal === "create" ? "create" : "edit-" + modal.edit._id) : "closed"}
        mode={modal === "create" ? "create" : modal?.edit ? "edit" : null}
        product={modal?.edit}
        categories={categories}
        onClose={() => toggleModal(null)}
        onSaved={() => {
          toggleModal(null);
          invalidate();
        }}
      />
    </div>
  );
};

// ── Shared create/edit modal ─────────────────────────────────────────
const initialForm = {
  name: "",
  description: "",
  price: "",
  compareAtPrice: "",
  unit: "portion",
  productType: "packaged",
  category: "",
  images: [],
  tags: "",
  isFeatured: false,
  isActive: true,
  notifyOnOutOfStock: false,
};

const ProductFormModal = ({ mode, product, categories, onClose, onSaved }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    if (mode === "edit" && product) {
      return {
        name: product.name ?? "",
        description: product.description ?? "",
        price: product.price ? product.price / 100 : "",
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice / 100 : "",
        unit: product.unit ?? "portion",
        productType: product.productType ?? "packaged",
        category: product.category?._id ?? product.category ?? "",
        images: product.images ?? [],
        tags: (product.tags ?? []).join(", "),
        isFeatured: product.isFeatured ?? false,
        isActive: product.isActive ?? true,
        notifyOnOutOfStock: product.notifyOnOutOfStock ?? false,
      };
    }
    return { ...initialForm };
  });

  const saveMutation = useMutation({
    mutationFn: async (e) => {
      e.preventDefault();
      const payload = {
        name: form.name,
        description: form.description,
        price: toKobo(form.price),
        compareAtPrice: form.compareAtPrice ? toKobo(form.compareAtPrice) : null,
        unit: form.unit,
        productType: form.productType,
        category: form.category,
        images: form.images,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        notifyOnOutOfStock: form.notifyOnOutOfStock,
      };

      if (mode === "edit" && product) {
        return api.put(`/products/${product._id}`, payload);
      }
      return api.post("/products", payload);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to save product.");
    },
    onSuccess: () => {
      onSaved();
    },
  });

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (!mode) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-xl font-bold text-text">
            {mode === "create" ? "Add Product" : `Edit "${product?.name}"`}
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
              <label className="block text-sm font-medium text-text mb-1.5">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Price (₦) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Compare-at Price (₦)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.compareAtPrice}
                onChange={(e) => handleChange("compareAtPrice", e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                {[
                  "portion",
                  "bowl",
                  "500ml",
                  "litre",
                  "pack",
                  "bottle",
                  "tub",
                  "piece",
                  "per kg",
                  "1 Litre",
                  "500ml bottle",
                  "250g",
                  "500g",
                ].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Type</label>
              <select
                value={form.productType}
                onChange={(e) => handleChange("productType", e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                <option value="cooked">Cooked</option>
                <option value="packaged">Packaged</option>
                <option value="fresh">Fresh</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                <option value="">— Select category —</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">
                Image URLs (one per line)
              </label>
              <textarea
                value={
                  typeof form.images === "string" ? form.images : (form.images ?? []).join("\n")
                }
                onChange={(e) =>
                  handleChange(
                    "images",
                    e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                rows={2}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm resize-y font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => handleChange("tags", e.target.value)}
                placeholder="jollof, party"
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            <div className="flex items-end gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => handleChange("isFeatured", e.target.checked)}
                />
                Featured on homepage
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyOnOutOfStock}
                  onChange={(e) => handleChange("notifyOnOutOfStock", e.target.checked)}
                />
                Notify when out of stock
              </label>
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
              disabled={isSaving}
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

export default AdminProducts;
