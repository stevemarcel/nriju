import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, FolderOpen, Package, Save } from "lucide-react";
import { toast } from "sonner";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import api from "../../services/api";
import { getCategoryIcon } from "../../utils/categoryIcons";
import { toKobo } from "../../utils/formatMoney";
import Dropdown from "../ui/Dropdown";
import ImageUpload from "../ui/ImageUpload";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminCircleCheckbox,
  AdminModalHeader,
} from "./AdminModalPrimitives";

const PRODUCT_UNITS = [
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
];

const PRODUCT_TYPES = [
  { value: "cooked", label: "Cooked" },
  { value: "packaged", label: "Packaged" },
  { value: "fresh", label: "Fresh" },
];

const getProductSaveErrorMessage = (error, mode) => {
  const status = error?.response?.status;
  const rawMessage = error?.response?.data?.message;
  const action = mode === "create" ? "add" : "update";

  if (error?.code === "ERR_NETWORK") {
    return `We couldn't ${action} the product. Check your connection and try again.`;
  }

  if (status === 401) {
    return "Your session has expired. Sign in and try again.";
  }

  if (status === 403) {
    return "You don't have permission to save products.";
  }

  if (status === 404) {
    return "This product is no longer available. Refresh the page and try again.";
  }

  if (status === 409) {
    return "A product with this name already exists. Use a different name.";
  }

  if (status === 413) {
    return "The product images are too large. Choose smaller images and try again.";
  }

  if (status === 429) {
    return "Too many attempts. Wait a moment and try again.";
  }

  if (status >= 500) {
    return `We couldn't ${action} the product right now. Try again shortly.`;
  }

  if (typeof rawMessage === "string") {
    if (/categor/i.test(rawMessage)) {
      return "Select an available product category and try again.";
    }

    if (/image|url/i.test(rawMessage)) {
      return "One or more images could not be saved. Remove them and try again.";
    }

    if (/price|cost/i.test(rawMessage)) {
      return "Enter valid product prices and try again.";
    }

    if (/stock|quantity/i.test(rawMessage)) {
      return "Enter a valid opening stock quantity and try again.";
    }
  }

  if (status === 400 || status === 422) {
    return "Check the product details and try again.";
  }

  return `We couldn't ${action} the product. Try again.`;
};

const initialForm = {
  name: "",
  description: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
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

const FormSection = ({ title, children, last = false }) => (
  <section>
    <h2 className="font-heading text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {title}
    </h2>
    <div className="mt-5 space-y-5">{children}</div>
    {last ? null : <div aria-hidden="true" className="mt-8 h-px bg-border/60" />}
  </section>
);

const FormField = ({ id, label, hint, children, className = "", labelIsHeading = false }) => (
  <div className={`min-w-0 ${className}`}>
    {labelIsHeading ? (
      <p className="mb-1.5 text-sm font-semibold text-text">{label}</p>
    ) : (
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-text">
        {label}
      </label>
    )}
    {children}
    {hint ? (
      <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-text-secondary">
        {hint}
      </p>
    ) : null}
  </div>
);

const DropdownOption = ({ selected, onSelect, leading, children }) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={selected}
    onClick={onSelect}
    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none ${
      selected ? "bg-surface font-semibold text-primary" : "text-text"
    }`}
  >
    {leading}
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {selected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
  </button>
);

const ProductFormModal = ({ mode, product, categories, onClose, onSaved }) => {
  usePageScrollLock(true);

  const [uploading, setUploading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [form, setForm] = useState(() => {
    if (mode === "edit" && product) {
      return {
        name: product.name ?? "",
        description: product.description ?? "",
        price: product.price == null ? "" : product.price / 100,
        compareAtPrice: product.compareAtPrice == null ? "" : product.compareAtPrice / 100,
        costPrice: product.costPrice == null ? "" : product.costPrice / 100,
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
      const existingImages = (form.images || []).filter((image) => typeof image === "string");
      const newImages = (form.images || []).filter((image) => image instanceof File);
      const payload = {
        name: form.name,
        description: form.description,
        price: toKobo(form.price),
        compareAtPrice: form.compareAtPrice === "" ? null : toKobo(form.compareAtPrice),
        costPrice: form.costPrice === "" ? null : toKobo(form.costPrice),
        unit: form.unit,
        productType: form.productType,
        category: form.category,
        images: existingImages,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        notifyOnOutOfStock: form.notifyOnOutOfStock,
      };

      if (mode !== "edit") payload.stock = form.stock === "" ? 0 : Number(form.stock);

      const requestData = new FormData();
      requestData.append("payload", JSON.stringify(payload));
      newImages.forEach((image) => requestData.append("images", image));

      if (mode === "edit" && product) {
        return api.put(`/products/${product._id}`, requestData, { skipGlobalErrorToast: true });
      }

      return api.post("/products", requestData, { skipGlobalErrorToast: true });
    },

    onError: (err) => {
      toast.error(getProductSaveErrorMessage(err, mode));
    },

    onSuccess: () => {
      toast.success(mode === "create" ? "Product added." : "Product updated.");
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

    if (!form.category) {
      toast.error("Select a product category.");
      return;
    }

    saveMutation.mutate();
  };

  const titleId = "product-form-title";
  const isBusy = uploading || saveMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isBusy) onClose();
        }}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
      >
        <AdminModalHeader
          icon={Package}
          eyebrow="Product details"
          title={mode === "create" ? "Add product" : `Edit "${product?.name}"`}
          titleId={titleId}
          onClose={onClose}
          closeLabel="Close product form"
          closeDisabled={isBusy}
        />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-8 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
            <FormSection title="Basic information">
              <div className="grid gap-4">
                <FormField id="product-name" label="Product name">
                  <input
                    id="product-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    className={ADMIN_FIELD_CLASS}
                  />
                </FormField>

                <FormField
                  id="product-description"
                  label="Description"
                  hint="Add size, ingredients, or serving details."
                >
                  <textarea
                    id="product-description"
                    required
                    value={form.description}
                    onChange={(event) => handleChange("description", event.target.value)}
                    rows={4}
                    aria-describedby="product-description-hint"
                    className={`${ADMIN_FIELD_CLASS} resize-y`}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Pricing and stock">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField id="product-price" label="Selling price (₦)" hint="What customers pay.">
                  <input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(event) => handleChange("price", event.target.value)}
                    placeholder="0.00"
                    aria-describedby="product-price-hint"
                    className={ADMIN_FIELD_CLASS}
                  />
                </FormField>

                <FormField
                  id="product-compare-price"
                  label="Compare-at price (₦)"
                  hint="Original price shown crossed out."
                >
                  <input
                    id="product-compare-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compareAtPrice}
                    onChange={(event) => handleChange("compareAtPrice", event.target.value)}
                    placeholder="0.00"
                    aria-describedby="product-compare-price-hint"
                    className={ADMIN_FIELD_CLASS}
                  />
                </FormField>

                <FormField
                  id="product-cost-price"
                  label="Cost price (₦)"
                  hint="What 1 unit costs you."
                >
                  <input
                    id="product-cost-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(event) => handleChange("costPrice", event.target.value)}
                    placeholder="0.00"
                    aria-describedby="product-cost-price-hint"
                    className={ADMIN_FIELD_CLASS}
                  />
                </FormField>

                {mode === "create" ? (
                  <FormField
                    id="product-opening-stock"
                    label="Opening stock"
                    hint="Starting quantity in stock."
                  >
                    <input
                      id="product-opening-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(event) => handleChange("stock", event.target.value)}
                      placeholder="0"
                      aria-describedby="product-opening-stock-hint"
                      className={ADMIN_FIELD_CLASS}
                    />
                  </FormField>
                ) : null}
              </div>
            </FormSection>

            <FormSection title="Classification">
              <FormField id="product-category" label="Category" hint="Where this product appears.">
                <Dropdown
                  trigger={
                    <>
                      <FolderOpen className="mr-2 h-4 w-4 text-text-muted" aria-hidden="true" />
                      <span className="min-w-0 truncate">
                        {categories.find((category) => category._id === form.category)?.name ||
                          "Select category"}
                      </span>
                    </>
                  }
                  color="surface"
                  fullWidth
                  triggerId="product-category"
                  ariaLabel="Select product category"
                  triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  open={categoryOpen}
                  onOpenChange={(next) => {
                    setCategoryOpen(next);
                    if (next) {
                      setTypeOpen(false);
                      setUnitOpen(false);
                    }
                  }}
                  menuRole="menu"
                  menuClassName="max-h-72 overflow-y-auto"
                >
                  {categories.map((category) => {
                    const { Icon, color } = getCategoryIcon(category.name);
                    return (
                      <DropdownOption
                        key={category._id}
                        selected={form.category === category._id}
                        onSelect={() => handleChange("category", category._id)}
                        leading={
                          <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
                        }
                      >
                        {category.name}
                      </DropdownOption>
                    );
                  })}
                </Dropdown>
              </FormField>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField
                  id="product-type"
                  label="Product type"
                  hint="How the product is prepared."
                >
                  <Dropdown
                    trigger={
                      <span className="min-w-0 truncate">
                        {PRODUCT_TYPES.find((type) => type.value === form.productType)?.label ||
                          "Select type"}
                      </span>
                    }
                    color="surface"
                    fullWidth
                    triggerId="product-type"
                    ariaLabel="Select product type"
                    triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    open={typeOpen}
                    onOpenChange={(next) => {
                      setTypeOpen(next);
                      if (next) {
                        setCategoryOpen(false);
                        setUnitOpen(false);
                      }
                    }}
                    menuRole="menu"
                  >
                    {PRODUCT_TYPES.map((type) => (
                      <DropdownOption
                        key={type.value}
                        selected={form.productType === type.value}
                        onSelect={() => handleChange("productType", type.value)}
                      >
                        {type.label}
                      </DropdownOption>
                    ))}
                  </Dropdown>
                </FormField>

                <FormField id="product-unit" label="Selling unit" hint="How the product is sold.">
                  <Dropdown
                    trigger={
                      <span className="min-w-0 truncate">{form.unit || "Select selling unit"}</span>
                    }
                    color="surface"
                    fullWidth
                    triggerId="product-unit"
                    ariaLabel="Select product selling unit"
                    triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    open={unitOpen}
                    onOpenChange={(next) => {
                      setUnitOpen(next);
                      if (next) {
                        setCategoryOpen(false);
                        setTypeOpen(false);
                      }
                    }}
                    menuRole="menu"
                    menuClassName="max-h-64 overflow-y-auto"
                  >
                    {PRODUCT_UNITS.map((unit) => (
                      <DropdownOption
                        key={unit}
                        selected={form.unit === unit}
                        onSelect={() => handleChange("unit", unit)}
                      >
                        {unit}
                      </DropdownOption>
                    ))}
                  </Dropdown>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Media and search">
              <FormField
                id="product-images"
                label="Product images"
                hint="Add up to 10 JPG, PNG, or WebP images."
                labelIsHeading
              >
                <div id="product-images">
                  <ImageUpload
                    initialImages={form.images ?? []}
                    onChange={(next) => handleChange("images", next)}
                    maxImages={10}
                    disabled={isBusy}
                    onUpload={(busy) => setUploading(busy)}
                    cropAspect={1}
                  />
                </div>
              </FormField>

              <FormField id="product-tags" label="Search tags" hint="Separate tags with commas.">
                <input
                  id="product-tags"
                  type="text"
                  value={form.tags}
                  onChange={(event) => handleChange("tags", event.target.value)}
                  placeholder="jollof, party, bestseller"
                  aria-describedby="product-tags-hint"
                  className={ADMIN_FIELD_CLASS}
                />
              </FormField>
            </FormSection>

            <FormSection title="Publishing" last>
              <div className="space-y-1 rounded-xl border border-border/60 bg-background-soft/60 p-4">
                <AdminCircleCheckbox
                  checked={form.isActive}
                  onChange={(checked) => handleChange("isActive", checked)}
                  disabled={isBusy}
                >
                  <span className="flex flex-col gap-0.5">
                    <span>Available for sale</span>
                    <span className="text-xs font-normal leading-5 text-text-secondary">
                      Show in the store.
                    </span>
                  </span>
                </AdminCircleCheckbox>

                <AdminCircleCheckbox
                  checked={form.isFeatured}
                  onChange={(checked) => handleChange("isFeatured", checked)}
                  disabled={isBusy}
                >
                  <span className="flex flex-col gap-0.5">
                    <span>Feature on homepage</span>
                    <span className="text-xs font-normal leading-5 text-text-secondary">
                      Show in Featured products.
                    </span>
                  </span>
                </AdminCircleCheckbox>

                <AdminCircleCheckbox
                  checked={form.notifyOnOutOfStock}
                  onChange={(checked) => handleChange("notifyOnOutOfStock", checked)}
                  disabled={isBusy}
                >
                  <span className="flex flex-col gap-0.5">
                    <span>Notify when out of stock</span>
                    <span className="text-xs font-normal leading-5 text-text-secondary">
                      Enable out-of-stock alerts.
                    </span>
                  </span>
                </AdminCircleCheckbox>
              </div>
            </FormSection>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-border/60 bg-background px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className={ADMIN_SECONDARY_BUTTON_CLASS}
            >
              Cancel
            </button>

            <button type="submit" disabled={isBusy} className={ADMIN_PRIMARY_BUTTON_CLASS}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveMutation.isPending
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create product"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
