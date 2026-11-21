import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { getPaginationItems } from "../../utils/pagination";
import Dropdown from "../ui/Dropdown";

const PageGap = ({ item, onSelect }) => (
  <Dropdown
    trigger={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
    ariaLabel={`Choose a page hidden ${item.position} the visible page range`}
    color="surface"
    noChevron
    direction="up"
    portal
    openOnHover={false}
    menuRole="menu"
    triggerClassName="h-9 min-w-9 justify-center px-2 sm:h-10 sm:min-w-10"
    menuClassName="max-h-64 min-w-20 overflow-y-auto"
  >
    {item.pages.map((page) => (
      <button
        key={page}
        type="button"
        role="menuitem"
        onClick={() => onSelect(page)}
        className="flex min-h-9 w-full items-center justify-center px-4 text-sm font-medium text-text transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none"
      >
        {page}
      </button>
    ))}
  </Dropdown>
);

const ShopPagination = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null;

  return (
    <nav
      className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-5"
      aria-label="Shop pages"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex min-h-10 items-center gap-1 rounded-button px-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex min-w-0 items-center justify-center gap-1">
        {getPaginationItems(page, pageCount).map((item) =>
          item.type === "page" ? (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              aria-label={`Go to page ${item.value}`}
              aria-current={item.value === page ? "page" : undefined}
              className={`h-9 min-w-9 rounded-button px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-10 sm:min-w-10 sm:text-sm ${
                item.value === page
                  ? "bg-primary text-on-accent"
                  : "bg-surface text-text-secondary hover:bg-accent-soft hover:text-primary"
              }`}
            >
              {item.value}
            </button>
          ) : (
            <PageGap key={`${item.position}-${item.pages[0]}`} item={item} onSelect={onChange} />
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        className="inline-flex min-h-10 items-center gap-1 rounded-button px-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

export default ShopPagination;
