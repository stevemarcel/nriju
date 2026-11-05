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
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    closeColor: "text-rose-600",
    button: "bg-rose-600 text-white hover:bg-rose-500",
    cancel: "bg-rose-50 text-rose-600 hover:bg-rose-100",
  },
  archive: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    closeColor: "text-amber-500",
    button: "bg-amber-500 text-white hover:bg-amber-600",
    cancel: "bg-amber-50 text-amber-500 hover:bg-amber-100",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    closeColor: "text-primary",
    button: "bg-primary text-white hover:bg-primary/90",
    cancel: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  success: {
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    closeColor: "text-emerald-500",
    button: "bg-emerald-500 text-white hover:bg-emerald-600",
    cancel: "bg-emerald-50 text-emerald-500 hover:bg-emerald-100",
  },
};

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel,
  variant = "destructive",
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
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className={`absolute right-5 top-5 p-1.5 rounded-full ${styles.iconBg} ${styles.closeColor} hover:opacity-80 transition-colors z-10`}
        >
          <X className="w-4 h-4 stroke-[3px]" />
        </button>

        <div className="p-8 pt-10 flex flex-col items-center text-center">
          {/* Icon */}
          <div
            className={`w-28 h-28 rounded-2xl ${styles.iconBg} flex items-center justify-center mb-6`}
          >
            {(() => {
              const Icon = ICON_MAP[variant] || ICON_MAP.destructive;
              const iconColor = styles.iconColor || "text-gray-500";
              return <Icon className={`w-16 h-16 ${iconColor}`} />;
            })()}
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-text mb-3 leading-tight">
            {title || "Are you sure?"}
          </h2>

          <p className="text-text-secondary text-sm leading-relaxed max-w-[320px]">{description}</p>

          <div className="flex w-full gap-4 mt-10">
            <button
              onClick={handleCancel}
              className={`flex-1 px-6 py-3.5 text-sm font-bold rounded-[14px] transition-colors ${styles.cancel}`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-6 py-3.5 text-sm font-bold rounded-[14px] transition-all active:scale-[0.98] ${styles.button}`}
            >
              {confirmLabel || "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
