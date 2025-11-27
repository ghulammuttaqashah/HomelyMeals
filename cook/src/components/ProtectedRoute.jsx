import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate()
  const { cook, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const status = cook?.verificationStatus

    // Redirect based on verification status
    if (status === 'not_started') {
      navigate('/upload-docs', { replace: true })
    } else if (status === 'pending' || status === 'rejected') {
      navigate('/status', { replace: true })
    }
    // Only 'approved' or 'verified' status can access protected routes
  }, [isAuthenticated, cook, navigate])

  // Only render children if authenticated and approved/verified
  if (!isAuthenticated) {
    return null
  }

  const status = cook?.verificationStatus
  if (status === 'approved' || status === 'verified') {
    return children
  }

  return null
}

export default ProtectedRoute
