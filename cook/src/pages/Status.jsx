import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusCard from '../components/StatusCard'

const Status = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const statusType = cook?.verificationStatus === 'rejected' ? 'rejected' : 'pending'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <StatusCard 
            type={statusType}
            onBackToLogin={() => navigate('/login')}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Status
