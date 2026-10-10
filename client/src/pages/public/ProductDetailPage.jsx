import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { addLocal } from "../../slices/cartSlice";
import { toggleWishlist } from "../../slices/wishlistSlice";
import { formatNaira } from "../../utils/formatMoney";
import { Heart, ShoppingBag, Truck, Clock, ShieldCheck, ArrowLeft, Star } from "lucide-react";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState(1);

  const {
    data: product,
    isPending,
    error,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await api.get(`/products/${slug}`);
      return res.data.data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?._id],
    queryFn: async () => {
      const res = await api.get(`/reviews/${product._id}`);
      return res.data.data;
    },
    enabled: !!product?._id,
  });

  const inWishlist = useAppSelector((s) =>
    s.wishlist.items.some((i) =>
      typeof i === "string" ? i === product?._id : i._id === product?._id,
    ),
  );

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-surface rounded-xl border border-border" />
          <div className="space-y-4">
            <div className="h-8 bg-surface rounded w-3/4" />
            <div className="h-6 bg-surface rounded w-1/4" />
            <div className="h-24 bg-surface rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-heading text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-text-muted mb-6">
          The dish you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/shop" className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg">
          Back to Menu
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    dispatch(
      addLocal({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        unit: product.unit,
        quantity,
      }),
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/shop"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Menu
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-surface rounded-2xl border border-border overflow-hidden flex items-center justify-center relative">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl">🍲</span>
            )}
            {product.productType === "cooked" && (
              <span className="absolute top-4 left-4 bg-primary text-white text-xs px-3 py-1.5 rounded-full font-medium">
                Freshly Cooked
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                {product.category?.name || "Authentic Dish"}
              </span>
              <button
                onClick={() => dispatch(toggleWishlist(product))}
                className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Heart
                  className={`w-5 h-5 ${inWishlist ? "fill-primary text-primary" : "text-text"}`}
                />
              </button>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mt-1 text-text">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold ml-1 text-text">
                  {product.averageRating ? product.averageRating.toFixed(1) : "New"}
                </span>
              </div>
              <span className="text-text-muted text-sm">•</span>
              <span className="text-sm text-text-muted">{reviews?.length || 0} reviews</span>
            </div>
          </div>

          <div className="border-t border-b border-border py-4">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-3xl font-bold text-text">
                {formatNaira(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-text-muted line-through text-lg">
                  {formatNaira(product.compareAtPrice)}
                </span>
              )}
              <span className="text-sm text-text-muted">/ {product.unit}</span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Availability:{" "}
              {product.stock > 0 ? (
                <span className="text-emerald-600 font-medium">In Stock</span>
              ) : (
                <span className="text-rose-600 font-medium">Out of Stock</span>
              )}
            </p>
          </div>

          <p className="text-text leading-relaxed">{product.description}</p>

          {/* Action Area */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-lg bg-surface">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-text-muted hover:text-text"
                >
                  -
                </button>
                <span className="px-3 font-medium text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-text-muted hover:text-text"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 py-3 px-6 bg-primary text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/95 disabled:bg-surface disabled:text-text-muted disabled:border disabled:border-border transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {product.stock > 0 ? "Add to Order" : "Sold Out"}
              </button>
            </div>
          </div>

          {/* Logistics Trust Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Lead Time</h4>
                <p className="text-xs text-text-muted">
                  {product.prepLeadTime
                    ? `Prepped in ~${product.prepLeadTime} hours`
                    : "Instant dispatch available"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Truck className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Delivery & Pickup</h4>
                <p className="text-xs text-text-muted">
                  Direct fleet same-day delivery or free pickup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProductDetailPage };
