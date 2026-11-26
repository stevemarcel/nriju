import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/store";

const CourierRoute = ({ children }) => {
  const { user, loading } = useAppSelector((state) => state.auth);
  if (loading && !user) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "courier") return <Navigate to="/" replace />;
  return children;
};

export default CourierRoute;
