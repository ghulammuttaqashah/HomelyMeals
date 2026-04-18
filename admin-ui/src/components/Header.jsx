import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiMenu, FiX, FiChevronRight } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getOrders } from '../api/orders'

const Header = ({ showNav = true }) => {
  const { logout } = useAuth()
  const location = useLocation()
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
  }, [mobileMenuOpen])

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
    { label: 'Delivery Charges', path: '/delivery-charges' },
    { label: 'Complaints', path: '/complaints' },
    { label: 'Subscriptions', path: '/subscriptions' },
  ]

  return (
    <header className={`sticky top-0 z-50 w-full transition-all border-b ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-gray-200' : 'bg-white border-gray-100'}`}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo - Restored Original Style */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <img 
              src="/customer+admin.png" 
              alt="HomelyMeals Admin" 
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Panel</p>
              <h2 className="text-xl font-bold text-orange-600">HomelyMeals</h2>
            </div>
          </div>

          {/* Desktop Navigation - Restored Original Style */}
          {showNav && (
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'bg-orange-100 text-orange-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  {item.label}
                  {item.count > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
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

          {/* Mobile Menu Toggle */}
          {showNav && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Admin Mobile Side Drawer - Restored colors */}
      {showNav && (
        <div 
          className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ display: mobileMenuOpen ? 'block' : 'none' }}
        >
          <div 
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-200 opacity-100"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav 
            className="absolute right-0 top-0 h-full w-full max-w-[280px] bg-white shadow-xl transition-transform duration-200 ease-out translate-x-0"
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full bg-white p-4">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Admin Panel</p>
                  <h2 className="text-xl font-bold text-orange-600">Menu</h2>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full bg-gray-50 text-gray-400">
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <div className="flex items-center gap-2">
                        {item.count > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {item.count}
                          </span>
                        )}
                        <FiChevronRight className={`h-4 w-4 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} />
                      </div>
                    </NavLink>
                  )
                })}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  <FiChevronRight className="rotate-180 h-4 w-4" />
                  <span>Logout Admin</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
