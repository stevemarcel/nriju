import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // send JWT cookie
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach access token if present
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// Endpoints that are safe to call without a session. A 401 on any of
// these is a normal "not logged in" response and must NOT bounce the
// user to the login page — that would lock them out of the storefront.
const PUBLIC_ENDPOINTS = [
  "/products",
  "/products/featured",
  "/categories",
  "/coupons/validate",
  "/reviews",
  "/settings",
  // Session bootstrap — expected to 401 when nobody is logged in.
  // The fetchMe thunk already clears state on rejection; it must not
  // bounce an anonymous visitor to the login page on app load.
  "/auth/me",
];

const isPublicEndpoint = (url = "") => PUBLIC_ENDPOINTS.some((path) => url.includes(path));

// Response interceptor — handle auth failures + global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && !isPublicEndpoint(error?.config?.url)) {
      // Let the auth slice / route guards handle redirect to login
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    } else if (status === 403) {
      toast.error("You do not have permission to do that.");
    } else if (status === 404) {
      toast.error("Resource not found. Please try again.");
    } else if (status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (status === 409) {
      toast.error(error?.response?.data?.message || "Conflict — item may be out of stock.");
    } else if (status === 422) {
      const msg = error?.response?.data?.message;
      toast.error(msg || "Please check your input and try again.");
    } else if (status === 429) {
      toast.error("Too many attempts. Please wait a moment.");
    } else if (error?.code === "ERR_NETWORK") {
      toast.error("Cannot connect to server. Make sure the backend is running on port 5000.");
    }

    return Promise.reject(error);
  },
);

export default api;
