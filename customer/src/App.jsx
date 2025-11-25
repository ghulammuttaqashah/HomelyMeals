// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthProvider } from "./contexts/AuthContext";
import { AuthContext } from "./contexts/AuthContext";

import ProtectedRoute from "./components/auth/ProtectedRoute";

import LoginPage from "./components/auth/LoginPage";
import SignupPage from "./components/auth/SignupPage";

import { LandingPage } from "./components/LandingPage";
import { CustomerDashboard } from "./components/customer/CustomerDashboard";
import { CustomerProfile } from "./components/customer/CustomerProfile";

import { Chatbot } from "./components/common/Chatbot";
import { SentimentAnalysis } from "./components/common/SentimentAnalysis";

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
  // ✅ FIX — now we can use user & logout here
  const { user, logout } = useContext(AuthContext);

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute>
            <CustomerDashboard user={user} onLogout={logout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer/profile"
        element={
          <ProtectedRoute>
            <CustomerProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chatbot"
        element={
          <ProtectedRoute>
            <Chatbot />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sentiment"
        element={
          <ProtectedRoute>
            <SentimentAnalysis />
          </ProtectedRoute>
        }
      />

      {/* DEFAULT ROUTES */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
