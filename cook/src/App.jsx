import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import PublicRoute from './components/PublicRoute'
import ProtectedRoute from './components/ProtectedRoute'
import PWAInstallBanner from './components/PWAInstallBanner'
import SocketListener from './components/SocketListener'
import NotificationBanner from './components/NotificationBanner'
import NotificationPermissionModal from './components/NotificationPermissionModal'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'
import UploadDocuments from './pages/UploadDocuments'
import ResubmitDocuments from './pages/ResubmitDocuments'
import Status from './pages/Status'
import Dashboard from './pages/Dashboard'
import MenuManagement from './pages/MenuManagement'
import AddMeal from './pages/AddMeal'
import Profile from './pages/Profile'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import Chats from './pages/Chats'
import Reviews from './pages/Reviews'
import SalesDashboard from './pages/SalesDashboard'
import Complaints from './pages/Complaints'
import FileComplaint from './pages/FileComplaint'
import Subscription from './pages/Subscription'
import PaymentSettings from './pages/PaymentSettings'
import NotFound from './pages/NotFound'


const App = () => {

  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketListener />
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route path="/upload-docs" element={<UploadDocuments />} />
          <Route path="/resubmit-documents" element={<ResubmitDocuments />} />
          <Route path="/status" element={<Status />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu"
            element={
              <ProtectedRoute>
                <MenuManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-meal"
            element={
              <ProtectedRoute>
                <AddMeal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
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
            path="/chats"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats/:customerId"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <Reviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <SalesDashboard />
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
            path="/file-complaint"
            element={
              <ProtectedRoute>
                <FileComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-settings"
            element={
              <ProtectedRoute>
                <PaymentSettings />
              </ProtectedRoute>
            }
          />
          
          {/* 404 Not Found */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 1500,
            success: {
              duration: 1500,
              style: {
                background: '#363636',
                color: '#fff',
              },
            },
            error: {
              duration: 1500,
              style: {
                background: '#363636',
                color: '#fff',
              },
            },
            loading: {
              style: {
                background: '#363636',
                color: '#fff',
              },
            },
          }}
        />
        <PWAInstallBanner />
        <NotificationBanner />
        <NotificationPermissionModal />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
