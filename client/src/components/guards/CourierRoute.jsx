import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/store";

const CourierRoute = ({ children }) => {
  const { user, loading } = useAppSelector((state) => state.auth);
  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "courier") return <Navigate to="/" replace />;
  return children;
};

export default CourierRoute;
