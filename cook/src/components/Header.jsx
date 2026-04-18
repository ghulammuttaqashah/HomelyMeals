import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { usePWA } from '../utils/usePWA'
import { getUnreadCount } from '../api/chat'
import { getSocket } from '../utils/socket'
import { FiMenu, FiX, FiChevronRight, FiBell } from 'react-icons/fi'

const Header = ({ showSignOut = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signout, isAuthenticated, cook } = useAuth()
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const hasActiveSubscription = Boolean(cook?.hasActiveSubscription)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
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
    if (!isAuthenticated) return

    const fetchUnread = async () => {
      if (location.pathname.startsWith('/chats')) return
      try {
        const res = await getUnreadCount()
        setUnreadChats(res.unreadCount || 0)
      } catch { }
    }
    fetchUnread()

    const socket = getSocket()
    const onNewMessage = () => {
      if (!location.pathname.startsWith('/chats')) {
        setUnreadChats(prev => prev + 1)
      }
    }
    socket.on('new_message', onNewMessage)
    return () => socket.off('new_message', onNewMessage)
  }, [isAuthenticated, location.pathname])

  useEffect(() => {
    if (location.pathname.startsWith('/chats')) {
      setUnreadChats(0)
    }
  }, [location.pathname])

  const handleLogoClick = () => {
    if (isAuthenticated) {
      const status = cook?.verificationStatus
      if (status === 'not_started') navigate('/upload-docs')
      else if (status === 'pending' || status === 'rejected') navigate('/status')
      else if (status === 'approved' || status === 'verified') navigate('/dashboard')
      else navigate('/status')
    } else {
      const customerUrl = import.meta.env.VITE_CUSTOMER_URL || 'http://localhost:5173'
      window.location.href = customerUrl
    }
  }

  const navLinks = [
    { path: '/dashboard', label: 'Home' },
    { path: '/sales', label: 'Sales' },
    { path: '/orders', label: 'Orders' },
    { path: '/menu', label: 'Menu' },
    { path: '/chats', label: 'Chats' },
    { path: '/reviews', label: 'Reviews' },
    { path: '/complaints', label: 'Complaints' },
    { path: '/payment-settings', label: 'Payments' },
    { path: '/subscription', label: 'Subscription' },
    { path: '/profile', label: 'Profile' },
  ]

  const isApproved = cook?.verificationStatus === 'approved' || cook?.verificationStatus === 'verified'

  const handleNavClick = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  const handleInstallApp = async () => {
    const success = await installApp()
    if (success) {
      toast.success('HomelyMeals installed! Open it from your home screen 📱', {
        duration: 5000,
        icon: '🎉',
      })
    }
  }

  return (
    <header className={`sticky top-0 z-50 w-full transition-all border-b ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-gray-200' : 'bg-white border-gray-100'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo - Restored Original Style */}
          <div className="flex-shrink-0 cursor-pointer flex items-center gap-2 sm:gap-3" onClick={handleLogoClick}>
            <img 
              src="/cook.png" 
              alt="HomelyMeals Cook" 
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-orange-600 leading-none">HomelyMeals</h1>
          </div>

          {/* Desktop Navigation - Original styling with improved spacing */}
          {showSignOut && isApproved && (
            <nav className="hidden lg:flex items-center justify-end gap-1 flex-1 px-4 overflow-x-auto">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path
                const isSub = link.path === '/subscription' && !hasActiveSubscription
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`relative flex items-center whitespace-nowrap px-3 py-2 rounded-lg text-[15px] font-medium transition-all ${
                      isActive
                        ? 'bg-orange-100 text-orange-700'
                        : isSub
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.path === '/chats' && unreadChats > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-sm">
                        {unreadChats > 9 ? '9+' : unreadChats}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {isInstallable && !isInstalled && (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-orange-600 hover:bg-orange-100 transition-colors flex-shrink-0"
              >
                <img src="/mobileapp.png" alt="Install" className="h-4 w-4" style={{ filter: 'invert(37%) sepia(98%) saturate(1800%) hue-rotate(11deg) brightness(94%) contrast(94%)' }} />
                <span className="text-xs font-semibold whitespace-nowrap">Install</span>
              </button>
            )}

            {showSignOut && (
              <>
                {/* Mobile Menu Toggle */}
                {isApproved && (
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={signout}
                  className="hidden lg:inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
                
                {/* Mobile Sign Out Icon */}
                <button
                  type="button"
                  onClick={signout}
                  className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  <FiMenu className="hidden" /> {/* Placeholder for consistency */}
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side Menu Overlay - Improved Responsiveness without over-designing */}
      {showSignOut && isApproved && (
        <div className={`fixed inset-0 z-[60] lg:hidden pointer-events-none ${mobileMenuOpen ? 'pointer-events-auto' : ''}`}>
          <div 
            className={`absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMobileMenuOpen(false)}
            style={{ touchAction: 'none' }}
          />
          <nav 
            className={`absolute right-0 top-0 h-full w-full max-w-[280px] bg-white shadow-xl transition-transform duration-200 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ touchAction: mobileMenuOpen ? 'auto' : 'none' }}
          >
            <div className="flex flex-col h-full bg-white p-4">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-orange-600">Menu</h2>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full bg-gray-50 text-gray-400">
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path
                  const isSub = link.path === '/subscription' && !hasActiveSubscription
                  return (
                    <button
                      key={link.path}
                      onClick={() => handleNavClick(link.path)}
                      className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                        isActive 
                          ? 'bg-orange-100 text-orange-700' 
                          : isSub
                            ? 'bg-amber-50 text-amber-700'
                            : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{link.label}</span>
                      <div className="flex items-center gap-2">
                        {link.path === '/chats' && unreadChats > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                            {unreadChats}
                          </span>
                        )}
                        <FiChevronRight className={`h-4 w-4 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} />
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">
                {isInstallable && !isInstalled && (
                  <button onClick={handleInstallApp} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm">
                    <img src="/mobileapp.png" alt="" className="h-5 w-5" style={{ filter: 'invert(37%) sepia(98%) saturate(1800%) hue-rotate(11deg) brightness(94%) contrast(94%)' }} />
                    <span>Install App</span>
                  </button>
                )}
                <button onClick={signout} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm">
                  <FiChevronRight className="rotate-180 h-4 w-4" />
                  <span>Logout Account</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Subscription Banner - Restored Original Logic but Cleaned up */}
      {showSignOut && isApproved && !hasActiveSubscription && (
        <div className="bg-amber-50 border-t border-amber-200 py-3 px-4">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <FiBell className="animate-bounce" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 leading-tight">Subscription required to open kitchen</p>
                <p className="text-xs text-amber-700">Activate a plan to start selling meals to customers.</p>
              </div>
            </div>
            <button
              onClick={() => handleNavClick('/subscription')}
              className="whitespace-nowrap rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-amber-700"
            >
              Choose Plan
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
