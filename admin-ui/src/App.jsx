import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Otp from './pages/Otp'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Cooks from './pages/Cooks'
import CookStatus from './pages/CookStatus'
import CookVerification from './pages/CookVerification'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/otp" element={<Otp />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cooks"
            element={
              <ProtectedRoute>
                <Cooks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cooks/status"
            element={
              <ProtectedRoute>
                <CookStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cooks/verification"
            element={
              <ProtectedRoute>
                <CookVerification />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
