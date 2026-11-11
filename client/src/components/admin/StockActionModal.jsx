import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Edit3,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import { ConfirmModal } from "../ui/ConfirmModal";

const ACTION_CONFIG = {
  add: {
    label: "Add Stock",
    icon: Plus,
    variant: "success",
    title: "Add Stock",
    desc: (p) => `Adding stock to ${p.name}`,
  },
  remove: {
    label: "Remove Stock",
    icon: Minus,
    title: "Remove Stock",
    desc: (p) => `Removing stock from ${p.name}`,
  },
  adjust: {
    label: "Adjust Stock",
    icon: Edit3,
    variant: "primary",
    title: "Adjust Stock",
    desc: (p) => `Adjusting stock for ${p.name}`,
  },
  damage: {
    label: "Record Damage",
    icon: ShieldAlert,
    variant: "archive",
    title: "Record Damaged Stock",
    desc: (p) => `Recording damaged stock for ${p.name}`,
  },
};

const StockActionModal = ({ product, action, onClose }) => {
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;
  const mutationFn =
    action === "adjust"
      ? () =>
          api.post(`/inventory/${product._id}/adjust`, {
            quantity: Number(quantity),
            reason: reason.trim() || undefined,
          })
      : () =>
          api.post(`/inventory/${product._id}/${action}`, {
            quantity: Number(quantity),
            reason: reason.trim() || undefined,
          });

  const saveMutation = useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
      toast.success(cfg.label + " saved successfully.");
      setConfirmOpen(false);
      onClose();
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to save."),
  });

  const handleSubmit = () => {
    const qty = Number(quantity);
    if (!qty || qty < 0) return toast.error("Enter a valid quantity.");
    if (action !== "adjust" && qty === 0) return toast.error("Quantity must be greater than zero.");
    if (action === "add") setConfirmOpen(true);
    else setConfirmOpen(true);
  };

  const handleConfirm = () => {
    saveMutation.mutate();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-background rounded-[20px] shadow-sm w-full max-w-md">
          <div className="bg-primary text-on-accent rounded-t-[20px] flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${cfg.variant === "success" ? "bg-emerald-50" : cfg.variant === "archive" ? "bg-amber-50" : "bg-primary/10"}`}
              >
                <Icon
                  className={`w-5 h-5 ${cfg.variant === "success" ? "text-emerald-600" : cfg.variant === "archive" ? "text-amber-500" : "text-primary"}`}
                />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-text">{cfg.title}</h2>
                <p className="text-xs text-text-muted">{product?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-primary/10 transition-colors text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Current stock badge */}
            <div className="bg-background-soft/70 rounded-xl p-4 border border-border/60">
              <div className="flex justify-between text-sm">
                <span className="text-text">Current Stock</span>
                <span className="font-semibold text-text">{product?.stock ?? 0}</span>
              </div>
              {action === "adjust" && (
                <p className="text-xs text-text-muted mt-2">
                  Enter the exact physical stock count.
                </p>
              )}
            </div>

            {/* Quantity input */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                {action === "adjust" ? "New Stock Quantity" : "Quantity"}
              </label>
              <input
                type="number"
                min={action === "adjust" ? 0 : 1}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={action === "adjust" ? "0" : "1"}
                autoFocus
                className="w-full px-3 py-2.5 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>

            {/* Reason input */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Reason (optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  action === "damage" ? "Describe what was damaged..." : "Optional note..."
                }
                disabled={saveMutation.isPending}
                className="w-full px-3 py-2.5 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm resize-none"
              />
            </div>
          </div>

          <div className="p-5 border-t border-border/60 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-background-soft/50 border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saveMutation.isPending || !quantity}
              className={`px-5 py-2 bg-primary text-white font-medium rounded-xl inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm`}
            >
              {saveMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`${cfg.label}?`}
        description={`${cfg.desc(product)}. Quantity: ${quantity}${product?.unit}.`}
        confirmLabel={cfg.label}
        variant={cfg.variant || "success"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default StockActionModal;
