import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Save, X, FolderOpen, Check, Package, Utensils } from "lucide-react";
import Dropdown from "./Dropdown";
import { toast } from "sonner";
import api from "../../services/api";
import { toKobo } from "../../utils/formatMoney";
import { getCategoryIcon } from "../../utils/categoryIcons";
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
  const [uploading, setUploading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
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
      const payload = {
        name: form.name,
        description: form.description,
        price: toKobo(form.price),
        compareAtPrice: form.compareAtPrice ? toKobo(form.compareAtPrice) : null,
        unit: form.unit,
        productType: form.productType,
        category: form.category,
        images: form.images || [],
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
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <h2 className="font-heading text-xl font-bold text-text">
            {mode === "create" ? "Add Product" : `Edit "${product?.name}"`}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-background-soft transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              General Information
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">Name Product</label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  className="w-full px-3 py-2 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">Description</label>

                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm resize-y"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 my-2" />

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Pricing
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Price (₦)</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(event) => handleChange("price", event.target.value)}
                  className="w-full px-3 py-2 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
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
                  className="w-full px-3 py-2 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Unit</label>

                <div className="relative">
                  <Dropdown
                    trigger={<span className="min-w-0 truncate">{form.unit || "Select unit"}</span>}
                    color="muted"
                    fullWidth
                    open={unitOpen}
                    onOpenChange={(next) => {
                      setUnitOpen(next);
                      if (next) setTypeOpen(false);
                    }}
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
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleChange("unit", unit)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-background transition-colors ${
                          form.unit === unit
                            ? "text-primary font-semibold bg-primary/5"
                            : "text-text"
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </Dropdown>
                </div>
              </div>

              {/* Product type */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Type</label>

                <div className="relative">
                  <Dropdown
                    trigger={
                      <span className="min-w-0 truncate">{form.productType || "Select type"}</span>
                    }
                    color="muted"
                    fullWidth
                    open={typeOpen}
                    onOpenChange={(next) => {
                      setTypeOpen(next);
                      if (next) setUnitOpen(false);
                    }}
                  >
                    {["cooked", "packaged", "fresh"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleChange("productType", type)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-background transition-colors capitalize ${
                          form.productType === type
                            ? "text-primary font-semibold bg-primary/5"
                            : "text-text"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 my-2" />

          {/* Category */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Category
            </h3>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Product Category</label>

              <div className="relative">
                <Dropdown
                  trigger={
                    <>
                      <FolderOpen className="w-4 h-4 text-text-muted mr-2" />
                      <span className="min-w-0 truncate">
                        {categories.find((c) => c._id === form.category)?.name || "Select category"}
                      </span>
                    </>
                  }
                  color="muted"
                  fullWidth
                  open={categoryOpen}
                  onOpenChange={setCategoryOpen}
                  menuClassName="max-h-96"
                >
                  <button
                    type="button"
                    onClick={() => handleChange("category", "")}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                      form.category === "" ? "text-primary font-semibold bg-primary/5" : "text-text"
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="flex-1">All Categories</span>
                    {form.category === "" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => handleChange("category", category._id)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                        form.category === category._id
                          ? "text-primary font-semibold bg-primary/5"
                          : "text-text"
                      }`}
                    >
                      {getCategoryIcon(category.name)}
                      <span className="flex-1">{category.name}</span>
                      {form.category === category._id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </Dropdown>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 my-2" />

          {/* Media */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Media</h3>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Images</label>
              <ImageUpload
                initialImages={form.images ?? []}
                onChange={(next) => handleChange("images", next)}
                disabled={saveMutation.isPending || uploading}
                onUpload={(busy) => setUploading(busy)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Tags (comma-separated)
              </label>

              <input
                type="text"
                value={form.tags}
                onChange={(event) => handleChange("tags", event.target.value)}
                placeholder="jollof, party"
                className="w-full px-3 py-2 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>

          <div className="border-t border-border/60 my-2" />

          {/* Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Options
            </h3>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    form.isFeatured ? "border-primary bg-primary" : "border-border bg-transparent"
                  }`}
                  onClick={() => handleChange("isFeatured", !form.isFeatured)}
                >
                  {form.isFeatured && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                Featured on homepage
              </label>

              <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    form.isActive ? "border-primary bg-primary" : "border-border bg-transparent"
                  }`}
                  onClick={() => handleChange("isActive", !form.isActive)}
                >
                  {form.isActive && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                Active
              </label>

              <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    form.notifyOnOutOfStock
                      ? "border-primary bg-primary"
                      : "border-border bg-transparent"
                  }`}
                  onClick={() => handleChange("notifyOnOutOfStock", !form.notifyOnOutOfStock)}
                >
                  {form.notifyOnOutOfStock && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                Notify when out of stock
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading || saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-text-muted bg-background-soft hover:bg-primary/5 border border-border rounded-xl disabled:opacity-60 disabled:pointer-events-none transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading || saveMutation.isPending}
              className="px-5 py-2 bg-primary text-white font-medium rounded-xl inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm"
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
