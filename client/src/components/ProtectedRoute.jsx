import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, admin = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={admin ? "/admin/login" : "/login"} replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
