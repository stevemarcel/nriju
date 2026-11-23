import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { clearAuth } from "../../slices/authSlice";
import api from "../../services/api";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  UserCog,
  Star,
  Ticket,
  Settings,
  Store,
  LogOut,
  Menu,
  X,
  Clock,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";

// * Navigation items for the admin sidebar
const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/inventory", label: "Inventory", icon: ClipboardList },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/users", label: "Staff & Users", icon: UserCog },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/activities", label: "Activities", icon: Clock },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => {
  // * Redux dispatch for side effects
  const dispatch = useAppDispatch();

  // * Router navigation helper
  const navigate = useNavigate();

  // * Current URL location for redirect after login
  const location = useLocation();

  // * Authenticated user from auth slice
  const { user } = useAppSelector((state) => state.auth);

  // * Mobile sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ? Handles logout by clearing auth state and redirecting to login
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Local authentication is cleared even if the logout request fails.
    }
    dispatch(clearAuth());
    navigate("/login", { state: { from: location }, replace: true });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-text px-4 text-white lg:hidden">
        <Link to="/admin" className="font-heading font-bold">
          Nriju Admin
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/*
        Mobile: fixed drawer.
        Desktop: sticky, viewport-height sidebar. The document scrolls in the
        main content area while the sidebar remains anchored to the viewport.
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-text pt-14 text-white/90 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0 lg:pt-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hidden p-6 lg:block">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/assets/logos/nriju-logo-light.png"
              alt="Nriju"
              className="h-auto w-15 object-contain"
            />
            <span className="font-heading text-xl font-bold">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-white" : "text-white/70 hover:bg-white/10"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10"
          >
            <Store className="h-5 w-5 shrink-0" />
            View Storefront
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
          {user && (
            <div className="px-3 pt-3 text-xs text-white/50">
              Signed in as <span className="font-medium text-white/80">{user.name}</span>
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1">
        <div className="p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
