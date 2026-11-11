import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Save, X, Ticket } from "lucide-react";
import api from "../../services/api";
import { toKobo } from "../../utils/formatMoney";

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
      <div className="bg-background rounded-[20px] shadow-sm border border-border/60 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="bg-surface rounded-t-[20px] flex items-center justify-between p-5 border-b border-border/60">
          <h2 className="font-heading text-xl font-bold text-text">
            {mode === "create" ? "Add Coupon" : `Edit "${coupon?.code}"`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-all"
          >
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
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm transition-colors"
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
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Min Order (₦)</label>
              <input
                type="number"
                step="0.01"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Max Discount (₦)</label>
              <input
                type="number"
                step="0.01"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Expiry Date *</label>
              <input
                type="date"
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm transition-colors"
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
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm transition-colors"
                placeholder="Unlimited"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    form.isActive ? "border-primary bg-primary" : "border-border bg-transparent"
                  }`}
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                >
                  {form.isActive && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-text-muted bg-background hover:bg-background-soft/50 border border-border rounded-xl disabled:opacity-60 disabled:pointer-events-none transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 bg-primary text-white font-medium rounded-xl inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> {mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponFormModal;
