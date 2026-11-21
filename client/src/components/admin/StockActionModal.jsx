import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Edit3, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import { ConfirmModal } from "../ui/ConfirmModal";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminCircleCheckbox,
  AdminModalHeader,
} from "./AdminModalPrimitives";

// * Configuration object for different stock action types
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
  // * Lock page scroll when modal is open
  usePageScrollLock(true);

  // * Query client for invalidating queries after mutation
  const qc = useQueryClient();

  // * Current quantity input value
  const [quantity, setQuantity] = useState("");

  // * Reason/notes for the adjustment
  const [reason, setReason] = useState("");

  // * Unit cost for new stock batch (in Naira)
  const [unitCost, setUnitCost] = useState("");

  // * Whether unit cost should be unknown/null
  const [costUnknown, setCostUnknown] = useState(false);

  // * Controls visibility of confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // * Action configuration for current action type
  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;

  // * Whether this is an adjustment increasing stock beyond current
  const isStockIncrease = action === "adjust" && Number(quantity) > Number(product?.stock ?? 0);

  // * Whether the action type supports entering unit cost
  const supportsUnitCost = action === "add" || isStockIncrease;

  // ? Builds the request body based on form inputs and action type
  const getRequestBody = () => {
    const body = {
      quantity: Number(quantity),
      reason: reason.trim() || undefined,
    };

    if (supportsUnitCost) {
      if (costUnknown) {
        body.unitCost = null;
      } else if (unitCost.trim() !== "") {
        const naira = Number(unitCost);

        if (!Number.isFinite(naira) || naira < 0) {
          throw new Error("Enter a valid non-negative unit cost.");
        }

        const kobo = Math.round(naira * 100);

        if (!Number.isSafeInteger(kobo) || Math.abs(naira * 100 - kobo) > 1e-7) {
          throw new Error("Unit cost must have no more than two decimal places.");
        }

        body.unitCost = kobo;
      }
      // If omitted, the backend uses the product's default cost.
    }

    return body;
  };

  // ? Performs the API mutation for the stock action
  const mutationFn = () => {
    const body = getRequestBody();

    return api.post(`/inventory/${product._id}/${action}`, body);
  };

  // * Mutation for performing the stock action
  const saveMutation = useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "inventory"] }),
        qc.invalidateQueries({ queryKey: ["admin", "products"] }),
        qc.invalidateQueries({ queryKey: ["admin", "activities"] }),
      ]);
      toast.success(cfg.label + " saved successfully.");
      onClose();
    },
    onError: (err) => toast.error(err?.response?.data?.message || err.message || "Failed to save."),
  });

  // ? Validates input and opens confirmation modal
  const handleSubmit = () => {
    const qty = Number(quantity);

    if (
      !Number.isSafeInteger(qty) ||
      qty < 0 ||
      (action !== "adjust" && qty === 0) ||
      quantity.trim() === ""
    ) {
      return toast.error(
        action === "adjust"
          ? "Enter a valid non-negative whole-number stock count."
          : "Enter a valid positive whole-number quantity.",
      );
    }

    try {
      getRequestBody();
    } catch (err) {
      return toast.error(err.message);
    }

    setConfirmOpen(true);
  };

  // ? Executes the mutation after user confirmation
  const handleConfirm = () => {
    setConfirmOpen(false);
    saveMutation.mutate();
  };

  // * Accessible title ID for modal dialog
  const titleId = "stock-action-title";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !saveMutation.isPending) onClose();
          }}
          className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
        >
          <AdminModalHeader
            icon={Icon}
            eyebrow="Inventory action"
            title={cfg.title}
            titleId={titleId}
            onClose={onClose}
            closeLabel={`Close ${cfg.title.toLowerCase()} form`}
            closeDisabled={saveMutation.isPending}
          />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
            {/* Current stock */}
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

            {/* Quantity */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-text">
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
                disabled={saveMutation.isPending}
                className={ADMIN_FIELD_CLASS}
              />
            </div>

            {/* Batch unit cost */}
            {supportsUnitCost && (
              <div className="space-y-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-text">
                    Unit Cost (₦)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="Leave blank to use product default"
                    disabled={costUnknown || saveMutation.isPending}
                    className={ADMIN_FIELD_CLASS}
                  />

                  <p className="text-xs text-text-muted mt-1.5">
                    This cost applies to the new stock batch.
                  </p>
                </div>

                <AdminCircleCheckbox
                  checked={costUnknown}
                  onChange={setCostUnknown}
                  disabled={saveMutation.isPending}
                >
                  Cost unknown
                </AdminCircleCheckbox>

                <p className="text-xs text-text-muted">
                  {costUnknown
                    ? "This batch will be saved without a known unit cost."
                    : unitCost.trim() === ""
                      ? "The product's default cost will be used if available."
                      : `Batch unit cost: ₦${Number(unitCost).toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-text">
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
                className={`${ADMIN_FIELD_CLASS} resize-none`}
              />
            </div>
          </div>

          <div className="p-5 border-t border-border/60 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saveMutation.isPending}
              className={ADMIN_SECONDARY_BUTTON_CLASS}
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={saveMutation.isPending || quantity === ""}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
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
        description={`${cfg.desc(product)}. Quantity: ${quantity}${product?.unit || " units"}.`}
        confirmLabel={cfg.label}
        variant={cfg.variant || "success"}
        adminStyle
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default StockActionModal;
