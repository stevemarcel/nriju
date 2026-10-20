import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  const handleTransitionEnd = () => {
    if (!visible && ref.current) ref.current.classList.remove("animate-in");
  };

  const handleCancel = () => {
    setVisible(false);
    setTimeout(onCancel, 150);
  };

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 150);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (!visible) return;
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible]);

  if (!open) return null;

  const btnCls =
    confirmVariant === "destructive"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : "bg-primary hover:bg-primary/95 text-white";

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      ref={ref}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
      <div
        className={`relative w-full max-w-sm bg-surface rounded-xl border border-border shadow-lg animate-in ${
          visible ? "" : "animate-out"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold text-text">{title}</h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-background-soft text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {description && (
          <div className="px-5 py-4">
            <p className="text-sm text-text-muted leading-relaxed">{description}</p>
          </div>
        )}
        <div className="flex justify-end gap-3 p-5 pt-3 border-t border-border">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-text-muted hover:bg-background-soft rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${btnCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
