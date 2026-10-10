import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import { ShoppingBag, User, Home, Search } from "lucide-react";

const MobileTabBar = () => {
  const location = useLocation();
  const { user } = useAppSelector((s) => s.auth);
  const { items } = useAppSelector((s) => s.cart);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const tabs = [
    { to: "/", label: "Home", icon: Home },
    { to: "/shop", label: "Shop", icon: Search },
    { to: "/cart", label: "Cart", icon: ShoppingBag, badge: cartCount },
    { to: user ? "/account" : "/login", label: "Account", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="relative flex flex-col items-center gap-1 px-3 py-1"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary" : "text-text-muted"
                }`}
              />
              <span
                className={`text-xs transition-colors ${
                  isActive ? "text-primary" : "text-text-muted"
                }`}
              >
                {tab.label}
              </span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 right-2 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export { MobileTabBar };
