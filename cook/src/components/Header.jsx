import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Header = ({ showSignOut = false }) => {
  const navigate = useNavigate()
  const { signout, isAuthenticated, cook } = useAuth()

  const handleLogoClick = () => {
    if (isAuthenticated) {
      const status = cook?.verificationStatus
      // Redirect based on verification status
      if (status === 'not_started') {
        navigate('/upload-docs')
      } else if (status === 'pending' || status === 'rejected') {
        navigate('/status')
      } else if (status === 'approved' || status === 'verified') {
        navigate('/dashboard')
      } else {
        navigate('/status')
      }
    } else {
      // If not logged in, redirect to customer landing page
      const customerUrl = import.meta.env.VITE_CUSTOMER_URL || 'http://localhost:5173'
      window.location.href = customerUrl
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Cook Portal</p>
          <h1 className="text-lg sm:text-xl font-bold text-orange-600 cursor-pointer" onClick={handleLogoClick}>
            HomelyMeals
          </h1>
        </div>
        {showSignOut && (
          <button
            type="button"
            onClick={signout}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
