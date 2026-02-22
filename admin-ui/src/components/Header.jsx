import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { FiMenu, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getOrders } from '../api/orders'

const Header = ({ showNav = true }) => {
  const { logout } = useAuth()
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const ordersRes = await getOrders({ status: 'delivery_pending_confirmation' })
        setPendingOrdersCount(ordersRes.data?.orders?.length || 0)
      } catch (error) {
        console.error('Failed to fetch counts:', error)
      }
    }

    if (showNav) {
      fetchCounts()
      const interval = setInterval(fetchCounts, 30000)
      return () => clearInterval(interval)
    }
  }, [showNav])

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Customers', path: '/customers' },
    { label: 'Cooks', path: '/cooks' },
    { label: 'Orders', path: '/orders', count: pendingOrdersCount },
  ]

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Panel</p>
          <h1 className="text-xl font-bold text-orange-600">HomelyMeals Admin</h1>
        </div>

        {/* Desktop Navigation */}
        {showNav && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors',
                    isActive
                      ? 'bg-orange-100 text-orange-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100',
                  ].join(' ')
                }
              >
                {item.label}
                {item.count > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {item.count > 9 ? '9+' : item.count}
                  </span>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="ml-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </nav>
        )}

        {/* Mobile Menu Button */}
        {showNav && (
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && showNav && (
        <nav className="md:hidden border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-between transition-colors',
                    isActive
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-100',
                  ].join(' ')
                }
              >
                {item.label}
                {item.count > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {item.count > 9 ? '9+' : item.count}
                  </span>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                logout()
              }}
              className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}

export default Header

