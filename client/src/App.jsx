import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store/store";
import { fetchMe, clearAuth } from "./slices/authSlice";
import { fetchCart } from "./slices/cartSlice";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/guards/ProtectedRoute";
import AdminRoute from "./components/guards/AdminRoute";
import AdminLayout from "./components/layout/AdminLayout";
import ErrorBoundary from "./components/layout/ErrorBoundary";

// Lazy-load route chunks so the initial bundle stays small.
const HomePage = lazy(() => import("./pages/public/HomePage"));
const ShopPage = lazy(() => import("./pages/public/ShopPage"));
const ProductDetailPage = lazy(() => import("./pages/public/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/public/CartPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/public/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/public/ResetPasswordPage"));

const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const FAQPage = lazy(() => import("./pages/public/FAQPage"));
const DeliveryPage = lazy(() => import("./pages/public/DeliveryPage"));
const ReturnsPage = lazy(() => import("./pages/public/ReturnsPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const CheckoutPage = lazy(() => import("./pages/public/CheckoutPage"));
const CheckoutSuccessPage = lazy(() => import("./pages/public/CheckoutSuccessPage"));

// ACCOUNT PAGES
const AccountDashboardPage = lazy(() => import("./pages/account/AccountDashboardPage"));
const AccountOrdersPage = lazy(() => import("./pages/account/AccountOrdersPage"));
const AccountProfilePage = lazy(() => import("./pages/account/AccountProfilePage"));
const AddressesPage = lazy(() => import("./pages/account/AddressesPage"));
const ChangePasswordPage = lazy(() => import("./pages/account/ChangePasswordPage"));
const WishlistPage = lazy(() => import("./pages/account/WishlistPage"));

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/AdminCustomersPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));
const AdminCouponsPage = lazy(() => import("./pages/admin/AdminCouponsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));

const App = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAppSelector((s) => s.auth);

  // Bootstrap the session on first load — rehydrate user from the JWT cookie.
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  // After auth is resolved, fetch the server cart if logged in.
  useEffect(() => {
    if (!loading && user) {
      dispatch(fetchCart());
    }
  }, [dispatch, user, loading]);

  // On 401 from any API call, bounce the user to login with a return URL.
  useEffect(() => {
    const onUnauthorized = () => {
      dispatch(clearAuth());
      navigate("/login", { state: { from: location }, replace: true });
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [dispatch, navigate, location]);

  // Scroll to top on every route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

          {/* ── Account area (authenticated) ────────────────────── */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/orders"
            element={
              <ProtectedRoute>
                <AccountOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/profile"
            element={
              <ProtectedRoute>
                <AccountProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/addresses"
            element={
              <ProtectedRoute>
                <AddressesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />

          {/* ── Admin area ──────────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
