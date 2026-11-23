import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileTabBar from "./MobileTabBar";
import CartDrawer from "../ui/CartDrawer";

const MainLayout = () => {
  // * Current URL location for route-based layout decisions
  const location = useLocation();

  // * Whether to hide mobile tab bar on account/admin routes
  const hideTabs =
    location.pathname.startsWith("/account") || location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-background-soft">
      <Header />
      <main className={`flex-1 ${hideTabs ? "pb-0" : "pb-20 md:pb-0"}`}>
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      <CartDrawer />
    </div>
  );
};

export default MainLayout;
