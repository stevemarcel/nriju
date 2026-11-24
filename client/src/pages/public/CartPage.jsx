import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { changeQuantity, deleteItem, getCartItemProductId } from "../../slices/cartSlice";
import ProductCard from "../../components/ui/ProductCard";
import api from "../../services/api";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import {
  calculateDeliveryFeeKobo,
  configuredDeliveryFee,
  DEFAULT_DELIVERY_FEE_STEP_KOBO,
  DEFAULT_DELIVERY_FEES_KOBO,
} from "../../utils/deliveryFee";
import { formatNaira } from "../../utils/formatMoney";

const productFromItem = (item) =>
  item.product && typeof item.product === "object" ? item.product : null;

const categoryNameFrom = (product) =>
  product?.category && typeof product.category === "object" ? product.category.name : "";

const CartLineItem = ({ item, onDecrease, onIncrease, onRemove }) => {
  const product = productFromItem(item);
  const categoryName = categoryNameFrom(product);
  const productMeta = [categoryName, item.unit].filter(Boolean).join(" / ");
  const available = item.maxAvailable > 0 ? item.maxAvailable : product?.stock;
  const hasKnownStock = Number.isFinite(Number(available));
  const isSoldOut = hasKnownStock && Number(available) <= 0;
  const isLowStock = hasKnownStock && Number(available) > 0 && Number(available) <= 10;
  const canIncrease = !hasKnownStock || item.quantity < Number(available);
  const productPath = product?.slug ? `/product/${product.slug}` : null;

  return (
    <article className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-card border border-border-soft bg-background p-3 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:p-4 lg:p-5">
      <div className="aspect-square overflow-hidden rounded-xl bg-background-soft">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            width="128"
            height="128"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <ImageIcon className="h-7 w-7" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        {productPath ? (
          <Link
            to={productPath}
            className="inline-block max-w-full rounded font-heading text-base font-bold leading-tight text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-lg"
          >
            <span className="line-clamp-2">{item.name}</span>
          </Link>
        ) : (
          <h2 className="font-heading text-base font-bold leading-tight text-text sm:text-lg">
            {item.name}
          </h2>
        )}

        {productMeta ? (
          <p className="mt-1 text-xs text-text-secondary sm:text-sm">{productMeta}</p>
        ) : null}

        <p className="mt-2 text-sm font-bold text-primary sm:hidden">{formatNaira(item.price)}</p>

        <div
          className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${
            isSoldOut ? "text-destructive" : isLowStock ? "text-primary" : "text-success"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {isSoldOut
              ? "Currently unavailable"
              : isLowStock
                ? `Only ${available} left`
                : "In stock"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex h-9 items-center rounded-chip border border-border bg-background-soft">
            <button
              type="button"
              onClick={onDecrease}
              disabled={item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-l-full text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary active:bg-accent-soft focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span
              className="min-w-8 text-center text-sm font-semibold tabular-nums text-text"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={onIncrease}
              disabled={!canIncrease || isSoldOut}
              aria-label={`Increase quantity of ${item.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-r-full text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary active:bg-accent-soft focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.name} from cart`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-button px-2 text-xs font-semibold text-destructive transition-colors hover:bg-error-soft active:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between border-t border-border-soft pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-between sm:border-0 sm:pt-0">
        <span className="text-xs text-text-muted sm:text-sm">Item total</span>
        <span className="font-heading text-base font-bold tabular-nums text-text sm:text-lg">
          {formatNaira(item.price * item.quantity)}
        </span>
      </div>
    </article>
  );
};

const CartPage = () => {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { data: publicSettings = {} } = usePublicSettings();

  const { data: recommendationPool = [] } = useQuery({
    queryKey: ["products", "cart-recommendations"],
    queryFn: async () => {
      const response = await api.get("/products", {
        params: { sort: "popular", limit: 12 },
      });
      return response.data.data;
    },
    enabled: items.length > 0,
  });

  const cartProductIds = new Set(items.map(getCartItemProductId));
  const recommendations = recommendationPool
    .filter((product) => !cartProductIds.has(product._id) && product.stock > 0)
    .slice(0, 4);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const estimatedDeliveryFee = calculateDeliveryFeeKobo({
    subtotalKobo: subtotal,
    baseFeeKobo: configuredDeliveryFee(
      publicSettings.delivery_fee_thirdparty,
      DEFAULT_DELIVERY_FEES_KOBO.thirdparty,
    ),
    feeStepKobo: configuredDeliveryFee(
      publicSettings.delivery_fee_increment_per_5000,
      DEFAULT_DELIVERY_FEE_STEP_KOBO,
    ),
    deliveryMethod: "thirdparty",
  });
  const estimatedTotal = subtotal + estimatedDeliveryFee;

  if (items.length === 0) {
    return (
      <main className="bg-background-soft px-3 py-10 sm:px-4 sm:py-16">
        <div className="mx-auto flex min-h-112 w-full max-w-2xl flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border-soft bg-background text-primary shadow-soft">
            <ShoppingBag className="h-9 w-9" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-heading text-3xl font-bold text-text sm:text-4xl">
            Your cart is empty
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary sm:text-base">
            Browse the shop and add a few favourites when you are ready.
          </p>
          <Link
            to="/shop"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-6 font-semibold text-on-accent transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
          >
            Browse the shop
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background-soft px-3 py-7 sm:px-4 sm:py-10 lg:py-14">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-7 sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Nriju shop
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold leading-none tracking-tight text-text sm:text-5xl">
            Your cart
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            {itemCount} item{itemCount === 1 ? "" : "s"} ready for checkout
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.85fr)] lg:items-start xl:gap-12">
          <section aria-label="Cart items">
            <ul className="space-y-3 sm:space-y-4">
              {items.map((item) => {
                const productId = getCartItemProductId(item);
                return (
                  <li key={productId}>
                    <CartLineItem
                      item={item}
                      onDecrease={() => dispatch(changeQuantity(productId, item.quantity - 1))}
                      onIncrease={() => dispatch(changeQuantity(productId, item.quantity + 1))}
                      onRemove={() => dispatch(deleteItem(productId))}
                    />
                  </li>
                );
              })}
            </ul>

            <Link
              to="/shop"
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-button px-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Continue shopping
            </Link>
          </section>

          <aside
            aria-labelledby="order-summary-title"
            className="rounded-card border border-border-soft bg-surface p-5 shadow-soft sm:p-6 lg:sticky lg:top-24"
          >
            <h2
              id="order-summary-title"
              className="font-heading text-xl font-bold text-text sm:text-2xl"
            >
              Order summary
            </h2>

            <dl className="mt-5 space-y-3 border-t border-border-soft pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-secondary">
                  Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})
                </dt>
                <dd className="font-semibold tabular-nums text-text">{formatNaira(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-secondary">Delivery estimate</dt>
                <dd className="text-right font-medium text-text">
                  {estimatedDeliveryFee === 0 ? "Free" : formatNaira(estimatedDeliveryFee)}
                </dd>
              </div>
            </dl>

            <p className="mt-5 rounded-xl bg-background px-3 py-2.5 text-xs leading-5 text-text-secondary">
              {estimatedDeliveryFee === 0
                ? "Orders below ₦5,000 qualify for free delivery."
                : "Estimate uses third-party delivery. You can switch method and apply a promo code at checkout."}
            </p>

            <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-border-soft pt-5">
              <span className="font-heading text-lg font-bold text-text">Estimated total</span>
              <span className="font-heading text-2xl font-bold tabular-nums text-text">
                {formatNaira(estimatedTotal)}
              </span>
            </div>

            <Link
              to="/checkout"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-accent transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
            >
              Proceed to checkout
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <ul className="mt-6 space-y-3 border-t border-border-soft pt-5 text-xs leading-5 text-text-secondary">
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Secure, encrypted payment at checkout
              </li>
              <li className="flex items-start gap-2.5">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Delivery and pickup options confirmed before payment
              </li>
            </ul>
          </aside>
        </div>

        {recommendations.length > 0 ? (
          <section
            aria-labelledby="cart-recommendations-title"
            className="mt-12 border-t border-border-soft pt-9 sm:mt-16 sm:pt-12"
          >
            <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  A little extra
                </p>
                <h2
                  id="cart-recommendations-title"
                  className="mt-1 font-heading text-2xl font-bold text-text sm:text-3xl"
                >
                  Add to your order
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-button px-2 text-xs font-semibold text-primary transition-colors hover:bg-accent-soft active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-sm"
              >
                View all
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
              {recommendations.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default CartPage;
