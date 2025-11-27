import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Header = ({ showButtons = true, showPortalText = true }) => {
  const navigate = useNavigate()
  const { isAuthenticated, customer, signout } = useAuth()

  const handleLogoClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/')
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <div className="cursor-pointer" onClick={handleLogoClick}>
          {showPortalText && (
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Customer Portal</p>
          )}
          <h1 className="text-xl font-bold text-orange-600">HomelyMeals</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{customer?.name || 'Customer'}</span>
              </span>
              <button
                type="button"
                onClick={signout}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : showButtons ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-lg border border-orange-600 bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm hover:bg-orange-50 transition-colors"
              >
                Join as Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  const cookUrl = import.meta.env.VITE_COOK_URL || 'http://localhost:5174'
                  window.location.href = cookUrl
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
              >
                Join as Cook
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Header
