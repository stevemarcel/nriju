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

// Response interceptor — handle auth failures + global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
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