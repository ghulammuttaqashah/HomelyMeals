import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePWA } from '../utils/usePWA'
import { getUnreadCount } from '../api/chat'
import { getSocket } from '../utils/socket'

const Header = ({ showSignOut = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signout, isAuthenticated, cook } = useAuth()
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)

  // Fetch unread count on mount and listen for new messages
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchUnread = async () => {
      // Skip fetch if on chats page — messages are being read, badge resets to 0
      if (location.pathname.startsWith('/chats')) return
      try {
        const res = await getUnreadCount()
        setUnreadChats(res.unreadCount || 0)
      } catch { }
    }
    fetchUnread()

    const socket = getSocket()
    const onNewMessage = () => {
      // If not on chats page, increment badge
      if (!location.pathname.startsWith('/chats')) {
        setUnreadChats(prev => prev + 1)
      }
    }
    socket.on('new_message', onNewMessage)
    return () => socket.off('new_message', onNewMessage)
  }, [isAuthenticated, location.pathname])

  // Reset unread when navigating to chats
  useEffect(() => {
    if (location.pathname.startsWith('/chats')) {
      setUnreadChats(0)
    }
  }, [location.pathname])

  const handleLogoClick = () => {
    if (isAuthenticated) {
      const status = cook?.verificationStatus
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
      const customerUrl = import.meta.env.VITE_CUSTOMER_URL || 'http://localhost:5173'
      window.location.href = customerUrl
    }
  }

  const navLinks = [
    { path: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/sales', label: 'Sales', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { path: '/chats', label: 'Chats', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { path: '/menu', label: 'Menu', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { path: '/reviews', label: 'Reviews', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { path: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ]

  const isApproved = cook?.verificationStatus === 'approved' || cook?.verificationStatus === 'verified'

  const handleNavClick = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer" onClick={handleLogoClick}>
            <h1 className="text-xl sm:text-2xl font-bold text-orange-600">HomelyMeals</h1>
            <p className="text-[9px] sm:text-[10px] font-medium text-gray-500 -mt-1">Cook Portal</p>
          </div>

          {/* Desktop Navigation + Sign Out */}
          <div className="flex items-center gap-2">
            {/* PWA Install Button - Always visible when installable */}
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
                title="Install App"
              >
                <img src="/mobileapp.png" alt="" className="h-5 w-5" style={{ filter: 'invert(37%) sepia(98%) saturate(1800%) hue-rotate(11deg) brightness(94%) contrast(94%)' }} />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}

            {showSignOut && (
              <>
                {/* Desktop Nav Links */}
                {isApproved && (
                  <nav className="hidden lg:flex items-center gap-1 mr-2">
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.path
                      return (
                        <button
                          key={link.path}
                          onClick={() => handleNavClick(link.path)}
                          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                            ? 'bg-orange-100 text-orange-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                          </svg>
                          <span>{link.label}</span>
                          {link.path === '/chats' && unreadChats > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                              {unreadChats > 9 ? '9+' : unreadChats}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </nav>
                )}

                {/* Mobile Menu Button */}
                {isApproved && (
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    aria-expanded={mobileMenuOpen}
                  >
                    <span className="sr-only">Open menu</span>
                    {mobileMenuOpen ? (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={signout}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
                {/* Mobile Sign Out - Icon only */}
                <button
                  type="button"
                  onClick={signout}
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  title="Sign Out"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showSignOut && isApproved && mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                  </svg>
                  <span>{link.label}</span>
                  {link.path === '/chats' && unreadChats > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                      {unreadChats > 9 ? '9+' : unreadChats}
                    </span>
                  )}
                </button>
              )
            })}
            {/* Mobile Sign Out in menu */}
            <button
              onClick={signout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all mt-2 border-t border-gray-100 pt-3"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
            {/* Mobile Install App Button */}
            {isInstallable && !isInstalled && (
              <button
                onClick={installApp}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 transition-all"
              >
                <img src="/mobileapp.png" alt="" className="h-5 w-5" style={{ filter: 'invert(37%) sepia(98%) saturate(1800%) hue-rotate(11deg) brightness(94%) contrast(94%)' }} />
                <span>Install App</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
