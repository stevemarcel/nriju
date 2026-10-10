import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setCartDrawer } from "../../slices/uiSlice";
import { removeLocal, updateLocal } from "../../slices/cartSlice";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const CartDrawer = () => {
  const dispatch = useAppDispatch();
  const { cartDrawerOpen } = useAppSelector((s) => s.ui);
  const { items } = useAppSelector((s) => s.cart);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Close drawer on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") dispatch(setCartDrawer(false));
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [dispatch]);

  if (!cartDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => dispatch(setCartDrawer(false))}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Your Cart
          </h2>
          <button
            onClick={() => dispatch(setCartDrawer(false))}
            className="p-1 rounded hover:bg-background"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 mx-auto text-text-muted mb-3" />
              <p className="text-text-muted">Your cart is empty</p>
              <Link
                to="/shop"
                onClick={() => dispatch(setCartDrawer(false))}
                className="inline-block mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <p className="text-sm text-primary font-semibold">{formatNaira(item.price)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() =>
                          dispatch(
                            updateLocal({
                              productId: item.product,
                              quantity: Math.max(1, item.quantity - 1),
                            }),
                          )
                        }
                        className="w-6 h-6 rounded bg-background flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() =>
                          dispatch(
                            updateLocal({ productId: item.product, quantity: item.quantity + 1 }),
                          )
                        }
                        className="w-6 h-6 rounded bg-background flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch(removeLocal(item.product))}
                    className="self-start text-text-muted hover:text-primary p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-heading font-bold text-lg">{formatNaira(total)}</span>
            </div>
            <Link
              to="/cart"
              onClick={() => dispatch(setCartDrawer(false))}
              className="block w-full py-3 bg-primary text-white text-center rounded-lg font-medium"
            >
              View Cart & Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export { CartDrawer };
