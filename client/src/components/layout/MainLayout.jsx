import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileTabBar from "./MobileTabBar";
import CartDrawer from "../shared/CartDrawer";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      <CartDrawer />
    </div>
  );
};

export { MainLayout };
