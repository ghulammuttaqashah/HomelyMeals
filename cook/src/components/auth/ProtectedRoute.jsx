import { Navigate, useLocation } from "react-router-dom";
import {
  normalizeVerificationStatus,
  useAuth,
} from "../../contexts/AuthContext";

const DOCUMENT_ROUTE = "/cook/documents";

export default function ProtectedRoute({ children, requireApproval = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/cook/login" replace state={{ from: location.pathname }} />
    );
  }

  const verificationStatus = normalizeVerificationStatus(
    user.verificationStatus ?? user.verificationStatusNormalized
  );

  if (requireApproval && verificationStatus !== "approved") {
    // Prevent access to dashboard/profile until documents are approved.
    return <Navigate to={DOCUMENT_ROUTE} replace />;
  }

  return children;
}
