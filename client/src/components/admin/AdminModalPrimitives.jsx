import { X } from "lucide-react";

// * Tailwind class for form-field inputs shared across admin modals and pages.
export const ADMIN_FIELD_CLASS =
  "min-h-10 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-text transition-colors placeholder:text-text-muted/80 hover:border-primary/30 hover:bg-primary/10 focus:border-primary/40 focus:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

// * Reusable label container style for form fields in admin forms.
export const ADMIN_LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-text";

// * Secondary button style — muted border/background; used for cancel/close actions.
export const ADMIN_SECONDARY_BUTTON_CLASS =
  "min-h-10 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-background-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

// * Primary button style — filled with primary colour; used for submit/save actions.
export const ADMIN_PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-accent shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

// ? Renders the top strip of every admin modal: optional icon + eyebrow/title text + X close button.
// Used by CouponFormModal, StockActionModal, and all create/update modal variants.
export const AdminModalHeader = ({
  icon: Icon,
  eyebrow,
  title,
  titleId,
  onClose,
  closeLabel = "Close modal",
  closeDisabled = false,
}) => (
  <div className="flex items-center justify-between border-b border-primary bg-primary p-5 text-on-accent">
    {/* Left side — icon + title area */}
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-on-accent/15">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      {/* Eyebrow label (optional) above page title */}
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-on-accent/70">
            {eyebrow}
          </p>
        )}
        <h2 id={titleId} className="truncate font-heading text-xl font-bold text-on-accent">
          {title}
        </h2>
      </div>
    </div>
    {/* Right side — dismiss button */}
    <button
      type="button"
      onClick={onClose}
      disabled={closeDisabled}
      aria-label={closeLabel}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-accent/80 transition-colors hover:bg-on-accent/15 hover:text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
);

// ? Accessible checkbox rendered as a clickable circle — hidden native <input>, styled peer span.
// Used by StockActionModal and other modals needing boolean toggle UX.
export const AdminCircleCheckbox = ({ checked, onChange, disabled = false, children }) => (
  <label className="flex min-h-10 cursor-pointer select-none items-center gap-3 text-sm font-semibold text-text">
    {/* sr-only native input drives keyboard and screen-reader state */}
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
      className="peer sr-only"
    />
    {/* Visible circle — reflects peer-checked state via CSS classes */}
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background ${
        checked ? "border-primary bg-primary" : "border-text-muted/50 bg-transparent"
      }`}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-on-accent" />}
    </span>
    {/* Label text alongside the circle */}
    <span>{children}</span>
  </label>
);
