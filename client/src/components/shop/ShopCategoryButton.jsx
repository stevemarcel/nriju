import { Check, LayoutGrid } from "lucide-react";
import { getCategoryIcon } from "../../utils/categoryIcons";

const ShopCategoryButton = ({ category, selected, onSelect, compact = false }) => {
  const isAll = !category;
  const Icon = isAll ? LayoutGrid : getCategoryIcon(category.name).Icon;
  const label = isAll ? "All products" : category.name;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-chip border px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          selected
            ? "border-primary bg-primary text-on-accent"
            : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:text-primary"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-10 w-full items-center gap-3 rounded-button px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        selected
          ? "bg-accent-soft font-semibold text-primary"
          : "text-text-secondary hover:bg-surface hover:text-text"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
};

export default ShopCategoryButton;
