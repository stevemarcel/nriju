import { Link, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { clearAuth } from "../../slices/authSlice";
import {
  Package,
  Heart,
  MapPin,
  Clock,
  ChevronRight,
  ArrowLeft,
  LogOut,
  Lock,
  Plus,
  CreditCard,
  ExternalLink,
  Shield,
} from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const AccountDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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

  // Get the default shipping address from user
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    dispatch(clearAuth());
    navigate("/login");
  };

  // Use Redux/localStorage wishlist (synced from ProductCard.jsx heart toggle)
  const wishlistItems = wishlist || [];
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  return (
    <div className="min-h-screen bg-background-soft">
      {/* Top breadcrumb bar */}
      <div className="bg-surface border-b border-border-soft">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Store</span>
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <span className="text-sm text-text-muted">Account</span>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary text-xs font-bold rounded-lg border border-primary/10 hover:bg-primary/10 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              ADMIN DASHBOARD
            </Link>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-text">Account</h1>
          <p className="text-text-muted mt-1 text-sm">
            Manage your profile, orders, and preferences.
          </p>
        </div>

        {/* Top Grid - Profile, Details, Payment */}
        <div className="grid lg:grid-cols-12 gap-6 mb-8">
          {/* LEFT: Profile card */}
          <div className="lg:col-span-4">
            <div className="bg-surface rounded-2xl border border-border-soft p-8 h-full">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 ring-4 ring-background-soft group-hover:ring-primary/10 transition-all overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-heading text-4xl font-bold text-primary/30">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="font-heading text-2xl font-bold text-text">{user?.name}</h2>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-sm text-text-muted">{user?.email}</p>
                  {user?.phone && <p className="text-sm text-text-muted">{user?.phone}</p>}
                </div>

                <div className="mt-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      user?.role === "superAdmin"
                        ? "bg-purple-100 text-purple-700"
                        : user?.role === "admin"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-background text-text-muted border border-border-soft"
                    }`}
                  >
                    {user?.role?.replace("superAdmin", "Super Admin").replace("admin", "Admin") ||
                      "Customer"}
                  </span>
                </div>

                {/* Stats */}
                <div className="w-full grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-border-soft">
                  <div className="bg-background-soft rounded-xl p-4">
                    <div className="font-heading text-2xl font-bold text-text">{orders.length}</div>
                    <div className="text-[10px] uppercase font-bold text-text-muted tracking-tight">
                      Total Orders
                    </div>
                  </div>
                  <div className="bg-background-soft rounded-xl p-4">
                    <div className="font-heading text-2xl font-bold text-primary">
                      {activeOrders.length}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-text-muted tracking-tight">
                      Active
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="w-full mt-6 space-y-2">
                  <Link
                    to="/account/orders"
                    className="flex items-center justify-between w-full px-5 py-4 bg-background-soft rounded-xl hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-text">My Orders</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  </Link>
                  <Link
                    to="/account/profile"
                    className="flex items-center justify-between w-full px-5 py-4 bg-background-soft rounded-xl hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-text">Profile</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  </Link>
                  <Link
                    to="/account/change-password"
                    className="flex items-center justify-between w-full px-5 py-4 bg-background-soft rounded-xl hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-text">Password</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  </Link>
                </div>

                <div className="w-full mt-4 pt-6 border-t border-border-soft">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold uppercase tracking-wide"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT TOP: Details + Address */}
          <div className="lg:col-span-8 grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Account Details */}
              <div className="bg-surface rounded-2xl border border-border-soft p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-heading text-lg font-bold text-text">Account Details</h2>
                  <Link
                    to="/account/profile"
                    className="p-2 bg-background-soft rounded-lg text-text-muted hover:text-primary transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                      Full Name
                    </div>
                    <div className="text-base font-semibold text-text">{user?.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                      Email Address
                    </div>
                    <div className="text-base font-semibold text-text truncate">{user?.email}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                        Role
                      </div>
                      <div className="text-sm font-semibold text-text capitalize">
                        {user?.role || "customer"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                        Gender
                      </div>
                      <div className="text-sm font-semibold text-text">—</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-surface rounded-2xl border border-border-soft p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-heading text-lg font-bold text-text">Shipping Address</h2>
                  <Link
                    to="/account/profile"
                    className="p-2 bg-background-soft rounded-lg text-text-muted hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
                {defaultAddress ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                        Street Address
                      </div>
                      <div className="text-sm font-semibold text-text">
                        {defaultAddress.line1}
                        {defaultAddress.line2 && (
                          <span className="block text-text-muted mt-0.5">{defaultAddress.line2}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                          City
                        </div>
                        <div className="text-sm font-semibold text-text">{defaultAddress.city}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                          State
                        </div>
                        <div className="text-sm font-semibold text-text">{defaultAddress.state}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1.5">
                        Label
                      </div>
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider">
                        {defaultAddress.label}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border-soft rounded-2xl">
                    <MapPin className="w-8 h-8 text-text-muted opacity-20 mb-3" />
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      No address saved
                    </p>
                    <Link
                      to="/account/profile"
                      className="mt-4 text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                    >
                      Add Address
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Active Orders Section */}
            <div className="bg-surface rounded-2xl border border-border-soft p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-lg font-bold text-text">Active Orders</h2>
                <Link
                  to="/account/orders"
                  className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  View all
                </Link>
              </div>

              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-16 h-16 rounded-full bg-background-soft flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-text-muted opacity-20" />
                  </div>
                  <p className="text-sm font-bold text-text-muted uppercase tracking-widest">
                    No active orders
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.slice(0, 2).map((o) => (
                    <Link
                      key={o._id}
                      to="/account/orders"
                      className="flex items-center justify-between p-5 bg-background-soft rounded-2xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-text text-sm">{o.orderNumber}</div>
                          <div className="text-xs text-text-muted font-medium mt-0.5">
                            {o.items.length} item(s) ·{" "}
                            {new Date(o.createdAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading font-bold text-text">
                          {formatNaira(o.total)}
                        </div>
                        <div className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
                          {o.status.replace("_", " ")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM: Wish List - Full Width */}
        <div className="bg-surface rounded-2xl border border-border-soft p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-lg">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-text">Wish List</h2>
                <p className="text-xs text-text-muted font-medium mt-0.5">
                  {wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""} saved
                </p>
              </div>
            </div>
            <Link
              to="/shop"
              className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
            >
              View all
            </Link>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border-soft rounded-3xl">
              <Heart className="w-12 h-12 text-text-muted opacity-10 mb-4" />
              <p className="text-sm font-bold text-text-muted uppercase tracking-widest">
                Your wishlist is empty
              </p>
              <Link
                to="/shop"
                className="mt-6 px-8 py-3 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistItems.slice(0, 4).map((item) => {
                const product = typeof item === "object" ? item : null;
                if (!product) return null;

                return (
                  <div
                    key={product._id}
                    className="bg-background-soft rounded-3xl p-5 border border-transparent hover:border-primary/10 hover:shadow-xl hover:shadow-primary/5 transition-all group"
                  >
                    <div className="relative aspect-square rounded-2xl bg-white overflow-hidden mb-5">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart className="w-10 h-10 text-primary/10" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <div className="p-2 bg-white/90 backdrop-blur rounded-full shadow-sm">
                          <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        {product.category?.name || product.category || "General"}
                      </div>
                      <h3 className="font-heading font-bold text-text group-hover:text-primary transition-colors truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between pt-3">
                        <div className="font-heading font-bold text-lg text-text">
                          {formatNaira(product.price)}
                        </div>
                        <Link
                          to={`/product/${product.slug}`}
                          className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDashboard;
