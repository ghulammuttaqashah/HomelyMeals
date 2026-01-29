import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

/**
 * ProtectedRoute - Redirects non-authenticated users to login page
 * Use this for pages that require authentication
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-center">
          <Loader size="lg" />
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated, show protected content
  return children
}

export default ProtectedRoute
