import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store/store";
import { fetchMe, clearAuth } from "./slices/authSlice";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { AdminRoute } from "./components/guards/AdminRoute";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";

// Lazy-load route chunks so the initial bundle stays small.
import { lazy } from "react";
const HomePage = lazy(() => import("./pages/public/HomePage"));
const ShopPage = lazy(() => import("./pages/public/ShopPage"));
const ProductDetailPage = lazy(() => import("./pages/public/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/public/CartPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/public/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/public/ResetPasswordPage"));
const CheckoutPage = lazy(() => import("./pages/public/CheckoutPage"));

const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const FAQPage = lazy(() => import("./pages/public/FAQPage"));
const DeliveryPage = lazy(() => import("./pages/public/DeliveryPage"));
const ReturnsPage = lazy(() => import("./pages/public/ReturnsPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));

const AccountDashboard = lazy(() => import("./pages/account/AccountDashboard"));
const AccountOrders = lazy(() => import("./pages/account/AccountOrders"));
const AccountProfile = lazy(() => import("./pages/account/AccountProfile"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const App = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();

  // Bootstrap the session on first load — rehydrate user from the JWT cookie.
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  // On 401 from any API call, bounce the user to login with a return URL.
  useEffect(() => {
    const onUnauthorized = () => {
      dispatch(clearAuth());
      window.location.href = "/login";
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [dispatch]);

  // Scroll to top on every route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Routes>
        {/* ── Public storefront ──────────────────────────────── */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        {/* ── Auth pages (own layout, no sticky nav) ──────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── Checkout (authenticated) ────────────────────────── */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        {/* ── Account area (authenticated) ────────────────────── */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/orders"
          element={
            <ProtectedRoute>
              <AccountOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/profile"
          element={
            <ProtectedRoute>
              <AccountProfile />
            </ProtectedRoute>
          }
        />

        {/* ── Admin area ──────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <AdminRoute>
              <AdminCustomers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminRoute>
              <AdminReviews />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCoupons />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

export { App };
