import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { useQuery } from "@tanstack/react-query";
import { toggleCartDrawer } from "../../slices/uiSlice";
import { clearAuth } from "../../slices/authSlice";
import api from "../../services/api";
import {
  ShoppingBag,
  ShoppingCart,
  User,
  Shield,
  Package,
  LogOut,
  Search as SearchIcon,
  Heart,
  HelpCircle,
  BookOpen,
  MessageCircle,
  FolderOpen,
  Truck,
  RotateCcw,
} from "lucide-react";
import { getCategoryIcon } from "../../utils/categoryIcons";

const Header = () => {
  // --- Router hooks ---
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Auth ---
  const { user, loading } = useAppSelector((s) => s.auth);

  // --- UI state ---
  const [search, setSearch] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const headerRef = useRef(null);

  // Close both dropdowns when the user clicks outside the header.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setAccountOpen(false);
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Derived values ---
  const { items } = useAppSelector((s) => s.cart);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const { items: wishlistItems } = useAppSelector((s) => s.wishlist);
  const wishlistCount = wishlistItems.length;
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  // --- Queries ---
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
    staleTime: 5 * 60 * 1000,
  });

  // --- Render handlers ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    navigate(`/shop${params.toString() ? `?${params}` : ""}`);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    dispatch(clearAuth());
    navigate("/login", { state: { from: location }, replace: true });
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 lg:grid lg:h-17 lg:grid-cols-[10rem_minmax(18rem,39rem)_auto]">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="/assets/logos/nriju-logo-full-colour.png"
                alt="Nriju"
                className="h-9 w-24 object-contain lg:h-10 lg:w-32"
              />
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="hidden min-w-0 items-center lg:flex">
            <div className="flex h-10 w-full rounded-full overflow-hidden border border-border bg-background p-0.5 mr-3">
              <div className="flex items-center px-3 text-text-muted">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products ..."
                className="flex-1 py-2.5 text-sm bg-transparent text-text outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="bg-primary flex items-center text-on-accent text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex shrink-0 justify-end">
            <div className="flex shrink-0 items-center gap-0.5">
              {/* Account dropdown — click to open */}
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
              ) : user ? (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex items-center gap-1 p-2 rounded-full hover:bg-background"
                  >
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
                    <span className="hidden md:block text-sm text-text font-medium truncate min-w-32">
                      {user.name}
                    </span>
                  </button>

                  <div
                    className={`absolute right-0 top-full w-48 bg-surface rounded-lg shadow-soft border border-border py-1 z-50 transition-opacity duration-150 ${
                      accountOpen
                        ? "opacity-100 visible"
                        : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                    }`}
                  >
                    <Link
                      to="/account"
                      className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                      onClick={() => setAccountOpen(false)}
                    >
                      <User className="w-4 h-4 text-text-muted" /> Account
                    </Link>
                    <Link
                      to="/account/orders"
                      className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Package className="w-4 h-4 text-text-muted" /> Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                        onClick={() => setAccountOpen(false)}
                      >
                        <Shield className="w-4 h-4 text-text-muted" /> Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setAccountOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-background flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  state={{ from: location }}
                  className="px-3 py-1.5 text-sm font-medium text-text rounded-full hover:bg-background transition-colors"
                >
                  Login
                </Link>
              )}

              {/* Help dropdown — click to open */}
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => setHelpOpen(!helpOpen)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-background text-sm font-medium text-text"
                >
                  <HelpCircle className="w-4 h-4" />
                  <div className="hidden sm:block">Help</div>
                </button>
                <div
                  className={`absolute right-0 top-full w-52 bg-surface rounded-lg shadow-soft border border-border py-1 z-50 transition-opacity duration-150 ${
                    helpOpen
                      ? "opacity-100 visible"
                      : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                  }`}
                >
                  <Link
                    to="/about"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    onClick={() => setHelpOpen(false)}
                  >
                    <BookOpen className="w-4 h-4 text-text-muted" /> Our Story
                  </Link>
                  <Link
                    to="/delivery"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    onClick={() => setHelpOpen(false)}
                  >
                    <Truck className="w-4 h-4 text-text-muted" /> Delivery Info
                  </Link>
                  <Link
                    to="/returns"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    onClick={() => setHelpOpen(false)}
                  >
                    <RotateCcw className="w-4 h-4 text-text-muted" /> Returns
                  </Link>
                  <Link
                    to="/faq"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    onClick={() => setHelpOpen(false)}
                  >
                    <HelpCircle className="w-4 h-4 text-text-muted" /> FAQ
                  </Link>
                  <Link
                    to="/contact"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    onClick={() => setHelpOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4 text-text-muted" /> Contact
                  </Link>
                  <div className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" /> Categories
                  </div>
                  {categories?.map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/shop?category=${cat.slug}`}
                      className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                      onClick={() => setHelpOpen(false)}
                    >
                      {getCategoryIcon(cat.name)} {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Shop - large screens only; mobile covers it via the tab bar */}
              <Link
                to="/shop"
                className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-background transition-colors text-sm font-medium text-text"
              >
                <ShoppingBag className="w-4 h-4 text-text" />
                Shop
              </Link>

              {/* Cart */}
              <button
                onClick={() => dispatch(toggleCartDrawer())}
                className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-background transition-colors"
                aria-label="Open cart"
              >
                <span className="relative">
                  <ShoppingCart className="w-4 h-4 text-text" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary text-on-accent text-[0.5rem] font-medium rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-text">Cart</span>
              </button>

              {/* Cart — mobile only */}
              <button
                onClick={() => dispatch(toggleCartDrawer())}
                className="md:hidden relative p-2 rounded-full hover:bg-background transition-colors"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-4 h-4 text-text" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-on-accent text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Wishlist */}
              <button
                onClick={() =>
                  navigate(
                    user ? "/account/wishlist" : "/login",
                    user ? null : { state: { from: { pathname: "/account/wishlist" } } },
                  )
                }
                className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-background transition-colors"
                aria-label="Wishlist"
              >
                <span className="relative">
                  <Heart className="w-4 h-4 text-text" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary text-on-accent text-[0.5rem] font-medium rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-text">Wishlist</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
