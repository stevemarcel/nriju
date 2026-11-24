import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { addItem, changeQuantity, deleteItem, getCartItemProductId } from "../../slices/cartSlice";
import { toggleWishlist } from "../../slices/wishlistSlice";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageIcon,
  ShoppingBag,
  Minus,
  Plus,
  Star,
} from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const SWIPE_THRESHOLD = 32;
const MAX_VISIBLE_DOTS = 5;
const MAX_RATING = 5;

const ProductRating = ({ rating = 0, reviewCount = 0, className = "" }) => {
  const normalizedRating = Math.min(Math.max(Number(rating) || 0, 0), MAX_RATING);
  const filledStars = Math.round(normalizedRating);
  const reviewLabel = reviewCount === 1 ? "review" : "reviews";

  return (
    <div
      className={`items-center gap-1 ${className}`}
      role="img"
      aria-label={`${normalizedRating.toFixed(1)} out of ${MAX_RATING} stars from ${reviewCount} ${reviewLabel}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: MAX_RATING }, (_, index) => (
          <Star
            key={index}
            className={`h-3 w-3 ${
              index < filledStars ? "fill-secondary text-secondary" : "text-border"
            }`}
          />
        ))}
      </span>
      <span className="text-xs font-medium text-text-secondary" aria-hidden="true">
        ({reviewCount})
      </span>
    </div>
  );
};

const ProductCard = ({ product }) => {
  const dispatch = useAppDispatch();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartX = useRef(null);
  const { items } = useAppSelector((s) => s.cart);
  const inWishlist = useAppSelector((s) =>
    s.wishlist.items.some((i) =>
      typeof i === "string" ? i === product._id : i._id === product._id,
    ),
  );

  const cartItem = items.find((item) => getCartItemProductId(item) === product._id);
  const qty = cartItem?.quantity ?? 0;
  const price = formatNaira(product.price);
  const productImages = product.images ?? [];
  const imageCount = productImages.length;

  // Resolve the category id whether it came populated (object) or as a
  // bare ObjectId string — the coupon validator needs it to check
  // category-specific applicability.
  const categoryId =
    typeof product.category === "object" && product.category
      ? product.category._id
      : product.category;

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(
      addItem({
        product,
        productId: product._id,
        categoryId,
        quantity: 1,
      }),
    );
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty === 1) {
      dispatch(deleteItem(product._id));
    } else {
      dispatch(changeQuantity(product._id, qty - 1));
    }
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(
      addItem({
        product,
        productId: product._id,
        categoryId,
        quantity: 1,
      }),
    );
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    dispatch(toggleWishlist(product));
  };

  const showImage = (index) => {
    setActiveImageIndex((index + imageCount) % imageCount);
  };

  const handleImageControl = (event, index) => {
    event.preventDefault();
    event.stopPropagation();
    showImage(index);
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null || imageCount < 2) return;

    const swipeDistance = touchStartX.current - event.changedTouches[0].clientX;
    touchStartX.current = null;

    if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) return;

    event.preventDefault();
    event.stopPropagation();
    showImage(activeImageIndex + (swipeDistance > 0 ? 1 : -1));
  };

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= 10;
  const tag = product.tags?.[0];
  const visibleDotCount = Math.min(imageCount, MAX_VISIBLE_DOTS);
  const firstVisibleDot = Math.min(
    Math.max(activeImageIndex - Math.floor(visibleDotCount / 2), 0),
    Math.max(imageCount - visibleDotCount, 0),
  );
  const visibleImageIndexes = Array.from(
    { length: visibleDotCount },
    (_, index) => firstVisibleDot + index,
  );
  const stockPillClass = soldOut
    ? "bg-text-muted/20 text-text-muted"
    : lowStock
      ? "bg-primary/15 text-primary"
      : "bg-success-soft text-success";
  const stockPillText = soldOut ? "Sold Out" : `${product.stock} left`;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block h-full rounded-card bg-surface border border-border shadow-soft p-3 transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div
        className="relative aspect-square touch-pan-y overflow-hidden rounded-xl bg-background"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {imageCount > 0 ? (
          <img
            key={`${product._id}-${activeImageIndex}`}
            src={productImages[activeImageIndex]}
            alt={product.name}
            className="animate-product-image-enter h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
          </div>
        )}

        {/* Discount pill */}
        {discount && (
          <span className="absolute left-2 top-2 z-20 rounded-chip bg-secondary px-2 py-1 text-xs font-semibold text-text">
            {discount}% off
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleToggleWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 transition-transform hover:scale-110"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              inWishlist ? "fill-primary text-primary" : "text-text-secondary"
            }`}
          />
        </button>

        {imageCount > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => handleImageControl(event, activeImageIndex - 1)}
              aria-label={`Show previous image of ${product.name}`}
              className="absolute left-1 top-1/2 z-20 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface/85 text-primary shadow-soft transition-colors hover:bg-surface active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:flex"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => handleImageControl(event, activeImageIndex + 1)}
              aria-label={`Show next image of ${product.name}`}
              className="absolute right-1 top-1/2 z-20 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface/85 text-primary shadow-soft transition-colors hover:bg-surface active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:flex"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}

        {imageCount > 1 && (
          <div className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-chip bg-text/35 px-1 backdrop-blur-sm">
            {visibleImageIndexes.map((imageIndex) => (
              <button
                key={imageIndex}
                type="button"
                onClick={(event) => handleImageControl(event, imageIndex)}
                aria-label={`Show image ${imageIndex + 1} of ${imageCount}`}
                aria-current={activeImageIndex === imageIndex ? "true" : undefined}
                className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeImageIndex === imageIndex ? "bg-on-accent" : "bg-on-accent/50"
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-primary/85">
            <span className="text-on-accent font-semibold">Sold Out</span>
            <span className="text-on-accent/90 text-xs">Will be back in stock soon</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-1 pt-3 pb-1">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
          <h3 className="font-heading text-sm font-bold leading-snug transition-colors line-clamp-1 group-hover:text-primary sm:text-base">
            {product.name}
          </h3>
          <ProductRating
            rating={product.averageRating}
            reviewCount={product.reviewCount}
            className="flex sm:hidden"
          />
          <div className="flex shrink-0 flex-row items-center gap-2">
            {discount ? (
              <del className="rounded-chip bg-text-muted/15 px-2.5 py-1 text-xs font-medium text-text-muted">
                {formatNaira(product.compareAtPrice)}
              </del>
            ) : null}
            <span className="rounded-chip bg-accent-soft px-2.5 py-1 text-xs font-semibold text-primary sm:bg-primary sm:px-3 sm:text-sm sm:text-on-accent">
              {price}
            </span>
          </div>
        </div>

        <p className="mt-1.5 hidden min-h-9 text-xs leading-relaxed text-text-secondary sm:line-clamp-2">
          {product.description || ""}
        </p>

        <ProductRating
          rating={product.averageRating}
          reviewCount={product.reviewCount}
          className="mt-2 hidden sm:flex"
        />

        <div className="mt-2.5 hidden min-h-6 flex-wrap items-center gap-1.5 sm:flex">
          {tag ? (
            <span className="chip bg-accent-soft text-primary capitalize">{tag}</span>
          ) : (
            <span className="chip invisible bg-accent-soft text-primary capitalize">&nbsp;</span>
          )}
          <span className={`chip ${stockPillClass}`}>{stockPillText}</span>
        </div>

        {/* In-cart stepper: [-] [qty] [+] */}
        {cartItem ? (
          <div className="mt-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-8 h-8 flex items-center justify-center rounded-button bg-background border border-border text-text hover:bg-background/80 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-text">{qty}</span>
            <button
              type="button"
              onClick={handleIncrement}
              className="w-8 h-8 flex items-center justify-center rounded-button bg-primary text-on-accent hover:opacity-90 transition-opacity"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={soldOut}
            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-button py-2.5 text-xs font-semibold transition-opacity sm:text-sm ${
              soldOut
                ? "bg-text-muted/20 text-text-muted cursor-not-allowed"
                : "bg-primary text-on-accent hover:opacity-90"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Add to Cart
          </button>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
