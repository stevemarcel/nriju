import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Page title + subtitle + optional action button. Keeps admin headers consistent.
export const AdminPageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-text">{title}</h1>
      {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// Colour-coded status pill. Statuses are domain-specific, so callers pass a map.
export const StatusPill = ({ status, map }) => {
  const cfg = map[status] || { label: status, cls: "bg-background text-text-muted" };
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// Generic loading skeleton for list pages.
export const TableSkeleton = ({ rows = 6, cols = 4 }) => (
  <div className="bg-surface rounded-xl border border-border overflow-hidden">
    <div className="divide-y divide-border">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex items-center gap-4 p-4">
          {[...Array(cols)].map((_, c) => (
            <div key={c} className="h-4 bg-background rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Empty state when a list has no results.
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-border">
    {icon && <div className="text-4xl mb-4">{icon}</div>}
    <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
    {description && <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">{description}</p>}
    {action}
  </div>
);

// Pagination controls. `total` and `limit` drive the page count.
export const Pagination = ({ page, total, limit, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const go = (p) => onChange(Math.min(Math.max(1, p), pages));

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-background transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mx-auto" />
      </button>
      <span className="text-sm text-text-muted px-2">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => go(page + 1)}
        disabled={page === pages}
        className="w-9 h-9 rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-background transition-colors"
      >
        <ChevronRight className="w-4 h-4 mx-auto" />
      </button>
    </div>
  );
};

// Shared filter row: a text search + a select.
export const FilterBar = ({ search, onSearch, selects }) => (
  <div className="flex flex-col sm:flex-row gap-3 mb-6">
    <div className="relative flex-1 max-w-md">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search..."
        className="w-full pl-4 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
      />
    </div>
    <div className="flex items-center gap-2">
      {selects.map((s) => (
        <select
          key={s.label}
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
        >
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  </div>
);

// Format integer kobo to a naira display string.
export const formatNaira = (kobo) =>
  `₦${(Number(kobo) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

// Format a date into a compact, human-readable string.
export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })
    : "—";

// Confirm-and-execute helper used by every delete action.
export const confirmDelete = (message) => window.confirm(message || "Are you sure?");
