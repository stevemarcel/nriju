import { useState, useEffect, useRef } from "react";
import { X, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

const ICON_MAP = {
  destructive: AlertTriangle,
  archive: AlertCircle,
  primary: AlertCircle,
  success: CheckCircle,
};

const VARIANT_STYLES = {
  destructive: {
    header: "border-rose-600 bg-rose-600",
    headerText: "text-on-accent",
    headerMuted: "text-on-accent/70",
    headerClose:
      "text-on-accent/80 hover:bg-on-accent/15 hover:text-on-accent focus-visible:ring-on-accent",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    closeColor: "text-rose-600",
    button: "bg-rose-600 text-white hover:bg-rose-700",
    cancel: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    adminCancel: "hover:bg-rose-50 hover:text-rose-700",
  },
  archive: {
    header: "border-amber-500 bg-amber-500",
    headerText: "text-on-accent",
    headerMuted: "text-on-accent/75",
    headerClose: "text-on-accent/75 hover:bg-text/10 hover:text-on-accent focus-visible:ring-text",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    closeColor: "text-amber-500",
    button: "bg-amber-500 text-on-accent hover:bg-amber-600 hover:text-on-accent",
    cancel: "bg-amber-50 text-amber-500 hover:bg-amber-100",
    adminCancel: "hover:bg-amber-50 hover:text-amber-800",
  },
  primary: {
    header: "border-primary bg-primary",
    headerText: "text-on-accent",
    headerMuted: "text-on-accent/70",
    headerClose:
      "text-on-accent/80 hover:bg-on-accent/15 hover:text-on-accent focus-visible:ring-on-accent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    closeColor: "text-primary",
    button: "bg-primary text-white hover:bg-primary/90",
    cancel: "bg-primary/10 text-primary hover:bg-primary/20",
    adminCancel: "hover:bg-primary/10 hover:text-primary",
  },
  success: {
    header: "border-emerald-700 bg-emerald-700",
    headerText: "text-on-accent",
    headerMuted: "text-on-accent/70",
    headerClose:
      "text-on-accent/80 hover:bg-on-accent/15 hover:text-on-accent focus-visible:ring-on-accent",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    closeColor: "text-emerald-500",
    button: "bg-emerald-700 text-white hover:bg-emerald-800",
    cancel: "bg-emerald-50 text-emerald-500 hover:bg-emerald-100",
    adminCancel: "hover:bg-emerald-50 hover:text-emerald-700",
  },
};

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel,
  variant = "destructive",
  adminStyle = false,
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

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.destructive;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      ref={ref}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="absolute inset-0" onClick={handleCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby={description ? "confirm-modal-description" : undefined}
        className={`relative w-full max-w-md overflow-hidden border border-border/60 bg-background text-text shadow-soft transform transition-all duration-300 ease-out ${
          adminStyle ? "rounded-[20px]" : "rounded-3xl"
        } ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {adminStyle ? (
          <div className={`flex items-center justify-between border-b p-5 ${styles.header}`}>
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider ${styles.headerMuted}`}>
                Please confirm
              </p>
              <h2
                id="confirm-modal-title"
                className={`truncate font-heading text-xl font-bold ${styles.headerText}`}
              >
                {title || "Are you sure?"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Close confirmation"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 ${styles.headerClose}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close confirmation"
            className={`absolute right-5 top-5 z-10 rounded-full p-1.5 ${styles.iconBg} ${styles.closeColor} transition-colors hover:opacity-80`}
          >
            <X className="h-4 w-4 stroke-[3px]" aria-hidden="true" />
          </button>
        )}

        <div
          className={`flex flex-col items-center text-center ${adminStyle ? "p-5" : "p-8 pt-10"}`}
        >
          {/* Icon */}
          <div
            className={`${adminStyle ? "mb-4 h-14 w-14 rounded-xl" : "mb-6 h-28 w-28 rounded-2xl"} ${styles.iconBg} flex items-center justify-center`}
          >
            {(() => {
              const Icon = ICON_MAP[variant] || ICON_MAP.destructive;
              const iconColor = styles.iconColor || "text-gray-500";
              return (
                <Icon
                  className={`${adminStyle ? "h-7 w-7" : "h-16 w-16"} ${iconColor}`}
                  aria-hidden="true"
                />
              );
            })()}
          </div>

          {!adminStyle && (
            <h2
              id="confirm-modal-title"
              className="mb-3 text-xl font-bold leading-tight text-text md:text-2xl"
            >
              {title || "Are you sure?"}
            </h2>
          )}

          <p
            id="confirm-modal-description"
            className="max-w-[320px] text-sm leading-relaxed text-text-secondary"
          >
            {description}
          </p>

          <div className={`flex w-full gap-3 ${adminStyle ? "mt-6" : "mt-10"}`}>
            <button
              type="button"
              onClick={handleCancel}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                adminStyle
                  ? `border-border bg-background text-text-secondary ${styles.adminCancel}`
                  : `${styles.cancel} border-transparent px-6 py-3.5 font-bold`
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ${styles.button} ${
                adminStyle ? "" : "px-6 py-3.5 font-bold"
              }`}
            >
              {confirmLabel || "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
