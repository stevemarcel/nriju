import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileTabBar from "./MobileTabBar";
import CartDrawer from "../shared/CartDrawer";

const MainLayout = () => {
  const location = useLocation();
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
