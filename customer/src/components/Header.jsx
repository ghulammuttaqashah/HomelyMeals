import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { setDefaultAddress } from '../api/auth'
import { getUnreadCount } from '../api/chat'
import { getSocket } from '../utils/socket'
import {
  FiShoppingCart, FiPackage, FiMessageCircle, FiAlertTriangle,
  FiMenu, FiX, FiUser, FiLogOut, FiMapPin, FiDownload
} from 'react-icons/fi'
import { usePWA } from '../utils/usePWA'

const Header = ({ showButtons = true, showPortalText = true, onAddressChange }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, customer, signout, refreshCustomer } = useAuth()
  const { getCartTotals } = useCart()
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  const { itemCount } = getCartTotals()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (showMobileMenu) {
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
  }, [showMobileMenu])

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchUnread = async () => {
      try {
        const res = await getUnreadCount()
        setUnreadChats(res.unreadCount || 0)
      } catch { }
    }
    fetchUnread()

    const socket = getSocket()
    const onNewMessage = () => {
      // Regardless of where you are, if a message arrives, we should just fetch the precise count
      fetchUnread()
    }
    
    // Add custom event listener for when a chat is actually read inside the Chats component
    const onChatRead = () => {
      fetchUnread()
    }

    socket.on('new_message', onNewMessage)
    window.addEventListener('unread_cleared', onChatRead)
    
    return () => {
      socket.off('new_message', onNewMessage)
      window.removeEventListener('unread_cleared', onChatRead)
    }
  }, [isAuthenticated, location.pathname])

  useEffect(() => {
    setShowMobileMenu(false)
    setShowAddressDropdown(false)
  }, [location.pathname])

  const handleLogoClick = () => navigate(isAuthenticated ? '/dashboard' : '/')

  const handleInstallApp = async () => {
    const success = await installApp()
    if (success) {
      toast.success('HomelyMeals installed! Open it from your home screen 📱', {
        duration: 5000,
        icon: '🎉',
      })
    }
  }

  const defaultAddress = customer?.addresses?.find(a => a.isDefault) || customer?.addresses?.[0]
  const sortedAddresses = customer?.addresses?.slice().sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0)) || []

  const getShortAddress = (address) => {
    if (!address) return 'No address'
    const parts = [address.label, address.street, address.city].filter(Boolean)
    const full = parts.join(', ')
    return full.length > 25 ? full.substring(0, 25) + '...' : full
  }

  const handleSelectAddress = async (addressId) => {
    if (settingDefault) return
    const address = customer?.addresses?.find(a => a._id === addressId)
    if (address?.isDefault) { setShowAddressDropdown(false); return }
    try {
      setSettingDefault(true)
      await setDefaultAddress(addressId)
      await refreshCustomer()
      setShowAddressDropdown(false)
      setShowMobileMenu(false)
      toast.success('Delivery address changed')
      if (onAddressChange) onAddressChange()
    } catch {
      toast.error('Failed to change address')
    } finally {
      setSettingDefault(false)
    }
  }

  // Shared address dropdown content
  const AddressDropdown = () => (
    <div className="absolute left-0 top-full z-50 mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <p className="text-xs font-semibold uppercase text-gray-500">Select Delivery Address</p>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {sortedAddresses.map((address) => (
          <button
            key={address._id}
            onClick={() => handleSelectAddress(address._id)}
            disabled={settingDefault}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors
              ${address.isDefault ? 'bg-orange-50' : 'hover:bg-gray-50'}
              ${settingDefault ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-base">{address.label || address.type || 'Address'}</span>
                  {address.isDefault && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white flex-shrink-0">Active</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{[address.houseNo, address.street].filter(Boolean).join(', ')}</p>
                <p className="text-sm text-gray-500">{[address.city, address.postalCode].filter(Boolean).join(' - ')}</p>
              </div>
              {address.isDefault && (
                <svg className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <button
          onClick={() => { setShowAddressDropdown(false); navigate('/profile') }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add / Manage Addresses
        </button>
      </div>
    </div>
  )

  return (
    <header className={`sticky top-0 z-40 w-full transition-all border-b ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-gray-200' : 'bg-white border-gray-100'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 gap-2">

        {/* ── Left: Logo + Address dropdown ── */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {/* Logo */}
          <div className="cursor-pointer flex-shrink-0 flex items-center gap-1.5" onClick={handleLogoClick}>
            <img 
              src="/customer+admin.png" 
              alt="HomelyMeals" 
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-orange-600 leading-none">HomelyMeals</h1>
          </div>

          {/* Address pill — visible on desktop only */}
          {isAuthenticated && customer?.addresses?.length > 0 && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FiMapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-medium">
                  {defaultAddress?.label || 'Address'}
                </span>
                <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAddressDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddressDropdown(false)} />
                  <AddressDropdown />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Desktop nav (md+) ── */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          {/* Install App */}
          {isInstallable && !isInstalled && (
            <button type="button" onClick={handleInstallApp}
              className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition-colors">
              <FiDownload className="h-4 w-4" />
              Install App
            </button>
          )}

          {isAuthenticated ? (
            <>
              <button type="button" onClick={() => navigate('/chats')}
                className="relative flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <FiMessageCircle className="h-4 w-4" />
                <span className="hidden lg:inline font-medium">Chats</span>
                {unreadChats > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                )}
              </button>

              <button type="button" onClick={() => navigate('/orders')}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <FiPackage className="h-4 w-4" />
                <span className="hidden lg:inline font-medium">Orders</span>
              </button>

              <button type="button" onClick={() => navigate('/complaints')}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <FiAlertTriangle className="h-4 w-4" />
                <span className="hidden lg:inline font-medium">Complaints</span>
              </button>

              <button type="button" onClick={() => navigate('/cart')}
                className="relative flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <FiShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              <button type="button" onClick={() => navigate('/profile')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <FiUser className="h-4 w-4" />
                <span className="hidden lg:inline font-medium truncate max-w-[90px]">{customer?.name || 'Profile'}</span>
              </button>

              <button type="button" onClick={signout}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Sign Out
              </button>
            </>
          ) : showButtons ? (
            <>
              <button type="button" onClick={() => navigate('/login')}
                className="rounded-lg border border-orange-600 bg-white px-4 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors">
                Join as Customer
              </button>
              <button type="button" onClick={() => { window.location.href = import.meta.env.VITE_COOK_URL || 'http://localhost:5174' }}
                className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors">
                Join as Cook
              </button>
            </>
          ) : null}
        </div>

        {/* ── Mobile right side (< md) ── */}
        <div className="flex md:hidden items-center gap-1.5 flex-shrink-0">
          {/* Install App — always visible */}
          {isInstallable && !isInstalled && (
            <button type="button" onClick={handleInstallApp}
              className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-orange-600 hover:bg-orange-100 transition-colors">
              <FiDownload className="h-4 w-4" />
              <span className="text-xs font-semibold">Install</span>
            </button>
          )}

          {/* Hamburger */}
          <button type="button" onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition-colors">
            {showMobileMenu ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      <div 
        className={`fixed inset-0 z-[60] md:hidden ${showMobileMenu ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ display: showMobileMenu ? 'block' : 'none' }}
      >
        <div 
          className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-200 opacity-100"
          onClick={() => setShowMobileMenu(false)}
        />
        <nav 
          className="absolute right-0 top-0 h-full w-full max-w-[280px] bg-white shadow-xl transition-transform duration-200 ease-out translate-x-0"
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-orange-600">Menu</h2>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-full bg-gray-50 text-gray-400">
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {isAuthenticated ? (
                <>
                  {/* User info */}
                  <div className="px-3 py-2.5 mb-3 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm font-semibold text-gray-900">{customer?.name || 'Customer'}</p>
                    <p className="text-xs text-gray-500 truncate">{customer?.email}</p>
                  </div>

                  {/* Address Selector in Mobile Menu */}
                  {customer?.addresses?.length > 0 && (
                    <div className="mb-3 px-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Delivery Address</p>
                      <div className="relative">
                        <button
                          onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                          className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FiMapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{defaultAddress?.label || 'Select Address'}</span>
                          </div>
                          <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showAddressDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowAddressDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
                              <div className="max-h-48 overflow-y-auto">
                                {sortedAddresses.map((address) => (
                                  <button
                                    key={address._id}
                                    onClick={() => handleSelectAddress(address._id)}
                                    disabled={settingDefault}
                                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors
                                      ${address.isDefault ? 'bg-orange-50' : 'hover:bg-gray-50'}
                                      ${settingDefault ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="font-semibold text-gray-900 text-sm">{address.label}</span>
                                          {address.isDefault && (
                                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white flex-shrink-0">Active</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">{[address.houseNo, address.street].filter(Boolean).join(', ')}</p>
                                        <p className="text-xs text-gray-400">{[address.city, address.postalCode].filter(Boolean).join(' - ')}</p>
                                      </div>
                                      {address.isDefault && (
                                        <svg className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="border-t border-gray-200 p-2 bg-gray-50">
                                <button
                                  onClick={() => { setShowAddressDropdown(false); navigate('/profile'); setShowMobileMenu(false) }}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700 transition-colors"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Manage Addresses
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nav links */}
                  <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                    {[
                      { icon: FiShoppingCart, label: 'Cart', path: '/cart', badge: itemCount },
                      { icon: FiMessageCircle, label: 'Chats', path: '/chats', badge: unreadChats },
                      { icon: FiPackage, label: 'Orders', path: '/orders' },
                      { icon: FiAlertTriangle, label: 'Complaints', path: '/complaints' },
                      { icon: FiUser, label: 'Profile', path: '/profile' },
                    ].map(({ icon: Icon, label, path, badge }) => {
                      const isActive = location.pathname === path
                      return (
                        <button key={path} onClick={() => { navigate(path); setShowMobileMenu(false) }}
                          className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                            isActive ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'
                          }`}>
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {badge > 0 && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                                {badge > 9 ? '9+' : badge}
                              </span>
                            )}
                            <svg className={`h-4 w-4 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">
                    {isInstallable && !isInstalled && (
                      <button onClick={() => { handleInstallApp(); setShowMobileMenu(false) }}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm">
                        <FiDownload className="h-5 w-5" />
                        <span>Install App</span>
                      </button>
                    )}
                    <button onClick={() => { signout(); setShowMobileMenu(false) }}
                      className="flex w-full items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm">
                      <FiLogOut className="h-5 w-5" />
                      <span>Logout Account</span>
                    </button>
                  </div>
                </>
              ) : showButtons ? (
                <div className="space-y-3 pt-2">
                  <button onClick={() => { navigate('/login'); setShowMobileMenu(false) }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-600 text-orange-600 font-bold text-sm hover:bg-orange-50 transition-colors">
                    Join as Customer
                  </button>
                  <button onClick={() => { window.location.href = import.meta.env.VITE_COOK_URL || 'http://localhost:5174' }}
                    className="w-full px-4 py-3 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 transition-colors">
                    Join as Cook
                  </button>
                </div>
              ) : null}
            </div>
          </nav>
        </div>
    </header>
  )
}

export default Header
