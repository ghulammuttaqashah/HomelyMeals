import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Header = ({ showSignOut = false }) => {
  const navigate = useNavigate()
  const { signout, isAuthenticated } = useAuth()

  const handleLogoClick = () => {
    if (isAuthenticated) {
      // If logged in, go to dashboard
      navigate('/dashboard')
    } else {
      // If not logged in, redirect to customer landing page
      const customerUrl = import.meta.env.VITE_CUSTOMER_URL || 'http://localhost:5173'
      window.location.href = customerUrl
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cook Portal</p>
          <h1 className="text-xl font-bold text-orange-600 cursor-pointer" onClick={handleLogoClick}>
            HomelyMeals
          </h1>
        </div>
        {showSignOut && (
          <button
            type="button"
            onClick={signout}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
