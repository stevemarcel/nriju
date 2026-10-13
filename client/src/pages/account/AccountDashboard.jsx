import { Link } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { Package, Heart, MapPin, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const AccountDashboard = () => {
  const { user } = useAppSelector((s) => s.auth);
  const { items: wishlist } = useAppSelector((s) => s.wishlist);

  const { data: ordersData } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: async () => (await api.get("/orders")).data,
  });

  const orders = ordersData?.data || [];
  const activeOrders = orders.filter((o) =>
    ["pending", "confirmed", "preparing", "ready_for_pickup", "on_the_way"].includes(o.status),
  );

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Top bar */}
      <div className="bg-surface border-b border-border-soft">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Store</span>
          </Link>
          <span className="text-text-muted text-sm hidden sm:inline">/</span>
          <span className="text-sm text-text-muted hidden sm:inline">Account</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">
            Account
          </h1>
          <p className="text-text-muted mt-1 text-sm">Manage your profile, orders, and preferences.</p>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="bg-surface rounded-xl border border-border-soft p-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="font-heading text-2xl font-bold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <h2 className="font-heading text-lg font-bold text-text">{user?.name}</h2>
              <p className="text-xs text-text-muted mt-1">{user?.email}</p>
              {user?.phone && (
                <p className="text-xs text-text-muted mt-0.5">{user?.phone}</p>
              )}

              {/* Role badge */}
              <div className="mt-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    user?.role === "superAdmin"
                      ? "bg-purple-100 text-purple-700"
                      : user?.role === "admin"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-background text-text-muted"
                  }`}
                >
                  {user?.role?.replace("superAdmin", "Super Admin").replace("admin", "Admin") || "Customer"}
                </span>
              </div>

              {/* Quick actions */}
              <div className="mt-6 w-full space-y-2">
                <Link
                  to="/account/orders"
                  className="flex items-center justify-between w-full px-4 py-3 bg-background rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-text">My Orders</span>
                  </div>
                  <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded-full">
                    {orders.length}
                  </span>
                </Link>
                <Link
                  to="/account/profile"
                  className="flex items-center justify-between w-full px-4 py-3 bg-background rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-text">Profile & Addresses</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account details */}
            <div className="bg-surface rounded-xl border border-border-soft p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading text-base font-semibold text-text">Account Details</h2>
                <Link
                  to="/account/profile"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Edit
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-muted mb-1">Full Name</div>
                  <div className="text-sm font-medium text-text">{user?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Email</div>
                  <div className="text-sm font-medium text-text">{user?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Phone</div>
                  <div className="text-sm font-medium text-text">{user?.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Role</div>
                  <div className="text-sm font-medium text-text capitalize">{user?.role || "customer"}</div>
                </div>
              </div>
            </div>

            {/* Active orders */}
            <div className="bg-surface rounded-xl border border-border-soft p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading text-base font-semibold text-text flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Active Orders
                </h2>
                <Link
                  to="/account/orders"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View all
                </Link>
              </div>

              {activeOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-background flex items-center justify-center">
                    <Package className="w-6 h-6 text-text-muted opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-text">No active orders</p>
                  <p className="text-xs text-text-muted mt-1">Place your first order to track it here</p>
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.slice(0, 3).map((o) => (
                    <Link
                      key={o._id}
                      to="/account/orders"
                      className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-text">{o.orderNumber}</div>
                          <div className="text-xs text-text-muted">
                            {o.items.length} item(s) · {new Date(o.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="font-heading font-semibold text-sm text-text">{formatNaira(o.total)}</div>
                          <div className="text-xs text-primary capitalize font-medium">
                            {o.status.replace("_", " ")}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDashboard;
