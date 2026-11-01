import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { useQuery } from "@tanstack/react-query";
import { toggleCartDrawer } from "../../slices/uiSlice";
import { clearAuth } from "../../slices/authSlice";
import api from "../../services/api";
import {
  ShoppingBag,
  User,
  Shield,
  Package,
  LogOut,
  Search as SearchIcon,
  ChevronDown,
  HelpCircle,
  BookOpen,
  MessageCircle,
  FolderOpen,
  Truck,
  RotateCcw,
  Utensils,
  Soup,
  Drumstick,
  Croissant,
  Salad,
  Wine,
  IceCream,
  Apple,
  Carrot,
  Grape,
  Nut,
  Cake,
  Milk,
  Beer,
  Pizza,
  Sandwich,
  Coffee,
} from "lucide-react";

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAppSelector((s) => s.auth);
  const { items } = useAppSelector((s) => s.cart);
  const [search, setSearch] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

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

  // Pick a dish-related icon for a category name so the Help dropdown
  // categories row doesn't all look identical.
  const getCategoryIcon = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("soup")) return <Soup className="w-4 h-4 text-text-muted" />;
    if (
      n.includes("swallow") ||
      n.includes("fufu") ||
      n.includes("yam") ||
      n.includes("amala") ||
      n.includes("eba") ||
      n.includes("garri") ||
      n.includes("semo")
    )
      return <Utensils className="w-4 h-4 text-text-muted" />;
    if (
      n.includes("protein") ||
      n.includes("beef") ||
      n.includes("chicken") ||
      n.includes("fish") ||
      n.includes("meat") ||
      n.includes("suya")
    )
      return <Drumstick className="w-4 h-4 text-text-muted" />;
    if (
      n.includes("snack") ||
      n.includes("boli") ||
      n.includes("groundnut") ||
      n.includes("akara") ||
      n.includes("puff")
    )
      return <Croissant className="w-4 h-4 text-text-muted" />;
    if (
      n.includes("drink") ||
      n.includes("zobo") ||
      n.includes("tea") ||
      n.includes("coffee") ||
      n.includes("malt")
    )
      return <Coffee className="w-4 h-4 text-text-muted" />;
    if (n.includes("oil") || n.includes("fat")) return <Wine className="w-4 h-4 text-text-muted" />;
    if (n.includes("season") || n.includes("spice") || n.includes("salt") || n.includes("pepper"))
      return <Nut className="w-4 h-4 text-text-muted" />;
    if (
      n.includes("fruit") ||
      n.includes("plantain") ||
      n.includes("banana") ||
      n.includes("mango")
    )
      return <Apple className="w-4 h-4 text-text-muted" />;
    if (n.includes("vegetable") || n.includes("leaf") || n.includes("spinach"))
      return <Carrot className="w-4 h-4 text-text-muted" />;
    if (n.includes("dessert") || n.includes("sweet") || n.includes("cake"))
      return <Cake className="w-4 h-4 text-text-muted" />;
    if (n.includes("dairy") || n.includes("milk") || n.includes("yogurt"))
      return <Milk className="w-4 h-4 text-text-muted" />;
    if (n.includes("bread") || n.includes("pie"))
      return <Pizza className="w-4 h-4 text-text-muted" />;
    return <Utensils className="w-4 h-4 text-text-muted" />;
  };

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 lg:grid lg:h-17 lg:grid-cols-[10rem_minmax(18rem,39rem)_auto] lg:gap-5">
          {/* Logo */}
          <div className="flex shrink-0 items-center">
            <Link to="/" className="flex items-center shrink-0">
              <img
                src="/assets/logos/nriju-logo-full-colour.png"
                alt="Nriju"
                className="h-9 w-24 object-contain lg:h-10 lg:w-32"
              />
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="hidden min-w-0 items-center lg:flex">
            <div className="flex w-full rounded-full overflow-hidden border border-border bg-background p-1">
              <div className="flex items-center px-3 text-text-muted">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands and categories"
                className="flex-1 py-2.5 px-2 text-sm bg-transparent text-text outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="bg-primary text-on-accent text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex shrink-0 justify-end">
            <div className="flex shrink-0 items-center gap-3">
              {/* Account dropdown */}
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
              ) : user ? (
                <div className="relative group">
                  <button
                    type="button"
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-background"
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
                    <span className="hidden md:block text-sm text-text">{user.name}</span>
                  </button>

                  <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-soft border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link
                      to="/account"
                      className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-text-muted" /> Account
                    </Link>
                    <Link
                      to="/account/orders"
                      className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-text-muted" /> Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-text-muted" /> Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-background flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  state={{ from: { pathname: "/" } }}
                  className="px-3 py-1.5 text-sm font-medium text-text hover:text-primary transition-colors"
                >
                  Login
                </Link>
              )}

              {/* Help dropdown — hover to open, same behavior as account */}
              <div className="relative group">
                <button
                  type="button"
                  className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-background text-text-secondary text-sm font-medium"
                >
                  <HelpCircle className="w-4 h-4 text-text-secondary" />
                  Help
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute right-0 mt-2 w-52 bg-surface rounded-lg shadow-soft border border-border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link
                    to="/about"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-text-muted" /> Our Story
                  </Link>
                  <Link
                    to="/delivery"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4 text-text-muted" /> Delivery Info
                  </Link>
                  <Link
                    to="/returns"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-text-muted" /> Returns
                  </Link>
                  <Link
                    to="/faq"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-text-muted" /> FAQ
                  </Link>
                  <Link
                    to="/contact"
                    className="px-4 py-2 text-sm text-text hover:bg-background flex items-center gap-2"
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
                    >
                      {getCategoryIcon(cat.name)} {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <button
                onClick={() => dispatch(toggleCartDrawer())}
                className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-background transition-colors"
                aria-label="Open cart"
              >
                <span className="relative">
                  <ShoppingBag className="w-5 h-5 text-text" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-accent text-xs rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </span>
                <span className="text-sm text-text">Cart</span>
              </button>
              <button
                onClick={() => dispatch(toggleCartDrawer())}
                className="md:hidden relative p-2 rounded-full hover:bg-background transition-colors"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-5 h-5 text-text" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-accent text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
