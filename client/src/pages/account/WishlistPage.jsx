import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { toggleWishlist } from "../../slices/wishlistSlice";
import { Breadcrumb } from "../../components/shared/Navigation";
import { Heart, ShoppingBag, Trash2, Package, Star } from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const WishlistPage = () => {
  const dispatch = useAppDispatch();
  const { items: wishlist } = useAppSelector((s) => s.wishlist);

  const handleRemove = (product) => {
    dispatch(toggleWishlist(product));
  };

  const handleAddToCart = (product) => {
    // Navigate to product page so user can add to cart
    window.location.href = `/product/${product.slug}`;
  };

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Top bar */}
      <div className="bg-surface border-b border-border-soft">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb crumbs={[{ label: "Account", to: "/account" }, { label: "Wishlist" }]} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-text">Wish List</h1>
          <p className="text-text-muted mt-1 text-sm">
            {wishlist.length} item{wishlist.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-border-soft p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background-soft flex items-center justify-center">
              <Heart className="w-10 h-10 text-text-muted opacity-30" />
            </div>
            <h2 className="font-heading text-xl font-bold text-text mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
              Save items you love for later. Tap the heart icon on any product to add it here.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/95 transition-colors shadow-lg shadow-primary/20"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {wishlist.map((product) => (
              <div
                key={product._id}
                className="bg-surface rounded-2xl border border-border-soft p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Product image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-background-soft overflow-hidden shrink-0">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-primary/20" />
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs text-text-muted font-medium uppercase tracking-wider mb-1">
                      {product.category?.name || product.category || "General"}
                    </div>
                    <h3 className="font-heading font-bold text-text text-base truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-heading font-bold text-text">
                        {formatNaira(product.price)}
                      </span>
                      {product.unit && (
                        <span className="text-xs text-text-muted">/ {product.unit}</span>
                      )}
                      {product.averageRating > 0 && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {product.averageRating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions - separate row on mobile to prevent overlap */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-soft">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(product)}
                    className="px-4 py-2.5 bg-background-soft text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Clear all */}
            {wishlist.length > 0 && (
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => wishlist.forEach((p) => dispatch(toggleWishlist(p)))}
                  className="text-xs font-bold text-text-muted uppercase tracking-widest hover:text-red-500 transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
