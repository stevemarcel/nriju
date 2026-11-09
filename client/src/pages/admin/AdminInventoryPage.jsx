import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  TableSkeleton,
  EmptyState,
  Pagination,
  formatNaira,
  formatDate,
} from "../../components/admin/AdminPrimitives";
import Dropdown from "../../components/ui/Dropdown";
import { getCategoryIcon } from "../../utils/categoryIcons";
import {
  Package,
  AlertTriangle,
  MinusCircle,
  Wallet,
  Search,
  Check,
  Filter,
  Edit,
  Trash2,
  RotateCcw,
  Archive,
  FolderOpen,
} from "lucide-react";

const SOURCE_BADGES = {
  restock: { label: "Restock", cls: "bg-emerald-50 text-emerald-700" },
  order: { label: "Order", cls: "bg-blue-50 text-blue-700" },
  adjust: { label: "Adjust", cls: "bg-amber-50 text-amber-700" },
  damaged: { label: "Damaged", cls: "bg-rose-50 text-rose-700" },
  return: { label: "Return", cls: "bg-violet-50 text-violet-700" },
  void: { label: "Void", cls: "bg-slate-100 text-slate-500" },
};

const STATUS_OPTIONS = [
  { value: "", label: "All Inventory", Icon: Filter, color: "text-text-muted" },
  { value: "true", label: "Active Only", Icon: Check, color: "text-emerald-500" },
  { value: "false", label: "Inactive Only", Icon: Archive, color: "text-slate-500" },
];

const AdminInventoryPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "inventory", page, search, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("reason", search);
      if (statusFilter) params.set("isActive", statusFilter);
      if (categoryFilter) params.set("product", categoryFilter);
      const res = await api.get(`/inventory?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch categories and products for filters
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin", "products", "stats"],
    queryFn: async () => (await api.get("/products/stats")).data,
  });

  const batches = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };
  const productStats = productsData?.data ?? { total: 0, active: 0, lowStock: 0, outOfStock: 0 };
  const categories = categoriesData?.data ?? [];

  // Compute stock value from batches with costPrice
  const stockValue = useMemo(() => {
    return batches.reduce((sum, b) => {
      const cost = b.product?.costPrice || 0;
      return sum + cost * Math.max(0, b.quantity);
    }, 0);
  }, [batches]);

  const statsCards = useMemo(
    () => [
      {
        label: "Active Batches",
        value: meta.total,
        icon: Package,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: "Low Stock",
        value: productStats.lowStock,
        icon: AlertTriangle,
        color: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        label: "Out of Stock",
        value: productStats.outOfStock,
        icon: MinusCircle,
        color: "text-rose-600",
        bg: "bg-rose-50",
      },
      {
        label: "Stock Value",
        value: formatNaira(stockValue),
        icon: Wallet,
        color: "text-text",
        bg: "bg-background-soft",
      },
    ],
    [meta.total, productStats.lowStock, productStats.outOfStock, stockValue],
  );

  const categorySelectOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <div>
      <AdminPageHeader title="Inventory" subtitle={`${batches.length} batches shown`} />

      {/* Filter bar */}
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 p-4 mb-4 flex flex-col items-stretch md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-3 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search batches..."
            className="w-full pl-9 pr-4 py-2 bg-primary/5 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap flex-2">
          {/* Status Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
            <Dropdown
              trigger={
                <>
                  {(() => {
                    const { Icon } =
                      STATUS_OPTIONS.find((s) => s.value === statusFilter) || STATUS_OPTIONS[0];
                    return <Icon className="w-4 h-4 mr-2 text-white group-hover:text-white" />;
                  })()}
                  <span className="flex-1 text-left whitespace-nowrap">
                    {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || "All Inventory"}
                  </span>
                </>
              }
              color="primary"
              fullWidth
              menuClassName="sm:w-48"
            >
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatusFilter(s.value);
                    setPage(1);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                    statusFilter === s.value
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-text"
                  }`}
                >
                  <s.Icon className={`w-4 h-4 ${s.color}`} />
                  <span className="flex-1">{s.label}</span>
                  {statusFilter === s.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </Dropdown>
          </div>

          {/* Category Filter */}
          <div className="relative w-full md:w-0 md:flex-1">
            <Dropdown
              trigger={
                <>
                  {(() => {
                    const cat = categories.find((c) => c._id === categoryFilter);
                    const { Icon } = cat ? getCategoryIcon(cat.name) : { Icon: FolderOpen };
                    return <Icon className="w-4 h-4 mr-2 text-white group-hover:text-white" />;
                  })()}
                  <span className="flex-1 text-left whitespace-nowrap">
                    {categoryFilter
                      ? categories.find((c) => c._id === categoryFilter)?.name || "All Categories"
                      : "All Categories"}
                  </span>
                </>
              }
              color="primary"
              fullWidth
              menuClassName="sm:w-52"
            >
              <button
                onClick={() => {
                  setCategoryFilter("");
                  setPage(1);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                  categoryFilter === "" ? "text-primary font-semibold bg-primary/5" : "text-text"
                }`}
              >
                <FolderOpen className="w-4 h-4 text-text-muted" />
                <span className="flex-1">All Categories</span>
                {categoryFilter === "" && <Check className="w-3.5 h-3.5" />}
              </button>
              {categories.map((c) => {
                const { Icon, color } = getCategoryIcon(c.name);
                return (
                  <button
                    key={c._id}
                    onClick={() => {
                      setCategoryFilter(c._id);
                      setPage(1);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                      categoryFilter === c._id
                        ? "text-primary font-semibold bg-primary/5"
                        : "text-text"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="flex-1">{c.name}</span>
                    {categoryFilter === c._id && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statsCards.map((s) => (
          <div
            key={s.label}
            className="relative bg-surface rounded-[20px] p-5 shadow-sm border border-border/60 overflow-hidden"
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <div className="text-sm font-medium text-text-muted">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            <svg
              className="absolute -bottom-2 -right-2 w-20 h-20 text-primary/5 pointer-events-none"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              <path d="M100 0C44.77 0 0 44.77 0 100h100V0z" />
            </svg>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={8} />
          ) : !batches.length ? (
            <EmptyState
              icon={<Package className="mx-auto w-10 h-10 text-text-muted" />}
              title="No inventory batches found"
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-primary/95 text-on-accent text-xs uppercase tracking-wider font-semibold border-b-2 border-primary">
                  <th className="text-left py-4 px-4">Product</th>
                  <th className="text-left py-4 px-4">Batch</th>
                  <th className="text-center py-4 px-4">Source</th>
                  <th className="text-center py-4 px-4">Qty</th>
                  <th className="text-left py-4 px-4">Expiry</th>
                  <th className="text-right py-4 px-4">Stock Value</th>
                  <th className="text-left py-4 px-4">Updated By</th>
                  <th className="text-center py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {batches.map((b) => {
                  const badge = SOURCE_BADGES[b.source] ?? SOURCE_BADGES.restock;
                  const expired = b.expiryDate && new Date(b.expiryDate) < new Date();
                  const costValue = (b.product?.costPrice || 0) * Math.max(0, b.quantity);
                  return (
                    <tr key={b._id} className="hover:bg-background-soft/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {b.product?.images?.[0] ? (
                            <img
                              src={b.product.images[0]}
                              alt={b.product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-background-soft flex items-center justify-center">
                              <Package className="w-5 h-5 text-text-muted" />
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-text block truncate">
                              {b.product?.name || "—"}
                            </span>
                            <span className="text-xs text-text-muted">
                              {b.product?.category?.name || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-text-muted">{b.batch}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{b.quantity}</td>
                      <td className={`py-3 px-4 text-center ${expired ? "text-rose-600" : ""}`}>
                        {formatDate(b.expiryDate)}
                        {expired && <span className="block text-xs">(expired)</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-heading font-semibold">
                        {formatNaira(costValue)}
                      </td>
                      <td className="py-3 px-4 text-left">
                        <span className="text-sm text-text-muted">{b.createdBy?.name || "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            title="Edit batch"
                            className="p-1.5 rounded bg-background-soft hover:bg-blue-50 text-text-muted hover:text-blue-600 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete batch"
                            className="p-1.5 rounded bg-background-soft hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Restore if inactive"
                            disabled={b.isActive}
                            className="p-1.5 rounded bg-background-soft hover:bg-emerald-50 text-text-muted hover:text-emerald-600 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Pagination page={page} total={meta.total} limit={meta.limit} onChange={setPage} />
    </div>
  );
};

export default AdminInventoryPage;
