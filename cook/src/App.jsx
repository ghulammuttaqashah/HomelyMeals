import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyOtp from './pages/VerifyOtp'
import UploadDocuments from './pages/UploadDocuments'
import Status from './pages/Status'
import Dashboard from './pages/Dashboard'
import AddMeal from './pages/AddMeal'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/upload-docs" element={<UploadDocuments />} />
          <Route path="/status" element={<Status />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-meal" element={<AddMeal />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
