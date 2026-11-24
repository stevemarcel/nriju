import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  ImageIcon,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import api from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { addItem } from "../../slices/cartSlice";
import { toggleWishlist } from "../../slices/wishlistSlice";
import { formatNaira } from "../../utils/formatMoney";
import ProductDetailSkeleton from "../../components/product/ProductDetailSkeleton";
import ProductGallery from "../../components/product/ProductGallery";
import ProductInformationTabs from "../../components/product/ProductInformationTabs";
import ProductCard from "../../components/ui/ProductCard";
import StarRating from "../../components/ui/StarRating";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [buyingNow, setBuyingNow] = useState(false);
  const detailsRef = useRef(null);

  const {
    data: product,
    isPending,
    error,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const response = await api.get(`/products/${slug}`);
      return response.data.data;
    },
  });

  const { data: reviews = [], isPending: reviewsPending } = useQuery({
    queryKey: ["reviews", product?._id],
    queryFn: async () => {
      const response = await api.get(`/reviews/${product._id}`);
      return response.data.data;
    },
    enabled: Boolean(product?._id),
  });

  const categorySlug = product?.category?.slug;
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", categorySlug, product?._id],
    queryFn: async () => {
      const response = await api.get("/products", {
        params: { category: categorySlug, sort: "popular", limit: 8 },
      });
      return response.data.data.filter((item) => item._id !== product._id).slice(0, 5);
    },
    enabled: Boolean(categorySlug && product?._id),
  });

  const inWishlist = useAppSelector((state) =>
    state.wishlist.items.some((item) =>
      typeof item === "string" ? item === product?._id : item._id === product?._id,
    ),
  );

  useEffect(() => {
    setQuantity(1);
    setActiveTab("description");
  }, [slug]);

  if (isPending) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-20 text-center">
        <ImageIcon className="mx-auto h-10 w-10 text-text-muted" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-2xl font-bold text-text">Product not found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          This product may have been removed or is no longer available.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </button>
      </main>
    );
  }

  const categoryId = product.category?._id || product.category;
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 10;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const cartItem = {
    product,
    productId: product._id,
    categoryId,
    quantity,
  };

  const addProductToCart = async ({ checkout = false } = {}) => {
    if (soldOut) return;
    if (checkout) setBuyingNow(true);

    try {
      const result = await dispatch(addItem(cartItem));
      if (result?.meta?.requestStatus === "rejected") {
        throw new Error(result.error?.message || "Could not update your cart.");
      }

      if (checkout) navigate("/checkout");
      else toast.success(`${product.name} added to cart.`);
    } catch (requestError) {
      toast.error(requestError?.message || "Could not update your cart. Try again.");
    } finally {
      if (checkout) setBuyingNow(false);
    }
  };

  const openReviews = () => {
    setActiveTab("reviews");
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <main className="bg-background">
      <div className="mx-auto w-full max-w-screen-2xl px-3 py-6 sm:px-4 sm:py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back
        </button>

        <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <ProductGallery key={product._id} product={product} />
          </div>

          <section className="min-w-0 xl:col-span-5 xl:py-3" aria-labelledby="product-title">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {categorySlug ? (
                  <Link
                    to={`/shop?category=${categorySlug}`}
                    className="text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:text-primary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {product.category?.name}
                  </Link>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Nriju product
                  </span>
                )}
                <h1
                  id="product-title"
                  className="mt-2 max-w-xl text-balance font-heading text-3xl font-bold leading-tight text-text sm:text-4xl xl:text-5xl"
                >
                  {product.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => dispatch(toggleWishlist(product))}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={inWishlist}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary hover:text-primary active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Heart
                  className={`h-5 w-5 ${inWishlist ? "fill-primary text-primary" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <button
              type="button"
              onClick={openReviews}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-button text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Read ${reviews.length} customer reviews`}
            >
              <StarRating
                rating={product.averageRating}
                reviewCount={reviews.length}
                size="md"
                showValue
              />
              <span className="text-sm text-text-secondary">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </span>
            </button>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-border py-5">
              <span className="font-heading text-3xl font-bold text-primary">
                {formatNaira(product.price)}
              </span>
              {discount ? (
                <>
                  <del className="rounded-chip bg-text-muted/15 px-3 py-1.5 text-sm font-semibold text-text-muted">
                    {formatNaira(product.compareAtPrice)}
                  </del>
                  <span className="rounded-chip bg-secondary px-3 py-1.5 text-xs font-bold text-text">
                    Save {discount}%
                  </span>
                </>
              ) : null}
              <span className="text-sm text-text-secondary">per {product.unit}</span>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
              {product.description}
            </p>

            {product.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Product tags">
                {product.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-chip bg-accent-soft px-3 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-2 text-sm">
              {soldOut ? (
                <span className="font-semibold text-error">Out of stock</span>
              ) : (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-success">
                    {lowStock ? `Only ${product.stock} left` : "In stock"}
                  </span>
                </>
              )}
            </div>

            <div className="mt-6 rounded-card border border-border bg-surface p-3 sm:flex sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0">
              <div
                className="flex min-h-11 items-center justify-between rounded-button border border-border bg-background sm:h-12 sm:w-36 sm:bg-surface"
                aria-label="Quantity selector"
              >
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1 || soldOut}
                  aria-label="Decrease quantity"
                  className="flex h-full w-11 items-center justify-center rounded-button text-text-secondary transition-colors hover:bg-background-soft hover:text-primary active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
                  disabled={soldOut || quantity >= product.stock}
                  aria-label="Increase quantity"
                  className="flex h-full w-11 items-center justify-center rounded-button text-text-secondary transition-colors hover:bg-background-soft hover:text-primary active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:contents">
                <button
                  type="button"
                  onClick={() => addProductToCart()}
                  disabled={soldOut}
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-button bg-primary px-3 text-xs font-semibold text-on-accent transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-text-muted sm:h-12 sm:flex-1 sm:px-5 sm:text-sm"
                >
                  <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{soldOut ? "Sold out" : "Add to cart"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addProductToCart({ checkout: true })}
                  disabled={soldOut || buyingNow}
                  aria-busy={buyingNow}
                  className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-button bg-secondary px-3 text-xs font-bold text-text transition-colors hover:bg-secondary/85 active:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:flex-1 sm:px-5 sm:text-sm"
                >
                  <span className="truncate">
                    {buyingNow ? "Preparing checkout..." : "Buy now"}
                  </span>
                </button>
              </div>
            </div>

            <ul className="mt-7 grid overflow-hidden rounded-card border border-border bg-surface divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <li className="flex min-h-24 items-start gap-3 px-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text">Preparation</h2>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    {product.prepLeadTime
                      ? `Ready in about ${product.prepLeadTime} hours`
                      : "Ready for dispatch"}
                  </p>
                </div>
              </li>
              <li className="flex min-h-24 items-start gap-3 px-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text">Delivery</h2>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    Same-day delivery or pickup
                  </p>
                </div>
              </li>
              <li className="flex min-h-24 items-start gap-3 px-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text">Quality</h2>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    Carefully packed for freshness
                  </p>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <div ref={detailsRef} className="scroll-mt-24">
          <ProductInformationTabs
            product={product}
            reviews={reviews}
            reviewsPending={reviewsPending}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {relatedProducts.length ? (
          <section className="py-12 sm:py-16" aria-labelledby="related-products-title">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  More to explore
                </p>
                <h2
                  id="related-products-title"
                  className="mt-1 font-heading text-2xl font-bold text-text sm:text-3xl"
                >
                  Related products
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex min-h-11 items-center gap-1 rounded-button px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent-soft active:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                View all
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct._id} product={relatedProduct} />
              ))}
            </div>
          </section>
        ) : (
          <section className="py-12 text-center sm:py-16" aria-labelledby="explore-products-title">
            <PackageCheck className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h2 id="explore-products-title" className="mt-3 font-heading text-2xl font-bold">
              Explore more Nriju products
            </h2>
            <Link
              to="/shop"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-6 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Visit the shop
            </Link>
          </section>
        )}
      </div>
    </main>
  );
};

export default ProductDetailPage;
