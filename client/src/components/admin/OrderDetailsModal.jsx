import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, Save, Check, Package, MapPin, CreditCard, User, ClipboardList } from "lucide-react";
import Dropdown from "../ui/Dropdown";
import { ConfirmModal } from "../ui/ConfirmModal";
import api from "../../services/api";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
  AdminModalHeader,
} from "./AdminModalPrimitives";
import { formatNaira } from "../../utils/formatMoney";

const OrderDetailsModal = ({ order, statusOptions, onClose, onUpdated }) => {
  // * Lock page scroll when modal is open
  usePageScrollLock(Boolean(order));

  // * Current order status (local copy for editing)
  const [status, setStatus] = useState(order.status);

  // * Tracking code for shipment (local editable copy)
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || order.orderNumber || "");

  // * Controls visibility of confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // * Mutation for updating order status via API
  const updateMutation = useMutation({
    mutationFn: (updates) => api.patch(`/orders/${order._id}/status`, updates),
    onSuccess: onUpdated,
  });

  // ? Triggers confirmation modal before saving status changes
  const handleSave = () => setConfirmOpen(true);

  // ? Confirms and persists the status update via API mutation
  const handleConfirm = () => {
    setConfirmOpen(false);
    updateMutation.mutate({ status, trackingCode });
  };

  // * Accessible title ID for modal dialog
  const titleId = "order-details-title";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !updateMutation.isPending) onClose();
          }}
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
        >
          <AdminModalHeader
            icon={ClipboardList}
            eyebrow="Order details"
            title={`Order ${order.orderNumber}`}
            titleId={titleId}
            onClose={onClose}
            closeLabel="Close order details"
            closeDisabled={updateMutation.isPending}
          />
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
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
                          {(() => {
                            const current = statusOptions.find((s) => s.value === status);
                            const Icon = current?.Icon || Package;
                            return <Icon className="w-4 h-4 text-text-muted" />;
                          })()}
                        </div>
                        <span className="flex-1 text-left whitespace-nowrap">
                          {statusOptions.find((s) => s.value === status)?.label || "Select Status"}
                        </span>
                      </>
                    }
                    color="muted"
                    fullWidth
                    ariaLabel="Select order status"
                    triggerClassName="min-h-10 rounded-xl focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
                          <s.Icon className={`w-3 h-3 ${s.color}`} />
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
                    className={ADMIN_FIELD_CLASS}
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
            <button onClick={onClose} className={ADMIN_SECONDARY_BUTTON_CLASS}>
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
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
        variant="success"
        adminStyle
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default OrderDetailsModal;
