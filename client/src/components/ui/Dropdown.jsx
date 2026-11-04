import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Reusable dropdown.
 *
 * Opens on hover (CSS group-hover) OR click. Closes when the pointer leaves
 * the trigger+menu block or when the user clicks elsewhere. The trigger and
 * menu share a `group` parent so hovering either keeps the menu visible.
 * A `color` prop tints the trigger so it can be used for status filters,
 * categories, colours, etc.
 *
 * Props:
 *  - trigger: ReactNode — the button content (label, icon; chevron handled here)
 *  - color: "primary" | "surface" | "muted" — trigger background
 *  - open: boolean (controlled) — pass to keep state outside
 *  - onOpenChange: (open) => void
 *  - children: ReactNode — the menu content
 *  - menuClassName: string — extra classes on the menu
 *  - align: "left" | "right"
 *  - fullWidth: boolean — stretch the trigger to fill its container
 *  - noChevron: boolean — hide the built-in chevron (render your own inside trigger)
 *  - noBorder: boolean — skip the border on the trigger
 */
const Dropdown = ({
  trigger,
  color = "primary",
  open: controlledOpen,
  onOpenChange,
  children,
  menuClassName = "",
  align = "left",
  fullWidth = false,
  noChevron = false,
  noBorder = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const wrapperRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const triggerClass =
    color === "surface"
      ? `bg-surface hover:bg-background ${noBorder ? "" : "border border-border"}`
      : color === "muted"
        ? `bg-primary/5 hover:bg-primary/10 ${noBorder ? "" : "border border-border"}`
        : "bg-primary text-white hover:bg-primary/90";

  return (
    <div
      ref={wrapperRef}
      className={`relative group ${fullWidth ? "w-full block" : "inline-flex"} ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${triggerClass} ${fullWidth ? "w-full justify-start" : ""}`}
      >
        {trigger}
        {!noChevron && (
          <ChevronDown
            className={`w-4 h-4 opacity-70 transition-transform ml-auto ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      <div
        className={`absolute z-50 top-full left-0 mt-0.5 w-full bg-surface rounded-xl shadow-soft border border-border py-1 overflow-hidden transition-opacity duration-150 ${open ? "opacity-100 visible" : "opacity-0 invisible"} group-hover:opacity-100 group-hover:visible ${menuClassName} ${align === "right" ? "right-0 left-auto" : ""}`}
      >
        {children}
      </div>
    </div>
  );
};

export default Dropdown;
