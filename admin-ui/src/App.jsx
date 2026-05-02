import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Otp from './pages/Otp'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Cooks from './pages/cooks'
import CookStatus from './pages/cooks/status'
import CookVerification from './pages/cooks/verification'
import CookDocumentViewer from './pages/cooks/verification/ViewDocuments'
import DeliveryChargesSettings from './pages/DeliveryChargesSettings'
import Complaints from './pages/Complaints'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import Subscriptions from './pages/subscriptions'
import SubscriptionRevenue from './pages/subscriptions/revenue'
import SubscriptionPlans from './pages/subscriptions/plans'
import ActiveSubscriptions from './pages/subscriptions/active'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
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
          <Route
            path="/cooks/verification/:cookId"
            element={
              <ProtectedRoute>
                <CookDocumentViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-charges"
            element={
              <ProtectedRoute>
                <DeliveryChargesSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <Complaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <Subscriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions/revenue"
            element={
              <ProtectedRoute>
                <SubscriptionRevenue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions/plans"
            element={
              <ProtectedRoute>
                <SubscriptionPlans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions/active"
            element={
              <ProtectedRoute>
                <ActiveSubscriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          
          {/* 404 Not Found */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
