import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

const ADMIN_TABLE_HEAD_ROW_CLASS =
  "border-b-2 border-primary bg-primary/95 text-xs font-semibold uppercase tracking-wider text-on-accent";

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

const AdminStatCard = ({ label, value, icon: Icon, tone = "primary", meta, loading = false }) => {
  const tones = {
    primary: "bg-primary/5 text-primary",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm sm:p-5">
      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <span className={`rounded-xl p-2 ${tones[tone] || tones.primary}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {meta}
      </div>
      <p className="relative z-10 text-sm font-medium text-text-muted">{label}</p>
      <div className="relative z-10 mt-1 min-h-8 wrap-break-word font-heading text-2xl font-bold text-text">
        {loading ? (
          <span className="inline-flex items-center gap-2" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading {label.toLowerCase()}</span>
          </span>
        ) : (
          value
        )}
      </div>
      <svg
        className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 text-primary/5"
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M100 0C44.77 0 0 44.77 0 100h100V0z" />
      </svg>
    </div>
  );
};

const AdminTableHeader = ({ title, description, total, countLabel = "items" }) => (
  <div className="flex flex-col gap-1 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div>
      <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
      {description ? <p className="text-xs text-text-muted">{description}</p> : null}
    </div>
    {Number.isFinite(Number(total)) ? (
      <span className="shrink-0 text-xs text-text-muted">
        {Number(total).toLocaleString("en-NG")} {countLabel}
      </span>
    ) : null}
  </div>
);

// Colour-coded status pill; callers pass a status→style map, with an optional dot mode for binary states.
const StatusPill = ({ status, map, dot = false }) => {
  const cfg = map[status] || {
    label: status,
    cls: "bg-background text-text-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}
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

// Pagination controls; `total` and `limit` drive the page count.
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
    <nav aria-label="Table pagination" className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/30 hover:bg-background-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1">
        {visible.map((p, idx) => {
          const isLast = idx === visible.length - 1;
          const showEllipsis = !isLast && p !== pages - 1 && visible[idx + 1] === pages;
          if (showEllipsis) {
            return (
              <span key="ellipsis" className="select-none px-1.5 text-sm text-text-secondary">
                ...
              </span>
            );
          }
          return (
            <button
              type="button"
              key={p}
              onClick={() => go(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                p === page
                  ? "bg-primary text-on-accent"
                  : "text-text-secondary hover:bg-background-soft hover:text-primary"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/30 hover:bg-background-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

const AdminTablePagination = (props) => {
  const pages = Math.ceil(Number(props.total || 0) / Number(props.limit || 1));
  if (pages <= 1) return null;

  return (
    <div className="border-t border-border/60 px-4 py-3 sm:px-5">
      <Pagination {...props} />
    </div>
  );
};

const FILTER_GRID_CLASSES = {
  0: "grid-cols-1",
  1: "grid-cols-1 sm:grid-cols-[minmax(0,1.75fr)_minmax(170px,1fr)]",
  2: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(2,minmax(170px,1fr))]",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))]",
};

const SEARCH_GRID_CLASSES = {
  0: "",
  1: "",
  2: "sm:col-span-2 xl:col-span-1",
  3: "sm:col-span-2 lg:col-span-3 xl:col-span-1",
};

const AdminSearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  ariaLabel,
  icon: Icon = Search,
}) => (
  <div className="relative min-w-0">
    <Icon
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      aria-hidden="true"
    />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      className="w-full rounded-lg border border-border bg-primary/5 py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-primary focus:outline-none"
    />
  </div>
);

const AdminFilterBar = ({ search, filterCount = 0, children, ariaLabel = "List filters" }) => {
  const supportedCount = Math.min(Math.max(Number(filterCount) || 0, 0), 3);

  return (
    <section
      aria-label={ariaLabel}
      className="rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm"
    >
      <div className={`grid gap-3 ${FILTER_GRID_CLASSES[supportedCount]}`}>
        <div className={`min-w-0 ${SEARCH_GRID_CLASSES[supportedCount]}`}>{search}</div>
        {children}
      </div>
    </section>
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
    ? new Date(d).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export {
  AdminPageHeader,
  AdminStatCard,
  AdminTableHeader,
  AdminTablePagination,
  AdminFilterBar,
  AdminSearchInput,
  ADMIN_TABLE_HEAD_ROW_CLASS,
  StatusPill,
  TableSkeleton,
  EmptyState,
  Pagination,
  FilterBar,
  formatNaira,
  formatDate,
};
