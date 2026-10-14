import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { toggleCartDrawer, setMobileMenu } from "../../slices/uiSlice";
import { clearAuth } from "../../slices/authSlice";
import api from "../../services/api";
import {
  ShoppingBag,
  User,
  Menu,
  X,
  Shield,
  Package,
  LogOut,
  Home,
  Search,
  Soup,
  Beef,
  Wheat,
} from "lucide-react";

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAppSelector((s) => s.auth);
  const { mobileMenuOpen } = useAppSelector((s) => s.ui);
  const { items } = useAppSelector((s) => s.cart);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    dispatch(clearAuth());
    navigate("/login");
  };

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/shop", label: "Shop", icon: Search },
    { to: "/shop?category=swallows", label: "Swallows", icon: Wheat },
    { to: "/shop?category=soups-stews", label: "Soups", icon: Soup },
    { to: "/shop?category=proteins", label: "Proteins", icon: Beef },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/assets/logos/nriju-logo-full-colour.png"
              alt="Nriju"
              className="w-9 h-9 object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-text-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <button
              onClick={() => dispatch(toggleCartDrawer())}
              className="relative p-2 rounded-lg hover:bg-surface transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="w-5 h-5 text-text" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Account */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
            ) : user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm ring-2 ring-border">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-text">{user.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link
                    to="/account"
                    className="block px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-text-muted" /> Account
                  </Link>
                  <Link
                    to="/account/orders"
                    className="block px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                  >
                    <Package className="w-4 h-4 text-text-muted" /> Orders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-text-muted" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-background flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm font-medium text-text hover:text-primary transition-colors"
              >
                Login
              </Link>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface"
              onClick={() => dispatch(setMobileMenu(!mobileMenuOpen))}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => dispatch(setMobileMenu(false))}
                  className="px-3 py-2 rounded-lg text-text hover:bg-background flex items-center gap-2"
                >
                  {link.icon && <link.icon className="w-4 h-4 text-text-muted" />}
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => dispatch(setMobileMenu(false))}
                    className="px-3 py-2 rounded-lg text-text hover:bg-background flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-text-muted" /> Account
                  </Link>
                  <Link
                    to="/account/orders"
                    onClick={() => dispatch(setMobileMenu(false))}
                    className="px-3 py-2 rounded-lg text-text hover:bg-background flex items-center gap-2"
                  >
                    <Package className="w-4 h-4 text-text-muted" /> Orders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => dispatch(setMobileMenu(false))}
                      className="px-3 py-2 rounded-lg text-text hover:bg-background flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-text-muted" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      dispatch(setMobileMenu(false));
                      handleLogout();
                    }}
                    className="text-left px-3 py-2 rounded-lg text-primary hover:bg-background flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => dispatch(setMobileMenu(false))}
                  className="px-3 py-2 rounded-lg text-text hover:bg-background flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-text-muted" /> Login
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
