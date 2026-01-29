import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

/**
 * PublicRoute - Redirects authenticated users away from public pages (login, signup, etc.)
 * Use this for pages that should only be accessible to non-authenticated users
 */
const PublicRoute = ({ children }) => {
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

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  // Not authenticated, show the public page
  return children
}

export default PublicRoute
