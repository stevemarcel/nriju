import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import {
  AdminPageHeader,
  AdminStatCard,
  AdminFilterBar,
  AdminSearchInput,
  AdminTableHeader,
  AdminTablePagination,
  ADMIN_TABLE_HEAD_ROW_CLASS,
  TableSkeleton,
  EmptyState,
  StatusPill,
} from "../../components/admin/AdminPrimitives";
import { formatNaira } from "../../utils/formatMoney";
import { formatDate } from "../../utils/formatDate";
import ProductFormModal from "../../components/admin/ProductFormModal";
import StockActionModal from "../../components/admin/StockActionModal";
import CategoryManagerModal from "../../components/admin/CategoryManagerModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import Dropdown from "../../components/ui/Dropdown";
import { getCategoryIcon } from "../../utils/categoryIcons";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  RotateCcw,
  Archive,
  Check,
  Loader2,
  FolderOpen,
  AlertCircle,
  Box,
  ArrowDownUp,
  Minus,
  Edit3,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

const PRODUCT_STATUS_MAP = {
  true: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  false: {
    label: "Archived",
    cls: "bg-rose-100 text-rose-700",
    dotColor: "bg-rose-500",
  },
};

const PRODUCT_SORT_OPTIONS = [
  { value: "name_asc", label: "Name: A–Z" },
  { value: "name_desc", label: "Name: Z–A" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "recently_updated", label: "Recently updated" },
  { value: "price_asc", label: "Price: Low to high" },
  { value: "price_desc", label: "Price: High to low" },
  { value: "stock_asc", label: "Stock: Low to high" },
  { value: "stock_desc", label: "Stock: High to low" },
];

const AdminProductsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processingIds, setProcessingIds] = useState(new Set());
  const isProcessing = (id) => processingIds.has(id);

  const statusLabels = {
    all: { label: "All Products", Icon: Package, color: "text-text-muted" },
    active: { label: "Active", Icon: Check, color: "text-emerald-500" },
    archived: { label: "Archived", Icon: Archive, color: "text-slate-500" },
    lowStock: {
      label: "Low in stock",
      Icon: RotateCcw,
      color: "text-amber-500",
    },
    outOfStock: {
      label: "Out of stock",
      Icon: AlertCircle,
      color: "text-rose-500",
    },
  };

  // --- Query helpers ---
  const buildParams = (extra = {}) => {
    const params = new URLSearchParams();
    if (statusFilter === "archived") params.set("isActive", "false");
    else if (statusFilter === "active") params.set("isActive", "true");
    else if (statusFilter === "lowStock") params.set("stockFilter", "lowStock");
    else if (statusFilter === "outOfStock") params.set("stockFilter", "outOfStock");
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    Object.entries(extra).forEach(([k, v]) => v && params.set(k, v));
    return params;
  };

  // --- Stats card helper ---
  const trendPct = (s) => {
    if (s.pct === 0 || s.pct === null) return "0%";
    return (
      <>
        {s.trend === "up" && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 15l7-7 7 7"
            />
          </svg>
        )}
        {s.trend === "down" && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
        {s.trend === "up" ? "+" : "-"}
        {s.pct}%
      </>
    );
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const { data, isPending } = useQuery({
    queryKey: ["admin", "products", page, search, statusFilter, categoryFilter, sortBy],
    queryFn: async () => {
      const res = await api.get(
        `/products/all?${buildParams({
          page,
          limit: 10,
          sort: sortBy,
        }).toString()}`,
      );

      return res.data;
    },
  });

  const { data: statsData, isPending: statsPending } = useQuery({
    queryKey: ["admin", "products", "stats", statusFilter, categoryFilter, search],
    queryFn: async () => {
      const res = await api.get(`/products/stats?${buildParams({ search }).toString()}`);
      return res.data;
    },
  });

  const stats = statsData?.data ?? {
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
  };
  const products = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, limit: 20 };

  const statsCards = useMemo(
    () => [
      {
        label: "Total Products",
        value: stats.total,
        icon: Box,
        tone: "danger",
        pct: 0,
        trend: "neutral",
      },
      {
        label: "Active",
        value: stats.active,
        icon: Check,
        tone: "success",
        pct: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
        trend: stats.total > 0 ? (stats.active / stats.total >= 0.8 ? "up" : "down") : "neutral",
      },
      {
        label: "Low Stock",
        value: stats.lowStock,
        icon: RotateCcw,
        tone: "warning",
        pct: stats.total > 0 ? Math.round((stats.lowStock / stats.total) * 100) : 0,
        trend: stats.lowStock === 0 ? "up" : stats.lowStock <= 2 ? "neutral" : "down",
      },
      {
        label: "Out of Stock",
        value: stats.outOfStock,
        icon: AlertCircle,
        tone: "danger",
        pct: stats.total > 0 ? Math.round((stats.outOfStock / stats.total) * 100) : 0,
        trend: stats.outOfStock === 0 ? "up" : "down",
      },
    ],
    [stats.total, stats.active, stats.lowStock, stats.outOfStock],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p._id)),
    );

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    setConfirmTarget({ action: "bulk-archive", ids: [...selectedIds] });
  };

  const handleBulkRestore = () => {
    if (selectedIds.size === 0) return;
    setConfirmTarget({ action: "bulk-restore", ids: [...selectedIds] });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmTarget({ action: "bulk-delete", ids: [...selectedIds] });
  };

  const selectedProducts = products.filter((p) => selectedIds.has(p._id));
  const hasArchived = selectedProducts.some((p) => !p.isActive);
  const hasActive = selectedProducts.some((p) => p.isActive);

  const optimisticUpdate = (ids, isActive, { remove = false } = {}) => {
    queryClient.setQueriesData(["admin", "products"], (old) => {
      // The prefix also matches the stats query, whose data is an object.
      if (!old || !Array.isArray(old.data)) return old;
      return {
        ...old,
        data: remove
          ? old.data.filter((p) => !ids.includes(p._id))
          : old.data.map((p) => (ids.includes(p._id) ? { ...p, isActive } : p)),
      };
    });
  };

  const archiveMutation = useMutation({
    mutationFn: async (p) => {
      optimisticUpdate([p._id], !p.isActive);
      setProcessingIds((prev) => new Set(prev).add(p._id));
      return api.put(`/products/${p._id}`, { isActive: !p.isActive });
    },
    onSuccess: (_data, p) => {
      invalidate();
      toast.success(p.isActive ? "Product archived" : "Product restored");
    },
    onError: invalidate,
    onSettled: (_data, _err, p) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(p._id);
        return next;
      }),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id) => {
      optimisticUpdate([id], false);
      setProcessingIds((prev) => new Set(prev).add(id));
      return api.put(`/products/${id}`, { isActive: false });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Product archived");
    },
    onError: invalidate,
    onSettled: (_data, _err, id) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => {
      optimisticUpdate([id], false, { remove: true });
      setProcessingIds((prev) => new Set(prev).add(id));
      return api.delete(`/products/${id}?permanent=true`);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Product permanently deleted");
    },
    onError: invalidate,
    onSettled: (_data, _err, id) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids) => {
      optimisticUpdate(ids, false);
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      return Promise.all(ids.map((id) => api.put(`/products/${id}`, { isActive: false })));
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidate();
      toast.success("Products archived");
    },
    onError: invalidate,
    onSettled: (_data, _err, ids) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => {
      optimisticUpdate(ids, false, { remove: true });
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      return Promise.all(ids.map((id) => api.delete(`/products/${id}?permanent=true`)));
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidate();
      toast.success("Products deleted");
    },
    onError: invalidate,
    onSettled: (_data, _err, ids) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }),
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: (ids) => {
      optimisticUpdate(ids, true);
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      return Promise.all(ids.map((id) => api.put(`/products/${id}`, { isActive: true })));
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidate();
      toast.success("Products restored");
    },
    onError: invalidate,
    onSettled: (_data, _err, ids) =>
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }),
  });

  const handleArchive = (p) => {
    archiveMutation.mutate(p);
  };

  const handleSoftDelete = (p) => {
    setConfirmTarget({ product: p, action: "archive" });
  };

  const handlePermanentDelete = (p) => {
    setConfirmTarget({ product: p, action: "delete" });
  };

  const toggleModal = (v) => setModal(v);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        subtitle="Manage product details, pricing, availability and visibility."
        action={
          <div className="grid w-full gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => setCategoryManagerOpen(true)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-background-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:w-auto"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              Manage categories
            </button>
            <button
              type="button"
              onClick={() => toggleModal("create")}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add product
            </button>
          </div>
        }
      />

      {/* Stats row */}
      <section
        aria-label="Product overview"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
        {statsCards.map((s) => (
          <AdminStatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            tone={s.tone}
            loading={statsPending}
            meta={
              statsPending ? null : (
                <span
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    s.pct === 0 || s.pct === null
                      ? "bg-background-soft text-text-muted"
                      : s.trend === "up"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {trendPct(s)}
                </span>
              )
            }
          />
        ))}
      </section>

      {/* Filter bar */}
      <AdminFilterBar
        filterCount={3}
        ariaLabel="Product filters"
        search={
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search products..."
            ariaLabel="Search products"
          />
        }
      >
        {/* Status Filter */}
        <div className="relative w-full min-w-0">
          <Dropdown
            trigger={
              <>
                {(() => {
                  const { Icon, color } = statusLabels[statusFilter];
                  return (
                    <Icon className={`w-4 h-4 mr-2 ${color} text-white group-hover:text-white`} />
                  );
                })()}
                <span className="flex-1 text-left whitespace-nowrap">
                  {" "}
                  {statusLabels[statusFilter].label}
                </span>
              </>
            }
            color="primary"
            fullWidth
            menuClassName="sm:w-48"
          >
            {Object.entries(statusLabels).map(([value, { label, Icon, color }]) => (
              <button
                key={value}
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                  statusFilter === value ? "text-primary font-semibold bg-primary/5" : "text-text"
                }`}
              >
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="flex-1">{label}</span>
                {statusFilter === value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </Dropdown>
        </div>

        {/* Category Filter */}
        <div className="relative w-full min-w-0">
          <Dropdown
            trigger={
              <>
                {(() => {
                  const cat = categories.find((c) => c._id === categoryFilter);
                  const { Icon, color } = cat
                    ? getCategoryIcon(cat.name)
                    : { Icon: FolderOpen, color: "text-text-muted" };
                  return (
                    <Icon className={`w-4 h-4 mr-2 ${color} text-white group-hover:text-white`} />
                  );
                })()}
                <span className="flex-1 text-left whitespace-nowrap">
                  {categoryFilter === "all"
                    ? "All Categories"
                    : categories.find((c) => c._id === categoryFilter)?.name || "All Categories"}
                </span>
              </>
            }
            color="primary"
            fullWidth
            menuClassName="sm:w-52"
          >
            <button
              onClick={() => {
                setCategoryFilter("all");
                setPage(1);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                categoryFilter === "all" ? "text-primary font-semibold bg-primary/5" : "text-text"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="flex-1">All Categories</span>
              {categoryFilter === "all" && <Check className="w-3.5 h-3.5" />}
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

        {/* Sort Filter */}
        <div className="relative w-full min-w-0">
          <Dropdown
            trigger={
              <>
                <ArrowDownUp className="w-4 h-4 mr-2 text-white" />
                <span className="flex-1 text-left whitespace-nowrap">
                  {PRODUCT_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ||
                    "Name: A–Z"}
                </span>
              </>
            }
            color="primary"
            fullWidth
            menuClassName="sm:w-52"
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setPage(1);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                  sortBy === option.value ? "text-primary font-semibold bg-primary/5" : "text-text"
                }`}
              >
                <span className="flex-1">{option.label}</span>
                {sortBy === option.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </Dropdown>
        </div>
      </AdminFilterBar>
      <div className="bg-surface rounded-[20px] shadow-sm border border-border/60 overflow-hidden">
        <AdminTableHeader
          title="Product catalogue"
          description="Review product details, pricing and availability."
          total={meta.total}
          countLabel="products"
        />
        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-border/60 bg-background-soft/30 p-4">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              {hasActive && (
                <button
                  onClick={handleBulkArchive}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors flex items-center gap-1"
                >
                  <Archive className="w-3 h-3" /> Archive ({selectedIds.size})
                </button>
              )}
              {hasArchived && (
                <button
                  onClick={handleBulkRestore}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background-soft hover:bg-emerald-50 text-text-muted hover:text-emerald-700 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Restore ({selectedIds.size})
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete ({selectedIds.size})
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          {isPending ? (
            <TableSkeleton rows={6} cols={7} />
          ) : !products.length ? (
            <EmptyState
              icon={<Package className="mx-auto w-10 h-10 text-text-muted" />}
              title="No products found"
              description="Try adjusting the search or filters."
            />
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className={ADMIN_TABLE_HEAD_ROW_CLASS}>
                  <th className="py-4 px-4 w-10">
                    <button
                      onClick={toggleAll}
                      aria-label={
                        products.length > 0 && selectedIds.size === products.length
                          ? "Deselect all products"
                          : "Select all products"
                      }
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                        products.length > 0 && selectedIds.size === products.length
                          ? "border-on-accent bg-on-accent"
                          : "border-white/60 bg-transparent hover:border-on-accent"
                      }`}
                    >
                      {products.length > 0 && selectedIds.size === products.length && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4">Product</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Price</th>
                  <th className="py-4 px-4">Stock</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Added</th>
                  <th className="py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border admin-table">
                {products.map((p) => (
                  <tr
                    key={p._id}
                    className={`hover:bg-background-soft/30 ${
                      selectedIds.has(p._id) ? "selected" : ""
                    }`}
                    style={
                      selectedIds.has(p._id)
                        ? { backgroundColor: "rgba(154, 43, 33, 0.08)" }
                        : undefined
                    }
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleSelect(p._id)}
                        aria-label={
                          selectedIds.has(p._id) ? `Deselect ${p.name}` : `Select ${p.name}`
                        }
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                          selectedIds.has(p._id)
                            ? "border-primary bg-primary"
                            : "border-border bg-transparent hover:border-primary/50"
                        }`}
                      >
                        {selectedIds.has(p._id) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-on-accent" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-background-soft flex items-center justify-center">
                            <Package className="w-5 h-5 text-text-muted" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-medium text-text truncate block">{p.name}</span>
                          <span className="text-xs text-text-muted">{p.unit}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-left py-3 px-4 text-text-muted">
                      {p.category?.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-left font-heading font-semibold">
                      {formatNaira(p.price)}
                    </td>
                    <td className="text-left py-3 px-4">{p.stock}</td>
                    <td className="py-3 px-4 text-center">
                      {isProcessing(p._id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : (
                        <StatusPill status={String(p.isActive)} map={PRODUCT_STATUS_MAP} dot />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center overflow-visible">
                      <div className="flex justify-center gap-1.5">
                        {p.isActive ? (
                          <>
                            <button
                              onClick={() => toggleModal({ edit: p })}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-primary/10 text-text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <Dropdown
                              trigger={
                                <>
                                  <ArrowDownUp className="w-3 h-3" /> <span>Manage stock</span>
                                </>
                              }
                              color="table"
                              noBorder
                              direction="down"
                              menuClassName="sm:w-44"
                              portal
                            >
                              <button
                                onClick={() => setStockModal({ product: p, action: "add" })}
                                disabled={isProcessing(p._id)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-background transition-colors disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add Stock
                              </button>
                              <button
                                onClick={() =>
                                  setStockModal({
                                    product: p,
                                    action: "remove",
                                  })
                                }
                                disabled={isProcessing(p._id)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-background transition-colors disabled:opacity-50"
                              >
                                <Minus className="w-3.5 h-3.5 text-rose-500" /> Remove Stock
                              </button>
                              <button
                                onClick={() =>
                                  setStockModal({
                                    product: p,
                                    action: "adjust",
                                  })
                                }
                                disabled={isProcessing(p._id)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-background transition-colors disabled:opacity-50"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Adjust Stock
                              </button>
                              <button
                                onClick={() =>
                                  setStockModal({
                                    product: p,
                                    action: "damage",
                                  })
                                }
                                disabled={isProcessing(p._id)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-background transition-colors disabled:opacity-50"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> Record
                                Damage
                              </button>
                              <button
                                onClick={() =>
                                  setStockModal({
                                    product: p,
                                    action: "return",
                                  })
                                }
                                disabled={isProcessing(p._id)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-background transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-blue-500" /> Record Return
                              </button>
                            </Dropdown>
                            <button
                              onClick={() => handleSoftDelete(p)}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-100 text-text-muted hover:text-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Archive className="w-3 h-3" /> Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleArchive(p)}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-emerald-50  text-text-muted hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(p)}
                              disabled={isProcessing(p._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-background-soft hover:bg-rose-500 text-text-muted hover:text-rose-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!isPending && products.length > 0 ? (
          <AdminTablePagination
            page={page}
            total={meta.total}
            limit={meta.limit}
            onChange={setPage}
          />
        ) : null}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <ProductFormModal
          key={modal === "create" ? "create" : `edit-${modal.edit._id}`}
          mode={modal === "create" ? "create" : "edit"}
          product={modal === "create" ? null : modal.edit}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            invalidate();
          }}
        />
      )}

      {/* Stock Action Modal */}
      {stockModal && (
        <StockActionModal
          product={stockModal.product}
          action={stockModal.action}
          onClose={() => setStockModal(null)}
        />
      )}

      {categoryManagerOpen ? (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setCategoryManagerOpen(false)}
          onCategoryRemoved={(categoryId) => {
            if (categoryFilter === categoryId) {
              setCategoryFilter("all");
              setPage(1);
            }
          }}
        />
      ) : null}

      {/* Archive / Permanent Delete Confirmation */}
      <ConfirmModal
        adminStyle
        open={confirmTarget !== null}
        title={
          confirmTarget?.action === "archive" || confirmTarget?.action === "bulk-archive"
            ? confirmTarget?.ids
              ? `Archive ${confirmTarget.ids.length} product${confirmTarget.ids.length > 1 ? "s" : ""}?`
              : "Archive product?"
            : confirmTarget?.action === "restore" || confirmTarget?.action === "bulk-restore"
              ? confirmTarget?.ids
                ? `Restore ${confirmTarget.ids.length} product${confirmTarget.ids.length > 1 ? "s" : ""}?`
                : "Restore product?"
              : confirmTarget?.action === "delete"
                ? "Permanently delete product?"
                : `Delete ${confirmTarget?.ids?.length} product${confirmTarget?.ids?.length > 1 ? "s" : ""}?`
        }
        description={
          confirmTarget?.ids ? (
            confirmTarget.action === "bulk-archive" ? (
              <>
                Archive {confirmTarget.ids.length} product
                {confirmTarget.ids.length > 1 ? "s" : ""}? They will be removed from the store.
              </>
            ) : confirmTarget.action === "bulk-restore" ? (
              <>
                Restore {confirmTarget.ids.length} product
                {confirmTarget.ids.length > 1 ? "s" : ""}? They will be back in the store.
              </>
            ) : (
              <>
                This will permanently remove {confirmTarget.ids.length} products and their images.
                This action cannot be undone.
              </>
            )
          ) : confirmTarget?.action === "archive" ? (
            `Archive "${confirmTarget?.product?.name}"? It will be removed from the store.`
          ) : confirmTarget?.action === "restore" ? (
            `Restore "${confirmTarget?.product?.name}"? It will be back in the store.`
          ) : (
            `This will permanently remove "${confirmTarget?.product?.name}" and its images. This action cannot be undone.`
          )
        }
        confirmLabel={
          confirmTarget?.action === "archive"
            ? "Archive"
            : confirmTarget?.action === "bulk-archive"
              ? `Archive ${confirmTarget.ids.length}`
              : confirmTarget?.action === "bulk-restore"
                ? `Restore ${confirmTarget.ids.length}`
                : confirmTarget?.action === "restore"
                  ? "Restore"
                  : confirmTarget?.action === "bulk-delete"
                    ? `Delete ${confirmTarget.ids.length}`
                    : "Delete forever"
        }
        variant={
          confirmTarget?.action === "archive" || confirmTarget?.action === "bulk-archive"
            ? "archive"
            : confirmTarget?.action === "restore" || confirmTarget?.action === "bulk-restore"
              ? "success"
              : "destructive"
        }
        onConfirm={() => {
          if (confirmTarget?.action === "archive") {
            softDeleteMutation.mutate(confirmTarget.product._id);
          } else if (confirmTarget?.action === "delete") {
            permanentDeleteMutation.mutate(confirmTarget.product._id);
          } else if (confirmTarget?.action === "bulk-archive") {
            bulkArchiveMutation.mutate(confirmTarget.ids);
          } else if (confirmTarget?.action === "bulk-restore") {
            bulkRestoreMutation.mutate(confirmTarget.ids);
          } else if (confirmTarget?.action === "bulk-delete") {
            bulkDeleteMutation.mutate(confirmTarget.ids);
          }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default AdminProductsPage;
