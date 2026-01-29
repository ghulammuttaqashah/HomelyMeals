import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusCard from '../components/StatusCard'
import Loader from '../components/Loader'

const Status = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated, isLoading, signout } = useAuth()

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
    await signout()
    navigate('/login', { replace: true })
  }

  const handleResubmit = () => {
    navigate('/upload-docs')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <StatusCard 
            type={statusType}
            onSignOut={handleSignOut}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Status
