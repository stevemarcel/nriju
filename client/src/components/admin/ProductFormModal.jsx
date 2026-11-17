import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Save, FolderOpen, Check, Package } from "lucide-react";
import Dropdown from "../ui/Dropdown";
import { toast } from "sonner";
import api from "../../services/api";
import { toKobo } from "../../utils/formatMoney";
import { getCategoryIcon } from "../../utils/categoryIcons";
import ImageUpload from "../ui/ImageUpload";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminCircleCheckbox,
  AdminModalHeader,
} from "./AdminModalPrimitives";

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
  stock: "",
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
        stock: product.stock ?? "",
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
        stock: form.stock ? Number(form.stock) : undefined,
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

  const titleId = "product-form-title";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saveMutation.isPending && !uploading) onClose();
        }}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
      >
        {/* Header */}
        <AdminModalHeader
          icon={Package}
          eyebrow="Product details"
          title={mode === "create" ? "Add Product" : `Edit "${product?.name}"`}
          titleId={titleId}
          onClose={onClose}
          closeLabel="Close product form"
          closeDisabled={uploading || saveMutation.isPending}
        />

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
                  className={ADMIN_FIELD_CLASS}
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">Description</label>

                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  rows={3}
                  className={`${ADMIN_FIELD_CLASS} resize-y`}
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
                  className={ADMIN_FIELD_CLASS}
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
                  className={ADMIN_FIELD_CLASS}
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Stock</label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => handleChange("stock", event.target.value)}
                  placeholder="Enter initial stock quantity"
                  className={ADMIN_FIELD_CLASS}
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Unit</label>

                <div className="relative">
                  <Dropdown
                    trigger={<span className="min-w-0 truncate">{form.unit || "Select unit"}</span>}
                    color="surface"
                    fullWidth
                    ariaLabel="Select product unit"
                    triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
                          form.unit === unit ? "text-primary font-semibold bg-surface" : "text-text"
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
                    color="surface"
                    fullWidth
                    ariaLabel="Select product type"
                    triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
                            ? "text-primary font-semibold bg-surface"
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
                  color="surface"
                  fullWidth
                  ariaLabel="Select product category"
                  triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  open={categoryOpen}
                  onOpenChange={setCategoryOpen}
                  menuClassName="max-h-96"
                >
                  <button
                    type="button"
                    onClick={() => handleChange("category", "")}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                      form.category === "" ? "text-primary font-semibold bg-surface" : "text-text"
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="flex-1">All Categories</span>
                    {form.category === "" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {categories.map((category) => {
                    const { Icon, color } = getCategoryIcon(category.name);
                    return (
                      <button
                        key={category._id}
                        type="button"
                        onClick={() => handleChange("category", category._id)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                          form.category === category._id
                            ? "text-primary font-semibold bg-surface"
                            : "text-text"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="flex-1">{category.name}</span>
                        {form.category === category._id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
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
                className={ADMIN_FIELD_CLASS}
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
              <AdminCircleCheckbox
                checked={form.isFeatured}
                onChange={(checked) => handleChange("isFeatured", checked)}
                disabled={uploading || saveMutation.isPending}
              >
                Featured on homepage
              </AdminCircleCheckbox>

              <AdminCircleCheckbox
                checked={form.isActive}
                onChange={(checked) => handleChange("isActive", checked)}
                disabled={uploading || saveMutation.isPending}
              >
                Active
              </AdminCircleCheckbox>

              <AdminCircleCheckbox
                checked={form.notifyOnOutOfStock}
                onChange={(checked) => handleChange("notifyOnOutOfStock", checked)}
                disabled={uploading || saveMutation.isPending}
              >
                Notify when out of stock
              </AdminCircleCheckbox>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading || saveMutation.isPending}
              className={ADMIN_SECONDARY_BUTTON_CLASS}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading || saveMutation.isPending}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
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
