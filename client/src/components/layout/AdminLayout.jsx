import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { clearAuth } from "../../slices/authSlice";
import api from "../../services/api";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCog,
  Star,
  Ticket,
  Settings,
  Store,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/users", label: "Staff & Users", icon: UserCog },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    dispatch(clearAuth());
    navigate("/login", { state: { from: location }, replace: true });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-text text-white">
        <Link to="/admin" className="font-heading font-bold">
          Nriju Admin
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-text text-white/90 transform transition-transform lg:translate-x-0 lg:static lg:h-auto pt-14 lg:pt-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 hidden lg:block">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/assets/logos/nriju-logo-light.png"
              alt="Nriju"
              className="w-15 h-full object-contain"
            />
            <span className="font-heading text-xl font-bold">Admin</span>
          </Link>
        </div>

        <nav className="px-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-white" : "text-white/70 hover:bg-white/10"
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 mt-6 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10"
          >
            <Store className="w-5 h-5 shrink-0" />
            View Storefront
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 w-full"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Logout
          </button>
          {user && (
            <div className="px-3 pt-3 text-xs text-white/50">
              Signed in as <span className="font-medium text-white/80">{user.name}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
