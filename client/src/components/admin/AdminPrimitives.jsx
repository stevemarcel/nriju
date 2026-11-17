import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Page title + subtitle + optional action button. Keeps admin headers consistent.
const AdminPageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-text">{title}</h1>
      {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// Colour-coded status pill. Statuses are domain-specific, so callers pass a map.
// `dot` renders a 1.5px dot instead of an icon — used for binary on/off states.
const StatusPill = ({ status, map, dot = false }) => {
  const cfg = map[status] || { label: status, cls: "bg-background text-text-muted" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}
    >
      {dot ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor || "bg-current"}`} />
      ) : (
        cfg.icon && <span className="w-3 h-3 shrink-0">{cfg.icon}</span>
      )}
      {cfg.label}
    </span>
  );
};

// Generic loading skeleton for list pages.
const TableSkeleton = ({ rows = 6, cols = 4 }) => (
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
const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-border">
    {icon && <div className="text-4xl mb-4">{icon}</div>}
    <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
    {description && <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">{description}</p>}
    {action}
  </div>
);

// Pagination controls. `total` and `limit` drive the page count.
// Renders a pill of numbered pages (active page filled with primary) with
// prev/next chevrons on either side, matching the reference pagination UI.
const Pagination = ({ page, total, limit, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const go = (p) => onChange(Math.min(Math.max(1, p), pages));

  // Build the visible page range: show up to 5 consecutive pages, then an
  // ellipsis, then the last page — similar to the reference pagination.
  const visible = [];
  const maxVisible = 5;
  if (pages <= maxVisible + 2) {
    for (let i = 1; i <= pages; i++) visible.push(i);
  } else {
    const start = Math.max(1, Math.min(page - 2, pages - maxVisible + 1));
    for (let i = start; i < start + maxVisible; i++) visible.push(i);
    if (visible[visible.length - 1] !== pages) visible.push(pages);
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 rounded-full border border-border bg-surface disabled:opacity-40 hover:bg-background transition-colors flex items-center justify-center"
      >
        <ChevronLeft className="w-4 h-4 text-text-muted" />
      </button>

      <div className="flex items-center gap-1 bg-surface border border-border rounded-full px-2 py-1">
        {visible.map((p, idx) => {
          const isLast = idx === visible.length - 1;
          const showEllipsis = !isLast && p !== pages - 1 && visible[idx + 1] === pages;
          if (showEllipsis) {
            return (
              <span key="ellipsis" className="px-1.5 text-text-muted text-sm select-none">
                ...
              </span>
            );
          }
          return (
            <button
              key={p}
              onClick={() => go(p)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors flex items-center justify-center ${
                p === page ? "bg-primary text-on-accent" : "text-text-muted hover:bg-background"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => go(page + 1)}
        disabled={page === pages}
        className="w-9 h-9 rounded-full border border-border bg-surface disabled:opacity-40 hover:bg-background transition-colors flex items-center justify-center"
      >
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
};

// Shared responsive filter row: search + flexible filter controls.
const FilterBar = ({ search, onSearch, selects = [], searchPlaceholder = "Search..." }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
    {/* Search */}
    <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="w-full min-w-0 pl-4 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
      />
    </div>

    {/* Filters */}
    {selects.map((s, index) => (
      <div key={s.label || index} className="relative min-w-0">
        <select
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          aria-label={s.label || `Filter ${index + 1}`}
          className="w-full min-w-0 appearance-none bg-surface border border-border rounded-lg pl-3 pr-9 py-2.5 text-sm text-text focus:outline-none focus:border-primary transition-colors cursor-pointer"
        >
          {s.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-text-muted pointer-events-none" />
      </div>
    ))}
  </div>
);

// Format integer kobo to a naira display string.
const formatNaira = (kobo) =>
  `₦${(Number(kobo) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

// Format a date into a compact, human-readable string.
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })
    : "—";

export {
  AdminPageHeader,
  StatusPill,
  TableSkeleton,
  EmptyState,
  Pagination,
  FilterBar,
  formatNaira,
  formatDate,
};
