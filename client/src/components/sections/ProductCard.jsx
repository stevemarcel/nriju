import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { addLocal, removeLocal } from "../../slices/cartSlice";
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

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(
      addLocal({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        unit: product.unit,
        quantity: 1,
      }),
    );
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    dispatch(toggleWishlist(product));
  };

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative rounded-lg overflow-hidden bg-surface border border-border">
        {/* Image */}
        <div className="aspect-square bg-background flex items-center justify-center">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="text-4xl text-text-muted">🍽️</div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="bg-secondary text-white text-xs px-2 py-1 rounded font-medium">
              Sale
            </span>
          )}
          {product.productType === "cooked" && (
            <span className="bg-primary text-white text-xs px-2 py-1 rounded font-medium">
              Fresh
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface/90 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              inWishlist ? "fill-primary text-primary" : "text-text"
            }`}
          />
        </button>

        {/* Stock status */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="font-heading font-bold text-text">{price}</span>
          <span className="text-xs text-text-muted">{product.unit}</span>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            inCart
              ? "bg-primary text-white"
              : product.stock > 0
                ? "bg-background hover:bg-primary hover:text-white text-text"
                : "bg-background text-text-muted cursor-not-allowed"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {inCart ? "Added" : product.stock > 0 ? "Add to Cart" : "Sold Out"}
        </button>
      </div>
    </Link>
  );
};

export { ProductCard };
