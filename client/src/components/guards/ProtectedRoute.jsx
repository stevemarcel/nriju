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
  // replace, not push: a pushed /login leaves the protected route behind in
  // history, so Back re-enters it and gets bounced forward again — a trap.
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

export default ProtectedRoute;
