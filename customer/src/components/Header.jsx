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

  const { itemCount } = getCartTotals()

  // Fetch unread count on mount and listen for new messages
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
      if (!location.pathname.startsWith('/chats')) setUnreadChats(prev => prev + 1)
    }
    socket.on('new_message', onNewMessage)
    return () => socket.off('new_message', onNewMessage)
  }, [isAuthenticated, location.pathname])

  // Reset unread when on chats page
  useEffect(() => {
    if (location.pathname.startsWith('/chats')) setUnreadChats(0)
  }, [location.pathname])

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false)
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
    return full.length > 28 ? full.substring(0, 28) + '...' : full
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

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5">

        {/* ── Left: Logo + Address ── */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="cursor-pointer" onClick={handleLogoClick}>
            {showPortalText && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 leading-none mb-0.5">Customer Portal</p>
            )}
            <h1 className="text-lg font-bold text-orange-600 leading-none">HomelyMeals</h1>
          </div>

          {/* Address pill — desktop only */}
          {isAuthenticated && customer?.addresses?.length > 0 && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FiMapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="max-w-[180px] truncate">{getShortAddress(defaultAddress)}</span>
                <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAddressDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAddressDropdown(false)} />
                  <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold uppercase text-gray-500">Select Delivery Address</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {sortedAddresses.map((address) => (
                        <button key={address._id} onClick={() => handleSelectAddress(address._id)} disabled={settingDefault}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${address.isDefault ? 'bg-orange-50' : 'hover:bg-gray-50'} ${settingDefault ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{address.label}</span>
                              {address.isDefault && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">Active</span>}
                            </div>
                            {address.isDefault && (
                              <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{[address.houseNo, address.street].filter(Boolean).join(', ')}</p>
                          <p className="text-xs text-gray-400">{[address.city, address.postalCode].filter(Boolean).join(' - ')}</p>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      <button onClick={() => { setShowAddressDropdown(false); navigate('/profile') }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add / Manage Addresses
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Desktop nav ── */}
        <div className="hidden md:flex items-center gap-1.5">
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
                <span className="hidden lg:inline font-medium truncate max-w-[100px]">{customer?.name || 'Profile'}</span>
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

        {/* ── Mobile: always-visible icons + hamburger ── */}
        <div className="flex md:hidden items-center gap-1.5">
          {/* Install App — always visible on mobile too */}
          {isInstallable && !isInstalled && (
            <button type="button" onClick={handleInstallApp}
              className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-orange-600 hover:bg-orange-100 transition-colors">
              <FiDownload className="h-4 w-4" />
              <span className="text-xs font-semibold">Install</span>
            </button>
          )}

          {isAuthenticated && (
            <>
              {/* Cart — always visible */}
              <button type="button" onClick={() => navigate('/cart')}
                className="relative flex items-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition-colors">
                <FiShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Chats — always visible */}
              <button type="button" onClick={() => navigate('/chats')}
                className="relative flex items-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition-colors">
                <FiMessageCircle className="h-5 w-5" />
                {unreadChats > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Hamburger */}
          <button type="button" onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition-colors">
            {showMobileMenu ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-[53px] right-0 bottom-0 w-72 bg-white shadow-2xl z-50 md:hidden overflow-y-auto">
            <div className="p-4 space-y-1">

              {isAuthenticated ? (
                <>
                  {/* User info */}
                  <div className="px-3 py-3 mb-2 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm font-semibold text-gray-900">{customer?.name || 'Customer'}</p>
                    <p className="text-xs text-gray-500 truncate">{customer?.email}</p>
                  </div>

                  {/* Address selector */}
                  {customer?.addresses?.length > 0 && (
                    <div className="pb-2 mb-1 border-b border-gray-100">
                      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Delivery Address</p>
                      {sortedAddresses.map(address => (
                        <button key={address._id} onClick={() => handleSelectAddress(address._id)} disabled={settingDefault}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${address.isDefault ? 'bg-orange-50' : 'hover:bg-gray-50'} ${settingDefault ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-2">
                            <FiMapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-800">{address.label}</span>
                            {address.isDefault && <span className="ml-auto text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Active</span>}
                          </div>
                          <p className="text-xs text-gray-500 ml-6 truncate">{address.street}, {address.city}</p>
                        </button>
                      ))}
                      <button onClick={() => { navigate('/profile'); setShowMobileMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-orange-600 font-medium hover:bg-orange-50 rounded-lg transition-colors">
                        + Add / Manage Addresses
                      </button>
                    </div>
                  )}

                  {/* Nav links */}
                  {[
                    { icon: FiPackage, label: 'Orders', path: '/orders' },
                    { icon: FiAlertTriangle, label: 'Complaints', path: '/complaints' },
                    { icon: FiUser, label: 'Profile', path: '/profile' },
                  ].map(({ icon: Icon, label, path }) => (
                    <button key={path} onClick={() => { navigate(path); setShowMobileMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                      <Icon className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}

                  <div className="pt-2 mt-1 border-t border-gray-100">
                    <button onClick={() => { signout(); setShowMobileMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                      <FiLogOut className="h-5 w-5" />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                </>
              ) : showButtons ? (
                <div className="space-y-2 pt-2">
                  <button onClick={() => { navigate('/login'); setShowMobileMenu(false) }}
                    className="w-full px-4 py-2.5 rounded-lg border border-orange-600 text-orange-600 font-medium text-sm hover:bg-orange-50 transition-colors">
                    Join as Customer
                  </button>
                  <button onClick={() => { window.location.href = import.meta.env.VITE_COOK_URL || 'http://localhost:5174' }}
                    className="w-full px-4 py-2.5 rounded-lg bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 transition-colors">
                    Join as Cook
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </header>
  )
}

export default Header
