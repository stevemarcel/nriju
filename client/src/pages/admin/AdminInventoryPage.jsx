import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  AdminStatCard,
  AdminFilterBar,
  AdminSearchInput,
  AdminTableHeader,
  AdminTablePagination,
  ADMIN_TABLE_HEAD_ROW_CLASS,
  EmptyState,
  StatusPill,
  TableSkeleton,
  formatNaira,
} from "../../components/admin/AdminPrimitives";
import StockActionModal from "../../components/admin/StockActionModal";
import Dropdown from "../../components/ui/Dropdown";
import { getCategoryIcon } from "../../utils/categoryIcons";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  Check,
  CircleDollarSign,
  Edit3,
  FolderOpen,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldAlert,
  ClipboardList,
} from "lucide-react";

const INVENTORY_STATUS_MAP = {
  in_stock: {
    label: "In stock",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  low_stock: {
    label: "Low stock",
    cls: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
  },
  out_of_stock: {
    label: "Out of stock",
    cls: "bg-rose-100 text-rose-700",
    dotColor: "bg-rose-500",
  },
  archived: {
    label: "Archived",
    cls: "bg-slate-100 text-slate-600",
    dotColor: "bg-slate-500",
  },
};

const INVENTORY_FILTERS = [
  {
    value: "all",
    label: "All stock",
    icon: ClipboardList,
    color: "text-text-muted",
  },
  {
    value: "active",
    label: "Active products",
    icon: Check,
    color: "text-emerald-500",
  },
  {
    value: "inStock",
    label: "In stock",
    icon: Package,
    color: "text-emerald-500",
  },
  {
    value: "lowStock",
    label: "Low stock",
    icon: AlertTriangle,
    color: "text-amber-500",
  },
  {
    value: "outOfStock",
    label: "Out of stock",
    icon: AlertCircle,
    color: "text-rose-500",
  },
  {
    value: "archived",
    label: "Archived",
    icon: FolderOpen,
    color: "text-slate-500",
  },
];

const STOCK_ACTIONS = [
  { value: "add", label: "Add stock", icon: Plus, color: "text-emerald-600" },
  {
    value: "remove",
    label: "Remove stock",
    icon: Minus,
    color: "text-rose-600",
  },
  {
    value: "adjust",
    label: "Adjust stock",
    icon: Edit3,
    color: "text-amber-600",
  },
  {
    value: "damage",
    label: "Record damage",
    icon: ShieldAlert,
    color: "text-orange-600",
  },
];

const AdminInventoryPage = () => {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [stockAction, setStockAction] = useState(null);

  const buildParams = () => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });

    if (search.trim()) params.set("search", search.trim());
    if (categoryFilter !== "all") params.set("category", categoryFilter);

    if (stockFilter === "archived") {
      params.set("isActive", "false");
    } else if (stockFilter === "active") {
      params.set("isActive", "true");
    } else if (["inStock", "lowStock", "outOfStock"].includes(stockFilter)) {
      params.set("stockFilter", stockFilter);
      params.set("isActive", "true");
    }

    return params;
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const {
    data: inventoryData,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "inventory", page, search, stockFilter, categoryFilter],
    queryFn: async () => {
      const response = await api.get(`/inventory?${buildParams().toString()}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const { data: statsResponse, isPending: statsPending } = useQuery({
    queryKey: ["admin", "inventory", "stats"],
    queryFn: async () => (await api.get("/inventory/stats")).data,
  });

  const products = inventoryData?.data ?? [];
  const meta = inventoryData?.meta ?? { page, limit: 10, total: 0 };
  const stats = statsResponse?.data ?? {
    activeProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    stockValue: 0,
  };

  const selectedFilter =
    INVENTORY_FILTERS.find((item) => item.value === stockFilter) || INVENTORY_FILTERS[0];
  const SelectedFilterIcon = selectedFilter.icon;
  const selectedCategory = categories.find((category) => category._id === categoryFilter);
  const SelectedCategoryIcon = selectedCategory
    ? getCategoryIcon(selectedCategory.name).Icon
    : FolderOpen;

  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const openStockAction = (product, action) => {
    setStockAction({ product, action });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        subtitle="Monitor available stock, inventory value and stock movements."
      />

      {/* Inventory overview */}
      <section
        aria-label="Inventory overview"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
        <AdminStatCard
          label="Active products"
          value={stats.activeProducts.toLocaleString("en-NG")}
          icon={Package}
          tone="primary"
          loading={statsPending}
          meta={
            <span className="max-w-28 text-right text-xs text-text-muted">
              Active catalogue items
            </span>
          }
        />
        <AdminStatCard
          label="Stock cost value"
          value={formatNaira(stats.stockValue)}
          icon={CircleDollarSign}
          tone="success"
          loading={statsPending}
          meta={
            <span className="max-w-28 text-right text-xs text-text-muted">
              Batch cost with product fallback
            </span>
          }
        />
        <AdminStatCard
          label="Low stock"
          value={stats.lowStock.toLocaleString("en-NG")}
          icon={AlertTriangle}
          tone="warning"
          loading={statsPending}
          meta={
            <span className="max-w-28 text-right text-xs text-text-muted">Needs replenishment</span>
          }
        />
        <AdminStatCard
          label="Out of stock"
          value={stats.outOfStock.toLocaleString("en-NG")}
          icon={AlertCircle}
          tone="danger"
          loading={statsPending}
          meta={
            <span className="max-w-28 text-right text-xs text-text-muted">No available units</span>
          }
        />
      </section>

      {/* Inventory filters */}
      <AdminFilterBar
        filterCount={2}
        ariaLabel="Inventory filters"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search products..."
            ariaLabel="Search inventory products"
          />
        }
      >
        <div className="relative min-w-0">
          <Dropdown
            trigger={
              <>
                <SelectedFilterIcon
                  className={`mr-2 h-4 w-4 shrink-0 ${selectedFilter.color} text-white group-hover:text-white`}
                />
                <span className="min-w-0 flex-1 truncate text-left">{selectedFilter.label}</span>
              </>
            }
            color="primary"
            fullWidth
            menuClassName="sm:w-56"
          >
            {INVENTORY_FILTERS.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeFilter(setStockFilter, value)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-background ${
                  stockFilter === value ? "bg-primary/5 font-semibold text-primary" : "text-text"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="flex-1">{label}</span>
                {stockFilter === value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </Dropdown>
        </div>

        <div className="relative min-w-0">
          <Dropdown
            trigger={
              <>
                <SelectedCategoryIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {selectedCategory?.name || "All categories"}
                </span>
              </>
            }
            color="primary"
            fullWidth
            menuClassName="sm:w-60"
          >
            <button
              type="button"
              onClick={() => changeFilter(setCategoryFilter, "all")}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-background ${
                categoryFilter === "all" ? "bg-primary/5 font-semibold text-primary" : "text-text"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="flex-1">All categories</span>
              {categoryFilter === "all" && <Check className="h-3.5 w-3.5" />}
            </button>
            {categories.map((category) => {
              const { Icon, color } = getCategoryIcon(category.name);
              return (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => changeFilter(setCategoryFilter, category._id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-background ${
                    categoryFilter === category._id
                      ? "bg-primary/5 font-semibold text-primary"
                      : "text-text"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="flex-1">{category.name}</span>
                  {categoryFilter === category._id && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </Dropdown>
        </div>
      </AdminFilterBar>

      {/* Inventory list */}
      <section className="overflow-hidden rounded-[20px] border border-border/60 bg-surface shadow-sm">
        <AdminTableHeader
          title="Stock by product"
          description="Manage available quantities and record stock movements."
          total={meta.total}
          countLabel="products"
        />

        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={7} cols={7} />
          ) : isError ? (
            <EmptyState
              icon={<AlertCircle className="mx-auto h-10 w-10 text-rose-500" />}
              title="Unable to load inventory"
              description={error?.response?.data?.message || "Check your connection and try again."}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="mx-auto h-10 w-10 text-text-muted" />}
              title="No inventory found"
              description="Try changing your search or filters. Products with no stock will still appear when you select All stock."
            />
          ) : (
            <table className="w-full min-w-5xl text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                  <th className="min-w-60 px-4 py-4 text-left">Product</th>
                  <th className="min-w-40 px-4 py-4 text-left">Category</th>
                  <th className="w-32 whitespace-nowrap px-4 py-4 text-right">Cost / unit</th>
                  <th className="w-32 whitespace-nowrap px-4 py-4 text-right">Selling price</th>
                  <th className="w-36 whitespace-nowrap px-4 py-4 text-center">Available stock</th>
                  <th className="w-32 px-4 py-4 text-center">Status</th>
                  <th className="w-44 px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {products.map((product) => {
                  const hasCost =
                    product.costPrice !== null &&
                    product.costPrice !== undefined &&
                    Number.isSafeInteger(Number(product.costPrice)) &&
                    Number(product.costPrice) >= 0;
                  const { Icon: CategoryIcon } =
                    product.category && product.category !== "—"
                      ? getCategoryIcon(product.category)
                      : { Icon: FolderOpen };

                  return (
                    <tr key={product._id} className="transition-colors hover:bg-background-soft/30">
                      <td className="px-4 py-3">
                        <div className="flex min-w-52.5 items-center gap-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              loading="lazy"
                              className="h-11 w-11 shrink-0 rounded-lg border border-border/50 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background-soft">
                              <Package className="h-5 w-5 text-text-muted" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">{product.name}</p>
                            <p className="text-xs text-text-muted">{product.unit || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <CategoryIcon className="h-3.5 w-3.5" />
                          {product.category || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {hasCost ? (
                          formatNaira(product.costPrice)
                        ) : (
                          <span className="text-text-muted">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatNaira(product.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                          <span className="font-semibold tabular-nums text-text">
                            {Number(product.stock ?? 0).toLocaleString("en-NG")}
                          </span>
                          <span className="text-xs text-text-muted">{product.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill
                          status={product.status || (product.isActive ? "in_stock" : "archived")}
                          map={INVENTORY_STATUS_MAP}
                          dot
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <Dropdown
                            trigger={
                              <>
                                <ArrowDownUp className="h-3 w-3" />
                                <span>Manage stock</span>
                              </>
                            }
                            color="table"
                            noBorder
                            triggerClassName="whitespace-nowrap"
                            align="right"
                            portal
                            menuClassName="sm:w-44"
                          >
                            {STOCK_ACTIONS.map(({ value, label, icon: Icon, color }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => openStockAction(product, value)}
                                disabled={!product.isActive}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-text transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Icon className={`h-4 w-4 ${color}`} />
                                {label}
                              </button>
                            ))}
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!isPending && !isError && products.length > 0 ? (
          <AdminTablePagination
            page={meta.page || page}
            total={meta.total || 0}
            limit={meta.limit || 10}
            onChange={setPage}
          />
        ) : null}

        <p className="flex items-start gap-2 border-t border-border/60 bg-background-soft/30 px-4 py-3 text-xs text-text-muted sm:px-5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Stock cost value uses each batch's acquisition cost, with the product's saved cost as a
          fallback when a batch has no cost.
        </p>
      </section>

      {/* Stock actions continue to use the shared stock modal and API workflow. */}
      {stockAction && (
        <StockActionModal
          product={stockAction.product}
          action={stockAction.action}
          onClose={() => setStockAction(null)}
        />
      )}
    </div>
  );
};

export default AdminInventoryPage;
