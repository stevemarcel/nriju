import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/store";

const AdminRoute = ({ children }) => {
  // * Authenticated user from the auth slice
  const { user } = useAppSelector((s) => s.auth);

  // * True only when the user has an admin or superAdmin role
  const isAdmin = user && (user.role === "admin" || user.role === "superAdmin");

  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default AdminRoute;
