import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { cook } = useAuth();

  // If no cook is logged in → redirect to login page
  if (!cook) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
