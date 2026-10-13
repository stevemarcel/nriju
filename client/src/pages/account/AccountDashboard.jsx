import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { Package, Heart, MapPin, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { formatNaira } from "../../utils/formatMoney";

const AccountDashboard = () => {
  const navigate = useNavigate();
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

  const tiles = [
    {
      to: "/account/orders",
      icon: Package,
      label: "My Orders",
      count: orders.length,
      sub: `${activeOrders.length} active`,
    },
    {
      to: "/account/profile",
      icon: MapPin,
      label: "Profile & Addresses",
      count: null,
      sub: "Edit details",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text hover:border-primary hover:bg-background transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
        <h1 className="font-heading text-3xl font-bold text-text">
          Welcome back, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-text-muted mt-1">
          Track your orders, manage your account, and browse fresh meals.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="p-5 bg-surface rounded-xl border border-border hover:border-primary hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-text">{tile.label}</div>
                  <div className="text-xs text-text-muted">{tile.sub}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Active orders */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Active Orders
          </h2>
          <Link to="/account/orders" className="text-sm text-primary hover:underline font-medium">
            View all →
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background flex items-center justify-center">
              <Package className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">No active orders</p>
            <p className="text-xs mt-1">Place your first order to see it here</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 transition-colors"
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
                className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-surface transition-colors group"
              >
                <div>
                  <div className="font-medium text-sm">{o.orderNumber}</div>
                  <div className="text-xs text-text-muted">
                    {o.items.length} item(s) · {new Date(o.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-semibold text-sm">{formatNaira(o.total)}</div>
                  <div className="text-xs text-primary capitalize">
                    {o.status.replace("_", " ")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDashboard;
