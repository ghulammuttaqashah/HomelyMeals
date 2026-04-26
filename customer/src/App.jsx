import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import PublicRoute from './components/PublicRoute'
import ProtectedRoute from './components/ProtectedRoute'
import PWAInstallBanner from './components/PWAInstallBanner'
import SocketListener from './components/SocketListener'
import NotificationBanner from './components/NotificationBanner'
import NotificationPermissionModal from './components/NotificationPermissionModal'
import ChatbotFinal from './components/ChatbotFinal'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import CookMeals from './pages/CookMeals'
import Profile from './pages/Profile'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import Chats from './pages/Chats'
import Complaints from './pages/Complaints'
import FileComplaint from './pages/FileComplaint'
import NotFound from './pages/NotFound'
import PushTest from './pages/PushTest'


const App = () => {

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SocketListener />
          <Routes>
            <Route path="/" element={<Landing />} />
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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cook/:cookId"
              element={
                <ProtectedRoute>
                  <CookMeals />
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
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
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
              path="/orders/:id"
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
              path="/chats/:cookId"
              element={
                <ProtectedRoute>
                  <Chats />
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
              path="/push-test"
              element={
                <ProtectedRoute>
                  <PushTest />
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
          
          {/* Final Chatbot - Guided Buttons + AI Search */}
          <ChatbotFinal />
          
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
