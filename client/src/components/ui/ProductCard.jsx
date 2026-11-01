import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { addItem, changeQuantity, deleteItem } from "../../slices/cartSlice";
import { toggleWishlist } from "../../slices/wishlistSlice";
import { Heart, ShoppingBag, Minus, Plus } from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const ProductCard = ({ product }) => {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.cart);
  const inWishlist = useAppSelector((s) =>
    s.wishlist.items.some((i) =>
      typeof i === "string" ? i === product._id : i._id === product._id,
    ),
  );

  const cartItem = items.find((i) => i.product === product._id);
  const qty = cartItem?.quantity ?? 0;
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
  const lowStock = !soldOut && product.stock <= 10;
  const imageCount = product.images?.length || 0;
  const tag = product.tags?.[0];
  const stockPillClass = soldOut
    ? "bg-text-muted/20 text-text-muted"
    : lowStock
      ? "bg-primary/15 text-primary"
      : "bg-green-100 text-green-700";
  const stockPillText = soldOut ? "Sold Out" : `${product.stock} left`;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block h-full rounded-card bg-surface border border-border shadow-soft p-3 transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-background">
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
          <div className="absolute inset-0 bg-primary/85 flex flex-col items-center justify-center gap-1">
            <span className="text-on-accent font-semibold">Sold Out</span>
            <span className="text-on-accent/90 text-xs">Will be back in stock soon</span>
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

        <p className="mt-1.5 text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-9">
          {product.description || ""}
        </p>

        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap min-h-6">
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
            className={`mt-3 w-full py-2.5 rounded-button text-sm font-semibold transition-opacity flex items-center justify-center gap-1.5 ${
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
