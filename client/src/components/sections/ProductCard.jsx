import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { addItem } from "../../slices/cartSlice";
import { toggleWishlist } from "../../slices/wishlistSlice";
import { Heart, ShoppingBag } from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const ProductCard = ({ product }) => {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.cart);
  const inWishlist = useAppSelector((s) =>
    s.wishlist.items.some((i) =>
      typeof i === "string" ? i === product._id : i._id === product._id,
    ),
  );

  const inCart = items.some((i) => i.product === product._id);
  const price = formatNaira(product.price);

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
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        unit: product.unit,
        categoryId,
        quantity: 1,
      }),
    );
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    dispatch(toggleWishlist(product));
  };

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const soldOut = product.stock === 0;
  const imageCount = product.images?.length || 0;
  const tag = product.tags?.[0];

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block h-full rounded-card bg-surface border border-border shadow-soft p-3 transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square rounded-[12px] overflow-hidden bg-background">
        {imageCount > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-text-muted">
            🍽️
          </div>
        )}

        {/* Discount pill */}
        {discount && (
          <span className="absolute top-2 left-2 bg-secondary text-text text-xs font-semibold px-2 py-1 rounded-chip">
            {discount}% off
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleToggleWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface/90 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              inWishlist ? "fill-primary text-primary" : "text-text-secondary"
            }`}
          />
        </button>

        {/* Image count dots */}
        {imageCount > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: Math.min(imageCount, 3) }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 bg-primary/85 flex items-center justify-center">
            <span className="text-on-accent font-semibold">Sold Out</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-1 pt-3 pb-1">
        {/* Name + price pill */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-bold text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <span className="shrink-0 bg-primary text-on-accent text-sm font-semibold px-3 py-1 rounded-chip">
            {price}
          </span>
        </div>

        {/* Description */}
        {product.description && (
          <p className="mt-1.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Chips */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {tag && <span className="chip bg-background text-text-secondary capitalize">{tag}</span>}
          {!soldOut && (
            <span className="chip bg-background text-text-secondary">{product.stock} left</span>
          )}
        </div>

        {/* Add to cart — red primary, white text, radius 8, hover opacity 0.9 */}
        <button
          onClick={handleAddToCart}
          disabled={soldOut}
          className={`mt-3 w-full py-2.5 rounded-button text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5 ${
            soldOut
              ? "bg-text-muted/20 text-text-muted cursor-not-allowed"
              : "bg-primary text-on-accent hover:opacity-90"
          }`}
        >
          {!soldOut && <ShoppingBag className="w-4 h-4" />}
          {soldOut ? "Sold Out" : inCart ? "Added to Cart" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
