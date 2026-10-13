import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/store";

// Allows only admin / superAdmin roles. Falls back to the home page
// for customers or unauthenticated users.
const AdminRoute = ({ children }) => {
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user && (user.role === "admin" || user.role === "superAdmin");

  if (!isAdmin) return <Navigate to="/" />;

  return children;
};

export default AdminRoute;
