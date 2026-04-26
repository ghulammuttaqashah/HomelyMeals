import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusCard from '../components/StatusCard'
import Loader from '../components/Loader'

const Status = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated, isLoading, signout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader size="lg" />
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to dashboard if already approved
  if (cook?.verificationStatus === 'approved') {
    return <Navigate to="/dashboard" replace />
  }

  // Redirect to upload docs if not started
  if (cook?.verificationStatus === 'not_started') {
    return <Navigate to="/upload-docs" replace />
  }

  const statusType = cook?.verificationStatus === 'rejected' ? 'rejected' : 'pending'

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    const loadingToast = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          <span>Signing out...</span>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      ),
      { duration: Infinity }
    )
    try {
      await signout()
      toast.success('Signed out successfully', { id: loadingToast, duration: 1500 })
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error('Failed to sign out', { id: loadingToast, duration: 1500 })
      setSigningOut(false)
    }
  }

  const handleResubmit = () => {
    navigate('/upload-docs')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
        <div className="w-full max-w-2xl">
          <StatusCard 
            type={statusType}
            onSignOut={handleSignOut}
            signingOut={signingOut}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Status
