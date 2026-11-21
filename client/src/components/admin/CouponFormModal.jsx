import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Check, Save, Ticket } from "lucide-react";
import api from "../../services/api";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import { toKobo } from "../../utils/formatMoney";
import Dropdown from "../ui/Dropdown";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminCircleCheckbox,
  AdminModalHeader,
} from "./AdminModalPrimitives";

// * Options list for the coupon-type Dropdown input.
const COUPON_TYPE_OPTIONS = [
  { value: "percent", label: "Percent (%)" },
  { value: "flat", label: "Flat amount" },
  { value: "freeship", label: "Free shipping" },
];

// ? Renders a create/edit modal form for managing promotional coupons.
// Handles naira-to-kobo money conversion on submit and kobo-to-naira on edit initialization.
const CouponFormModal = ({ mode, coupon, onClose, onSaved }) => {
  // * Locks body scroll while the modal is open.
  usePageScrollLock(Boolean(mode));

  // * Form state lazy initializer — converts kobo values from DB to display naira for edit mode.
  const [form, setForm] = useState(() => {
    if (mode === "edit" && coupon) {
      return {
        code: coupon.code ?? "",
        type: coupon.type ?? "percent",
        value: coupon.value ?? "",
        // ! Min order and max discount are stored in kobo; divide by 100 for naira form input.
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

  // * QueryClient instance to invalidate admin coupons query on save.
  const queryClient = useQueryClient();

  // * Mutation for creating or updating a coupon record via API.
  const saveMutation = useMutation({
    // ? Form submission handler — converts naira form inputs to integer kobo before payload submission.
    mutationFn: (e) => {
      e.preventDefault();
      // ! Percent value stays a raw number; flat amounts and thresholds are converted to kobo via toKobo().
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

  // * Short-circuit if modal mode is falsy.
  if (!mode) return null;

  // * DOM element ID for ARIA title association.
  const titleId = "coupon-form-title";
  // * Human-readable error message derived from mutation error response with fallback.
  const errorMessage =
    saveMutation.error?.response?.data?.message ||
    saveMutation.error?.message ||
    "We could not save this coupon. Check the details and try again.";

  return (
    // * Backdrop overlay — fixed inset with blur background.
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm">
      {/* Dialog container root */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          // ! Escape closes modal only when save operation is not pending.
          if (event.key === "Escape" && !saveMutation.isPending) onClose();
        }}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
      >
        {/* Modal Header */}
        <AdminModalHeader
          icon={Ticket}
          eyebrow="Coupon details"
          title={mode === "create" ? "Add Coupon" : `Edit "${coupon?.code}"`}
          titleId={titleId}
          onClose={onClose}
          closeLabel="Close coupon form"
          closeDisabled={saveMutation.isPending}
        />
        {/* Form Body */}
        <form
          onSubmit={(e) => saveMutation.mutate(e)}
          aria-busy={saveMutation.isPending}
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5"
        >
          {/* Validation/API error banner */}
          {saveMutation.isError && (
            <div
              role="alert"
              className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary"
            >
              {errorMessage}
            </div>
          )}

          {/* Form fields grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Coupon Code input */}
            <div className="sm:col-span-2">
              <label htmlFor="coupon-code" className={ADMIN_LABEL_CLASS}>
                Code *
              </label>
              <input
                id="coupon-code"
                type="text"
                required
                autoFocus
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={saveMutation.isPending}
                className={`${ADMIN_FIELD_CLASS} font-mono`}
              />
            </div>

            {/* Coupon Type dropdown */}
            <div>
              <label htmlFor="coupon-type" className={ADMIN_LABEL_CLASS}>
                Type *
              </label>
              <Dropdown
                trigger={
                  <span className="min-w-0 flex-1 truncate text-left">
                    {COUPON_TYPE_OPTIONS.find((option) => option.value === form.type)?.label ||
                      "Select type"}
                  </span>
                }
                color="surface"
                fullWidth
                triggerId="coupon-type"
                ariaLabel="Coupon type"
                disabled={saveMutation.isPending}
                triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                menuClassName="w-full"
                menuRole="listbox"
              >
                {COUPON_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={form.type === option.value}
                    onClick={() => setForm({ ...form, type: option.value })}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-background ${
                      form.type === option.value
                        ? "bg-primary/5 font-semibold text-primary"
                        : "text-text"
                    }`}
                  >
                    <span className="flex-1">{option.label}</span>
                    {form.type === option.value && (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </Dropdown>
            </div>
            {/* Discount Value input */}
            <div>
              <label htmlFor="coupon-value" className={ADMIN_LABEL_CLASS}>
                {form.type === "percent" ? "Percent value *" : "Flat amount (₦) *"}
              </label>
              <input
                id="coupon-value"
                type="number"
                step={form.type === "percent" ? "1" : "0.01"}
                required
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                disabled={saveMutation.isPending}
                className={ADMIN_FIELD_CLASS}
              />
            </div>

            {/* Min Order input */}
            <div>
              <label htmlFor="coupon-min-order" className={ADMIN_LABEL_CLASS}>
                Min Order (₦)
              </label>
              <input
                id="coupon-min-order"
                type="number"
                step="0.01"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                disabled={saveMutation.isPending}
                className={ADMIN_FIELD_CLASS}
              />
            </div>
            {/* Max Discount input */}
            <div>
              <label htmlFor="coupon-max-discount" className={ADMIN_LABEL_CLASS}>
                Max Discount (₦)
              </label>
              <input
                id="coupon-max-discount"
                type="number"
                step="0.01"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                disabled={saveMutation.isPending}
                className={ADMIN_FIELD_CLASS}
              />
            </div>

            {/* Expiry Date input */}
            <div>
              <label htmlFor="coupon-expiry" className={ADMIN_LABEL_CLASS}>
                Expiry Date *
              </label>
              <input
                id="coupon-expiry"
                type="date"
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                disabled={saveMutation.isPending}
                className={ADMIN_FIELD_CLASS}
              />
            </div>
            {/* Usage Limit input */}
            <div>
              <label htmlFor="coupon-usage-limit" className={ADMIN_LABEL_CLASS}>
                Usage Limit
              </label>
              <input
                id="coupon-usage-limit"
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : "" })
                }
                disabled={saveMutation.isPending}
                className={ADMIN_FIELD_CLASS}
                placeholder="Unlimited"
              />
            </div>

            {/* Active status checkbox */}
            <div className="flex items-center gap-3 sm:col-span-2">
              <AdminCircleCheckbox
                checked={form.isActive}
                onChange={(checked) => setForm({ ...form, isActive: checked })}
                disabled={saveMutation.isPending}
              >
                Active
              </AdminCircleCheckbox>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className={ADMIN_SECONDARY_BUTTON_CLASS}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveMutation.isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create coupon"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponFormModal;
