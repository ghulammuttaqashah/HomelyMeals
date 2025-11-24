import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext, useMemo } from "react";

import { AuthProvider } from "./contexts/AuthContext";
import { AuthContext } from "./contexts/AuthContext";

import ProtectedRoute from "./components/auth/ProtectedRoute";

// pages
import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";
import DocumentUploadPage from "./components/cook/DocumentUploadPage";

import { CookDashboard } from "./components/cook/CookDashboard";
import { CookProfile } from "./components/cook/CookProfile";

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

function App() {
  const { user, logout } = useContext(AuthContext);
  const documentRouteElement = useMemo(
    () => (
      <ProtectedRoute>
        <DocumentUploadPage />
      </ProtectedRoute>
    ),
    []
  );

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/cook/login" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/cook/login" replace />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* PROTECTED */}
      <Route
        path="/cook/dashboard"
        element={
          <ProtectedRoute requireApproval>
            <CookDashboard user={user} onLogout={logout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cook/profile"
        element={
          <ProtectedRoute requireApproval>
            <CookProfile user={user} />
          </ProtectedRoute>
        }
      />

      {/* Document upload is PUBLIC (NOT logged in yet) */}
      <Route path="/cook/document-upload" element={documentRouteElement} />
      <Route path="/cook/documents" element={documentRouteElement} />

      {/* DEFAULT */}
      <Route path="/cook" element={<Navigate to="/cook/login" replace />} />
      <Route path="/" element={<Navigate to="/cook/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
