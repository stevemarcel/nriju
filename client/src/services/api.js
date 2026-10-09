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
    } else if (status >= 500) {
      toast.error("Something went wrong. Please try again.");
    } else if (status === 409) {
      toast.error(error?.response?.data?.message || "Conflict — item may be out of stock.");
    } else if (status === 429) {
      toast.error("Too many attempts. Please wait a moment.");
    }

    return Promise.reject(error);
  },
);

export default api;