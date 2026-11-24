import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { changeQuantity, deleteItem, getCartItemProductId } from "../../slices/cartSlice";
import { formatNaira } from "../../utils/formatMoney";
import { ShoppingBag, ArrowRight, Minus, Plus, X } from "lucide-react";

const CartPage = () => {
  // * Declarations: hooks, state, derived values
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.cart);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = subtotal > 0 ? 0 : 0; // Free delivery on this order
  const tax = Math.round(subtotal * 0.075); // VAT at 7.5% (kobo)
  const total = subtotal + deliveryFee + tax;

  // ? Functions: handlers, callbacks, helpers
  if (items.length === 0) {
    return (
      <main className="bg-background px-3 py-6 sm:px-4 sm:py-10">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="mx-auto w-full max-w-2xl text-center py-20">
            <div className="w-20 h-20 mx-auto rounded-full bg-surface flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-text-muted" />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">Your Cart is Empty</h2>
            <p className="text-text-muted mb-8">Looks like you haven't added any dishes yet.</p>
            <Link to="/shop" className="btn-primary">
              Browse Menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-screen-2xl">
        {/* Header */}
        <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Nriju shop</p>
            <h1 className="mt-2 max-w-3xl font-heading text-3xl font-bold leading-tight text-text">
              Your Cart
            </h1>
            <p className="mt-1 text-text-muted">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => {
              const productId = getCartItemProductId(item);
              return (
                <div
                  key={productId}
                  className="bg-surface border border-border rounded-card p-5 flex gap-4"
                >
                  {/* Item image */}
                  <div className="w-20 h-20 rounded-xl bg-background flex items-center justify-center shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className="text-3xl">🍲</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Item name + Category */}
                    <div className="flex flex-col gap-1">
                      <h3 className="font-medium text-text line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-text-muted">{item.category}</p>
                    </div>

                    {/* Price */}
                    <p className="mt-1 text-sm text-primary font-semibold">
                      {formatNaira(item.price)}{" "}
                      <span className="text-text-muted font-normal">/ {item.unit}</span>
                    </p>

                    {/* Stock status */}
                    <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> In Stock
                    </span>

                    {/* Quantity stepper */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() =>
                          dispatch(changeQuantity(productId, Math.max(1, item.quantity - 1)))
                        }
                        className="w-8 h-8 rounded-button bg-background border border-border flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-text">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => dispatch(changeQuantity(productId, item.quantity + 1))}
                        className="w-8 h-8 rounded-button bg-background border border-border flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Actions + line total */}
                  <div className="flex flex-col items-end justify-between">
                    <div className="flex items-end gap-1">
                      <button
                        onClick={() => dispatch(deleteItem(productId))}
                        className="text-text-muted hover:text-primary p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <a href="#" className="mt-0.5 text-xs text-text-muted hover:text-primary">
                        Save for later
                      </a>
                    </div>
                    <span className="mt-2 font-heading font-bold text-text">
                      {formatNaira(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-surface border border-border rounded-card p-5 sticky top-6">
              <h2 className="font-heading text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-text-muted">Subtotal ({items.length} items)</span>
                  <span className="font-medium text-text">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Shipping</span>
                  <span className="font-medium text-text">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">VAT (7.5%)</span>
                  <span className="font-medium text-text">{formatNaira(tax)}</span>
                </div>
              </div>

              {/* Promo code */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Promo code"
                  className="flex-1 h-10 rounded-input border border-border bg-background pl-3 pr-4 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <button className="px-4 h-10 bg-primary text-on-accent font-medium rounded-button hover:opacity-90">
                  Apply
                </button>
              </div>

              {/* Total */}
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="font-heading font-bold text-xl text-text">Total</span>
                  <span className="font-heading font-bold text-xl text-text">
                    {formatNaira(total)}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <Link
                to="/checkout"
                className="w-full py-3 bg-primary text-on-accent font-semibold rounded-button text-center inline-flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Trust badges */}
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] text-text-muted">
                    ✓
                  </span>
                  <span className="text-xs text-text-muted">
                    Secure checkout, encrypted payment
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] text-text-muted">
                    🚚
                  </span>
                  <span className="text-xs text-text-muted">Free delivery on this order</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended items */}
        <section className="mt-12">
          <h3 className="font-heading text-xl font-bold mb-6">Add to your order</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-card p-4 flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center">
                  <span className="text-3xl">🍲</span>
                </div>
                <h4 className="font-medium text-text text-sm text-center">Item {i}</h4>
                <p className="text-sm text-primary font-semibold">₦2,000</p>
                <button className="w-full py-2 bg-primary text-on-accent text-xs font-medium rounded-button hover:opacity-90">
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Continue Shopping */}
        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 text-text-muted hover:text-primary"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
};

export default CartPage;
