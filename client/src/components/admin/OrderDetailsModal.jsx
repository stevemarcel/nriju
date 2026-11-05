import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle,
  X,
  RotateCcw,
  Save,
  Check,
  Package,
  Truck,
  MapPin,
  CreditCard,
  User,
} from "lucide-react";
import Dropdown from "../ui/Dropdown";
import { ConfirmModal } from "../ui/ConfirmModal";
import api from "../../services/api";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: <Clock className="w-3 h-3 text-amber-500" /> },
  {
    value: "confirmed",
    label: "Confirmed",
    icon: <CheckCircle className="w-3 h-3 text-blue-500" />,
  },
  { value: "preparing", label: "Preparing", icon: <Package className="w-3 h-3 text-violet-500" /> },
  { value: "ready_for_pickup", label: "Ready", icon: <Truck className="w-3 h-3 text-cyan-500" /> },
  { value: "on_the_way", label: "On the way", icon: <Truck className="w-3 h-3 text-indigo-500" /> },
  {
    value: "delivered",
    label: "Delivered",
    icon: <CheckCircle className="w-3 h-3 text-emerald-500" />,
  },
  {
    value: "picked_up",
    label: "Picked up",
    icon: <CheckCircle className="w-3 h-3 text-emerald-500" />,
  },
  { value: "cancelled", label: "Cancelled", icon: <X className="w-3 h-3 text-rose-500" /> },
  { value: "refunded", label: "Refunded", icon: <RotateCcw className="w-3 h-3 text-slate-500" /> },
];

const formatNaira = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount || 0);
};

const OrderDetailsModal = ({ order, statusOptions, onClose, onUpdated }) => {
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || order.orderNumber || "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateMutation = useMutation({
    mutationFn: (updates) => api.patch(`/orders/${order._id}/status`, updates),
    onSuccess: onUpdated,
  });

  const handleSave = () => setConfirmOpen(true);

  const handleConfirm = () => {
    setConfirmOpen(false);
    updateMutation.mutate({ status, trackingCode });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-background rounded-[20px] shadow-sm border border-border/60 w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="bg-surface rounded-t-[20px] flex items-center justify-between p-5 border-b border-border/60">
            <h2 className="font-heading text-xl font-bold text-text">Order {order.orderNumber}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
            {/* Customer + Shipping row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Customer info card */}
              <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-text-muted" />
                  <h3 className="font-heading font-semibold text-text">Customer Information</h3>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {order.user?.profileImage || order.user?.avatar ? (
                      <img
                        src={order.user.profileImage || order.user.avatar}
                        alt={order.user?.name || order.guestName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {(order.user?.name || order.guestName || "G").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text">
                      {order.user?.name || order.guestName || "Guest"}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Email: {order.user?.email || "N/A"}
                      <br />
                      Phone: {order.user?.phone || order.guestPhone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping card */}
              <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-text-muted" />
                  <h3 className="font-heading font-semibold text-text">Shipping Address</h3>
                </div>
                <div className="text-sm text-text bg-background-soft/30 rounded-xl px-4 py-3 space-y-0.5">
                  <p>{order.shippingAddress?.name || "—"}</p>
                  <p className="text-text-muted">{order.shippingAddress?.line1 || "—"}</p>
                  <p className="text-text-muted">
                    {order.shippingAddress?.city || "—"}, {order.shippingAddress?.state || ""}
                  </p>
                  <p className="text-text-muted">{order.shippingAddress?.country || "—"}</p>
                </div>
              </div>
            </div>

            {/* Status & tracking card */}
            <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-text-muted" />
                <h3 className="font-heading font-semibold text-text">Status & Tracking</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2">Status</label>
                  <Dropdown
                    trigger={
                      <>
                        <div className="mr-2">
                          {statusOptions.find((s) => s.value === status)?.icon || (
                            <Package className="w-4 h-4" />
                          )}
                        </div>
                        <span className="flex-1 text-left whitespace-nowrap">
                          {statusOptions.find((s) => s.value === status)?.label || "Select Status"}
                        </span>
                      </>
                    }
                    color="muted"
                    fullWidth
                    menuClassName="sm:w-full"
                  >
                    {statusOptions
                      .filter((s) => s.value)
                      .map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setStatus(s.value)}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-background transition-colors ${
                            status === s.value
                              ? "text-primary font-semibold bg-primary/5"
                              : "text-text"
                          }`}
                        >
                          {s.icon}
                          <span className="flex-1">{s.label}</span>
                          {status === s.value && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                  </Dropdown>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2">
                    Tracking code
                  </label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-primary/5 border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
                    placeholder="e.g. courier shipment reference"
                  />
                </div>
              </div>
            </div>

            {/* Order items card */}
            <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-text-muted" />
                <h3 className="font-heading font-semibold text-text">Order Items</h3>
              </div>
              <div className="divide-y divide-border/60">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-border/60">
                        <Package className="w-8 h-8 text-text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-text block">{item.name}</span>
                      <span className="text-xs text-text-muted">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-heading font-semibold text-text whitespace-nowrap">
                      {formatNaira(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order summary card */}
            <div className="bg-background-soft/70 rounded-[20px] p-5 border border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-text-muted" />
                <h3 className="font-heading font-semibold text-text">Order Summary</h3>
              </div>
              <div className="space-y-3 text-sm bg-background-soft/30 rounded-xl px-4 py-4">
                <div className="flex justify-between">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="font-medium text-text">{formatNaira(order.subtotal)}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Discount</span>
                    <span className="font-medium text-text">-{formatNaira(order.discount)}</span>
                  </div>
                )}
                {order.deliveryFee && order.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Delivery</span>
                    <span className="font-medium text-text">{formatNaira(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="border-t border-border/60 pt-3 flex justify-between font-bold text-text">
                  <span>Total</span>
                  <span className="font-heading">{formatNaira(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 border-t border-border/60 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-background-soft/50 border border-border rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-primary text-white font-medium rounded-xl inline-flex items-center gap-2 hover:bg-primary/95 disabled:opacity-60 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save status"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Update order status?"
        description="This will save the new status and tracking code for this order."
        confirmLabel="Save status"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default OrderDetailsModal;
