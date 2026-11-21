import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  PackageSearch,
  Search,
  Star,
} from "lucide-react";
import ProductGridSkeleton from "../../components/shop/ProductGridSkeleton";
import ShopCategoryButton from "../../components/shop/ShopCategoryButton";
import ShopPagination from "../../components/shop/ShopPagination";
import Dropdown from "../../components/ui/Dropdown";
import ProductCard from "../../components/ui/ProductCard";
import api from "../../services/api";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", Icon: Clock3 },
  { value: "popular", label: "Best sellers", Icon: Flame },
  { value: "rating", label: "Top rated", Icon: Star },
  { value: "price_asc", label: "Price: low to high", Icon: ArrowDownUp },
  { value: "price_desc", label: "Price: high to low", Icon: ArrowDownUp },
];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sortOpen, setSortOpen] = useState(false);
  const recommendationsRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      return response.data.data;
    },
  });

  const {
    data: productsData,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["products", searchParams.toString(), debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams(searchParams);
      params.set("limit", String(PAGE_SIZE));
      if (debouncedSearch) params.set("search", debouncedSearch);
      else params.delete("search");

      const response = await api.get(`/products?${params.toString()}`);
      return response.data;
    },
  });

  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ["products", "shop-recommendations"],
    queryFn: async () => {
      const response = await api.get("/products", {
        params: { sort: "popular", limit: 12 },
      });
      return response.data.data;
    },
  });

  const products = productsData?.data ?? [];
  const meta = productsData?.meta;
  const currentCategory = searchParams.get("category") || "all";
  const currentSort = searchParams.get("sort") || "newest";
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageCount = Math.max(1, Math.ceil((meta?.total || 0) / (meta?.limit || PAGE_SIZE)));
  const activeSort = SORT_OPTIONS.find((option) => option.value === currentSort) || SORT_OPTIONS[0];
  const ActiveSortIcon = activeSort.Icon;
  const recommendations = recommendedProducts.slice(0, 8);

  const updateParams = (updates, { replace = false } = {}) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === "all") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });
    setSearchParams(nextParams, { replace });
  };

  const handleCategoryChange = (slug) => updateParams({ category: slug, page: 1 });

  const handleSortChange = (sort) => {
    updateParams({ sort, page: 1 });
    setSortOpen(false);
  };

  const handlePageChange = (page) => {
    updateParams({ page: Math.min(Math.max(page, 1), pageCount) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearch("");
    setSearchParams({});
  };

  const scrollRecommendations = (direction) => {
    const track = recommendationsRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <main className="bg-background px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-screen-2xl">
        <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Nriju shop</p>
            <h1 className="mt-2 max-w-3xl font-heading text-3xl font-bold leading-tight text-text sm:text-4xl">
              Nigerian favourites for every table
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Browse freshly prepared dishes, pantry staples, drinks, snacks, and everyday
              essentials.
            </p>
          </div>

          <form
            role="search"
            className="relative min-w-0"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ search: search.trim(), page: 1 });
            }}
          >
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (currentPage !== 1) updateParams({ page: 1 }, { replace: true });
              }}
              placeholder="Search products"
              aria-label="Search products"
              className="h-12 w-full min-w-0 rounded-input border border-border bg-surface pl-11 pr-4 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </form>
        </header>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label="Categories">
          <ShopCategoryButton
            compact
            selected={currentCategory === "all"}
            onSelect={() => handleCategoryChange("all")}
          />
          {categories.map((category) => (
            <ShopCategoryButton
              key={category._id}
              category={category}
              compact
              selected={currentCategory === category.slug}
              onSelect={() => handleCategoryChange(category.slug)}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)]">
          <aside
            className="hidden self-start lg:sticky lg:top-24 lg:block"
            aria-label="Shop filters"
          >
            <div className="border-b border-border pb-5">
              <h2 className="font-heading text-base font-bold text-text">Category</h2>
              <div className="mt-3 space-y-1">
                <ShopCategoryButton
                  selected={currentCategory === "all"}
                  onSelect={() => handleCategoryChange("all")}
                />
                {categories.map((category) => (
                  <ShopCategoryButton
                    key={category._id}
                    category={category}
                    selected={currentCategory === category.slug}
                    onSelect={() => handleCategoryChange(category.slug)}
                  />
                ))}
              </div>
            </div>

            <div className="pt-5">
              <h2 className="font-heading text-base font-bold text-text">Browse by</h2>
              <div className="mt-3 space-y-1">
                {SORT_OPTIONS.slice(0, 3).map(({ value, label, Icon }) => {
                  const selected = currentSort === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleSortChange(value)}
                      aria-pressed={selected}
                      className={`flex min-h-10 w-full items-center gap-3 rounded-button px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        selected
                          ? "bg-accent-soft font-semibold text-primary"
                          : "text-text-secondary hover:bg-surface hover:text-text"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="min-w-0" aria-labelledby="shop-results-heading">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="shop-results-heading" className="font-heading text-xl font-bold text-text">
                  Products
                </h2>
                <p className="mt-1 text-xs text-text-muted" aria-live="polite">
                  {isPending
                    ? "Loading products"
                    : `${products.length} of ${meta?.total || 0} products`}
                </p>
              </div>

              <Dropdown
                trigger={
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <ActiveSortIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{activeSort.label}</span>
                  </span>
                }
                color="surface"
                open={sortOpen}
                onOpenChange={setSortOpen}
                openOnHover={false}
                align="right"
                portal
                menuRole="menu"
                ariaLabel={`Sort products. Current selection: ${activeSort.label}`}
                triggerClassName="min-h-10 max-w-52"
                menuClassName="min-w-52"
              >
                {SORT_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={currentSort === value}
                    onClick={() => handleSortChange(value)}
                    className={`flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none ${
                      currentSort === value ? "font-semibold text-primary" : "text-text"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {currentSort === value ? (
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </Dropdown>
            </div>

            {isPending ? (
              <ProductGridSkeleton />
            ) : isError ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-card border border-border bg-surface px-6 text-center">
                <PackageSearch className="h-9 w-9 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-heading text-lg font-bold text-text">
                  Products could not be loaded
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                  Check your connection and refresh the page to try again.
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-card border border-border bg-surface px-6 text-center">
                <PackageSearch className="h-9 w-9 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-heading text-lg font-bold text-text">No products found</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                  Try another search term or clear the current filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 min-h-10 rounded-button bg-primary px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}

            {!isPending && !isError ? (
              <ShopPagination
                page={currentPage}
                pageCount={pageCount}
                onChange={handlePageChange}
              />
            ) : null}
          </section>
        </div>

        {recommendations.length > 0 ? (
          <section
            className="mt-16 border-t border-border pt-10 sm:mt-20"
            aria-labelledby="recommendations-title"
          >
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Popular now
                </p>
                <h2
                  id="recommendations-title"
                  className="mt-1 font-heading text-2xl font-bold text-text sm:text-3xl"
                >
                  Explore our recommendations
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRecommendations(-1)}
                  aria-label="Scroll recommendations left"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRecommendations(1)}
                  aria-label="Scroll recommendations right"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              ref={recommendationsRef}
              className="grid snap-x snap-mandatory grid-flow-col auto-cols-[48%] gap-3 overflow-x-auto pb-3 sm:auto-cols-[32%] sm:gap-4 lg:auto-cols-[24%]"
            >
              {recommendations.map((product) => (
                <div key={product._id} className="snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default ShopPage;
