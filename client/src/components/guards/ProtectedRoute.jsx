import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../store/store";

// Redirects to /login when the user is not authenticated.
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAppSelector((s) => s.auth);

  // While the session is being resolved, render nothing to avoid a
  // flash of protected content before the cookie is checked.
  if (loading && !user) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} />;

  return children;
};

export { ProtectedRoute };
