import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { getPaginationItems } from "../../utils/pagination";
import Dropdown from "../ui/Dropdown";

// * Shared class for the top row of every admin data-table header.
const ADMIN_TABLE_HEAD_ROW_CLASS =
  "border-b-2 border-primary bg-primary/95 text-xs font-semibold uppercase tracking-wider text-on-accent";

// ? Renders an admin page heading with an optional subtitle and action button.
// Keeps all list-page titles visually consistent.
const AdminPageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-text">{title}</h1>
      {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
    </div>
    {/* Action button slot — renders whatever action prop passes through */}
    {action && <div>{action}</div>}
  </div>
);

// ? Card used for stats on admin dashboards; colour codes by `tone`.
// Calls pass a `tones` map — primary/success/warning/danger — to drive icon background.
const AdminStatCard = ({ label, value, icon: Icon, tone = "primary", meta, loading = false }) => {
  // * Maps shorthand tone names to their Tailwind classes.
  const tones = {
    primary: "bg-primary/5 text-primary",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm sm:p-5">
      {/* Top row — icon + label on the left, optional meta chip on the right */}
      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <span className={`rounded-xl p-2 ${tones[tone] || tones.primary}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {meta}
      </div>
      {/* Stat label */}
      <p className="relative z-10 text-sm font-medium text-text-muted">{label}</p>
      {/* Stat value — spinner while loading, otherwise the passed `value` */}
      <div className="relative z-10 mt-1 min-h-8 wrap-break-word font-heading text-2xl font-bold text-text">
        {loading ? (
          // * Spinner — uses role="status" so screen readers announce it as a live update.
          <span className="inline-flex items-center gap-2" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading {label.toLowerCase()}</span>
          </span>
        ) : (
          value
        )}
      </div>
      {/* Decorative curve — pointer-events-none, purely visual branding accent */}
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

// ? Header strip placed above every admin data-table; shows title + optional subtitle and item count.
const AdminTableHeader = ({ title, description, total, countLabel = "items" }) => (
  <div className="flex flex-col gap-1 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    {/* Title and optional description */}
    <div>
      <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
      {description ? <p className="text-xs text-text-muted">{description}</p> : null}
    </div>
    {/* Item count — right-aligned; only shown when `total` is a finite number */}
    {Number.isFinite(Number(total)) ? (
      <span className="shrink-0 text-xs text-text-muted">
        {Number(total).toLocaleString("en-NG")} {countLabel}
      </span>
    ) : null}
  </div>
);

// ? Small badge that displays a status value using a caller-provided colour map.
// When `dot=true`, renders a small dot instead of an icon — useful for binary on/off fields.
const StatusPill = ({ status, map, dot = false }) => {
  // * Falls back to plain unstyled label if the caller's map doesn't have this status.
  const cfg = map[status] || {
    label: status,
    cls: "bg-background text-text-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}
    >
      {/* Dot or icon — dot mode for binary fields, icon otherwise */}
      {dot ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor || "bg-current"}`} />
      ) : (
        cfg.icon && <span className="w-3 h-3 shrink-0">{cfg.icon}</span>
      )}
      {/* Status label text */}
      {cfg.label}
    </span>
  );
};

// ? Placeholder grid that mirrors a table's shape while real data loads.
// `rows` and `cols` default to 6×4 to match the common admin-table layout.
const TableSkeleton = ({ rows = 6, cols = 4 }) => (
  <div className="bg-surface rounded-xl border border-border overflow-hidden">
    <div className="divide-y divide-border">
      {/* Each row is a fake table row with `cols` pulse placeholders */}
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

// ? Shown in place of a table when a filtered list returns zero rows.
// Calls pass their own icon/title/description/action so the message stays contextual.
const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-border">
    {/* Icon — large decorative symbol at the top */}
    {icon && <div className="text-4xl mb-4">{icon}</div>}
    <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
    {description && <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">{description}</p>}
    {/* Optional action button — typically "Add new" to encourage returning from empty state */}
    {action}
  </div>
);

// ? Dropdown-triggered ellipsis between page-number groups in Pagination.
// Renders a compact pop-over with every skipped page so the user can jump without clicking through each one.
const PaginationGap = ({ pages, position, onSelect }) => {
  // * Captures the gap boundaries once — used for the screen-reader label only.
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];

  return (
    <Dropdown
      trigger={<span aria-hidden="true">...</span>}
      color="surface"
      noChevron
      noBorder
      portal
      openOnHover={false}
      direction="up"
      align={position === "before" ? "left" : "right"}
      ariaLabel={`Choose a page from ${firstPage} to ${lastPage}`}
      menuRole="menu"
      menuClassName="max-h-60 min-w-24 overflow-y-auto overscroll-contain p-1"
      triggerClassName="h-6 w-6 shrink-0 justify-center rounded-full p-0 text-xs font-semibold text-text-secondary hover:bg-background-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-8 sm:w-8 sm:text-sm"
    >
      {/* Skip-page options — rendered from the hidden pages the visible range omitted */}
      {pages.map((hiddenPage) => (
        <button
          key={hiddenPage}
          type="button"
          role="menuitem"
          onClick={() => onSelect(hiddenPage)}
          aria-label={`Go to page ${hiddenPage}`}
          className="flex min-h-8 w-full items-center justify-center rounded-lg px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-background-soft hover:text-primary focus-visible:bg-background-soft focus-visible:text-primary focus-visible:outline-none"
        >
          {hiddenPage}
        </button>
      ))}
    </Dropdown>
  );
};

// ? Full-pagination control — prev button, numbered page list with gap dropdowns, next button.
// Delegates the visible-range calculation to getPaginationItems() so this component stays dumb about algorithm details.
const Pagination = ({ page, total, limit, onChange }) => {
  // * Guard: nothing to paginate when there's at most one page.
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  // * Clamped navigation handler — prevents going below 1 or above the final page.
  const go = (p) => onChange(Math.min(Math.max(1, p), pages));

  // * Computes which page numbers and gaps to render for the current window.
  const items = getPaginationItems(page, pages);

  return (
    <nav
      aria-label="Table pagination"
      className="flex w-full min-w-0 items-center justify-center gap-0.5 sm:gap-3"
    >
      {/* Previous page button — disabled on the first page */}
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/30 hover:bg-background-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Page number strip — renders each visible page or a PaginationGap dropdown */}
      <div className="flex min-w-0 items-center gap-0.5 rounded-full border border-border bg-surface px-1 py-1 sm:gap-1 sm:px-2">
        {items.map((item) => {
          if (item.type === "gap") {
            return (
              <PaginationGap
                key={`gap-${item.position}-${item.pages[0]}`}
                pages={item.pages}
                position={item.position}
                onSelect={go}
              />
            );
          }

          const pageNumber = item.value;

          return (
            <button
              type="button"
              key={pageNumber}
              onClick={() => go(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === page ? "page" : undefined}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-8 sm:w-8 sm:text-sm ${
                pageNumber === page
                  ? "bg-primary text-on-accent"
                  : "text-text-secondary hover:bg-background-soft hover:text-primary"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* Next page button — disabled on the final page */}
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/30 hover:bg-background-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

// ? Wraps Pagination in a bottom bar with a subtle top border — matches the admin table footer style.
const AdminTablePagination = (props) => {
  // * Re-computes the page count here rather than letting Pagination do it, so we can short-circuit before rendering anything when there's only one page.
  const pages = Math.ceil(Number(props.total || 0) / Number(props.limit || 1));
  if (pages <= 1) return null;

  return (
    <div className="border-t border-border/60 px-2 py-3 sm:px-5">
      <Pagination {...props} />
    </div>
  );
};

// * Responsive grid classes for the filter bar search column across 0–3 filters.
const FILTER_GRID_CLASSES = {
  0: "grid-cols-1",
  1: "grid-cols-1 sm:grid-cols-[minmax(0,1.75fr)_minmax(170px,1fr)]",
  2: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(2,minmax(170px,1fr))]",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))]",
};

// * Class overrides for the search input cell within the filter-grid, scoped by filter-count.
const SEARCH_GRID_CLASSES = {
  0: "",
  1: "",
  2: "sm:col-span-2 xl:col-span-1",
  3: "sm:col-span-2 lg:col-span-3 xl:col-span-1",
};

// ? Search input styled for the admin filter bar — left-padded for the optional icon.
// Accepts a custom lucide icon via the `icon` prop; defaults to the imported Search glyph.
const AdminSearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  ariaLabel,
  icon: Icon = Search,
}) => (
  <div className="relative min-w-0">
    {/* Decorative search icon fixed at the left edge */}
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

// ? Filter bar container used by admin list pages; wraps a search input and up to three select-based filters.
// `filterCount` drives responsive grid layout (0–3); values outside that range clamp silently.
const AdminFilterBar = ({ search, filterCount = 0, children, ariaLabel = "List filters" }) => {
  // * Clamps filterCount to [0, 3] — any value beyond 3 gets treated as 3 so the CSS class map stays valid.
  const supportedCount = Math.min(Math.max(Number(filterCount) || 0, 0), 3);

  return (
    <section
      aria-label={ariaLabel}
      className="rounded-[20px] border border-border/60 bg-surface p-4 shadow-sm"
    >
      {/* Responsive filter grid — search takes a larger share on wider screens */}
      <div className={`grid gap-3 ${FILTER_GRID_CLASSES[supportedCount]}`}>
        <div className={`min-w-0 ${SEARCH_GRID_CLASSES[supportedCount]}`}>{search}</div>
        {children}
      </div>
    </section>
  );
};

// ? Lightweight standalone filter row used outside the modal-filter-bar context (e.g., account dashboard filters).
// Unlike AdminFilterBar, this always uses a fixed wide grid regardless of filter count.
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
};
