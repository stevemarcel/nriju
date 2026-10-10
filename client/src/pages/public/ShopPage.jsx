import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import ProductCard from "../../components/sections/ProductCard";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data.data;
    },
  });

  const { data: productsData, isPending } = useQuery({
    queryKey: ["products", searchParams.toString(), debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams(searchParams);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await api.get(`/products?${params.toString()}`);
      return res.data;
    },
  });

  const currentCategory = searchParams.get("category") || "all";
  const currentSort = searchParams.get("sort") || "newest";

  const handleCategoryChange = (slug) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", slug);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleSortChange = (sort) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", sort);
    setSearchParams(newParams);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold">Nriju Menu</h1>
          <p className="text-text-muted text-sm">
            Explore our collection of authentic Nigerian dishes
          </p>
        </div>

        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search for egusi, amala, suya..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters (Desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-8">
          <div>
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Categories
            </h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleCategoryChange("all")}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentCategory === "all"
                    ? "bg-primary text-white font-medium"
                    : "hover:bg-surface text-text"
                }`}
              >
                All Items
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentCategory === cat.slug
                      ? "bg-primary text-white font-medium"
                      : "hover:bg-surface text-text"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Filter & Sort bar */}
          <div className="lg:hidden flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm border transition-colors ${
                currentCategory === "all"
                  ? "bg-primary text-white border-primary"
                  : "bg-surface border-border"
              }`}
            >
              All Items
            </button>
            {categories?.map((cat) => (
              <button
                key={cat._id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm border transition-colors ${
                  currentCategory === cat.slug
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-text-muted">
              Showing {productsData?.data?.length || 0} of {productsData?.meta?.total || 0} products
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted hidden sm:block">Sort by:</span>
              <select
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {isPending ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-surface rounded-lg border border-border" />
              ))}
            </div>
          ) : productsData?.data?.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-xl border border-dashed border-border">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="font-heading text-lg font-semibold">No products found</h3>
              <p className="text-text-muted text-sm mt-1">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearch("");
                  setSearchParams({});
                }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {productsData?.data?.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {productsData?.meta?.total > productsData?.meta?.limit && (
            <div className="mt-12 flex justify-center gap-2">
              {[...Array(Math.ceil(productsData.meta.total / productsData.meta.limit))].map(
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set("page", (i + 1).toString());
                      setSearchParams(newParams);
                    }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      (Number(searchParams.get("page")) || 1) === i + 1
                        ? "bg-primary text-white"
                        : "bg-surface border border-border text-text hover:border-primary"
                    }`}
                  >
                    {i + 1}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { ShopPage };
