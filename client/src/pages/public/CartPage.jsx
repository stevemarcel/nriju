import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { changeQuantity, deleteItem } from "../../slices/cartSlice";
import { formatNaira } from "../../utils/formatMoney";
import { ShoppingBag, ArrowRight, Minus, Plus, X } from "lucide-react";

const CartPage = () => {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.cart);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = subtotal > 0 ? 150000 : 0; // ₦1,500 flat (kobo)
  const total = subtotal + deliveryFee;

  // Resolve product id regardless of populated object or bare string
  const resolveProductId = (product) =>
    typeof product === "object" && product ? product._id : product;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-surface flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-text-muted" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Your Cart is Empty</h2>
        <p className="text-text-muted mb-8">Looks like you haven't added any dishes yet.</p>
        <Link
          to="/shop"
          className="px-8 py-3 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2"
        >
          Browse Menu <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-bold mb-8">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const productId = resolveProductId(item.product);
            return (
              <div
                key={productId}
                className="flex gap-4 p-4 bg-surface rounded-xl border border-border"
              >
                <div className="w-20 h-20 rounded-lg bg-background flex items-center justify-center shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-3xl">🍲</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-text line-clamp-1">{item.name}</h3>
                  <p className="text-sm text-primary font-semibold mt-1">
                    {formatNaira(item.price)}{" "}
                    <span className="text-text-muted font-normal">/ {item.unit}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() =>
                        dispatch(changeQuantity(productId, Math.max(1, item.quantity - 1)))
                      }
                      className="w-7 h-7 rounded bg-background flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => dispatch(changeQuantity(productId, item.quantity + 1))}
                      className="w-7 h-7 rounded bg-background flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => dispatch(deleteItem(productId))}
                    className="text-text-muted hover:text-primary p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="font-heading font-bold text-text">
                    {formatNaira(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-xl border border-border p-6 sticky top-24">
            <h2 className="font-heading text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span className="font-medium">{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Delivery</span>
                <span className="font-medium">{formatNaira(deliveryFee)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-heading font-bold text-xl text-text">
                  {formatNaira(total)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                to="/checkout"
                className="w-full py-3 bg-primary text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shop"
                className="block w-full py-2.5 text-center text-text-muted border border-border rounded-lg hover:bg-background transition-colors"
              >
                Continue Shopping
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-text-muted mb-2">We accept</p>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-background border border-border px-2 py-1 rounded">
                  Visa
                </span>
                <span className="text-xs bg-background border border-border px-2 py-1 rounded">
                  Mastercard
                </span>
                <span className="text-xs bg-background border border-border px-2 py-1 rounded">
                  Paystack
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
