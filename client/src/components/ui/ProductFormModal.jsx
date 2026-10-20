import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import { toKobo } from "../../utils/formatMoney";
import ImageUpload from "./ImageUpload";

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
        tags: Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags ?? ""),
        isFeatured: product.isFeatured ?? false,
        isActive: product.isActive ?? true,
        notifyOnOutOfStock: product.notifyOnOutOfStock ?? false,
      };
    }

    return { ...initialForm };
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const hasImages = Array.isArray(form.images) && form.images.length > 0;

      if (hasImages) {
        // Backend reads uploaded files from req.files, so the whole request
        // must be multipart/form-data when images are present.
        const payload = new FormData();
        payload.append("name", form.name);
        payload.append("description", form.description);
        payload.append("price", toKobo(form.price));
        payload.append("compareAtPrice", form.compareAtPrice ? toKobo(form.compareAtPrice) : "");
        payload.append("unit", form.unit);
        payload.append("productType", form.productType);
        payload.append("category", form.category);
        payload.append("isFeatured", String(form.isFeatured));
        payload.append("isActive", String(form.isActive));
        payload.append("notifyOnOutOfStock", String(form.notifyOnOutOfStock));
        payload.append(
          "tags",
          JSON.stringify(
            form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        );

        if (mode === "edit" && product) {
          return api.put(`/products/${product._id}`, payload, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }

        return api.post("/products", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

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
          .map((tag) => tag.trim())
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

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-xl font-bold text-text">
            {mode === "create" ? "Add Product" : `Edit "${product?.name}"`}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-background-soft"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Name *</label>

              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Description</label>

              <textarea
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm resize-y"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Price (₦) *</label>

              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(event) => handleChange("price", event.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Compare-at price */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Compare-at Price (₦)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.compareAtPrice}
                onChange={(event) => handleChange("compareAtPrice", event.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Unit</label>

              <select
                value={form.unit}
                onChange={(event) => handleChange("unit", event.target.value)}
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
                ].map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Product type */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Type</label>

              <select
                value={form.productType}
                onChange={(event) => handleChange("productType", event.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                <option value="cooked">Cooked</option>
                <option value="packaged">Packaged</option>
                <option value="fresh">Fresh</option>
              </select>
            </div>

            {/* Category */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Category *</label>

              <select
                required
                value={form.category}
                onChange={(event) => handleChange("category", event.target.value)}
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                <option value="">— Select category —</option>

                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Images */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Images</label>
              <ImageUpload
                initialImages={form.images ?? []}
                onChange={(next) => handleChange("images", next)}
                disabled={saveMutation.isPending}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Tags (comma-separated)
              </label>

              <input
                type="text"
                value={form.tags}
                onChange={(event) => handleChange("tags", event.target.value)}
                placeholder="jollof, party"
                className="w-full px-3 py-2 bg-background-soft border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Options */}
            <div className="flex items-end gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => handleChange("isFeatured", event.target.checked)}
                />
                Featured on homepage
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => handleChange("isActive", event.target.checked)}
                />
                Active
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyOnOutOfStock}
                  onChange={(event) => handleChange("notifyOnOutOfStock", event.target.checked)}
                />
                Notify when out of stock
              </label>
            </div>
          </div>

          {/* Footer */}
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
              <Save className="w-4 h-4" />

              {saveMutation.isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
