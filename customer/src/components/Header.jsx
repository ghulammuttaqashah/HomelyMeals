import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { setDefaultAddress } from '../api/auth'

const Header = ({ showButtons = true, showPortalText = true, onAddressChange }) => {
  const navigate = useNavigate()
  const { isAuthenticated, customer, signout, refreshCustomer } = useAuth()
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)

  const handleLogoClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/')
    }
  }

  // Get default address or first address
  const defaultAddress = customer?.addresses?.find((addr) => addr.isDefault) || customer?.addresses?.[0]

  const getShortAddress = (address) => {
    if (!address) return 'No address'
    const parts = [address.label, address.street, address.city].filter(Boolean)
    const full = parts.join(', ')
    return full.length > 30 ? full.substring(0, 30) + '...' : full
  }

  const handleSelectAddress = async (addressId) => {
    if (settingDefault) return
    
    // Find the address to check if it's already default
    const address = customer?.addresses?.find(a => a._id === addressId)
    if (address?.isDefault) {
      setShowAddressDropdown(false)
      return
    }

    try {
      setSettingDefault(true)
      await setDefaultAddress(addressId)
      await refreshCustomer()
      setShowAddressDropdown(false)
      toast.success('Delivery address changed')
      // Notify parent to refresh data
      if (onAddressChange) {
        onAddressChange()
      }
    } catch (error) {
      toast.error('Failed to change address')
      console.error('Set default address error:', error)
    } finally {
      setSettingDefault(false)
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-4">
          <div className="cursor-pointer" onClick={handleLogoClick}>
            {showPortalText && (
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Customer Portal</p>
            )}
            <h1 className="text-xl font-bold text-orange-600">HomelyMeals</h1>
          </div>

          {/* Address Display - Only for authenticated users */}
          {isAuthenticated && customer?.addresses?.length > 0 && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="max-w-[200px] truncate">{getShortAddress(defaultAddress)}</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Address Dropdown */}
              {showAddressDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAddressDropdown(false)} />
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                    <div className="px-3 pb-2 text-xs font-semibold uppercase text-gray-500">Select Delivery Address</div>
                    {customer.addresses.map((address) => (
                      <button
                        key={address._id}
                        onClick={() => handleSelectAddress(address._id)}
                        disabled={settingDefault}
                        className={`w-full text-left px-3 py-2 transition-colors ${
                          address.isDefault 
                            ? 'bg-orange-50 cursor-default' 
                            : 'hover:bg-gray-50 cursor-pointer'
                        } ${settingDefault ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{address.label}</span>
                          {address.isDefault && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {[address.houseNo, address.street, address.city].filter(Boolean).join(', ')}
                        </p>
                      </button>
                    ))}
                    <div className="mt-1 border-t border-gray-100 pt-2 px-3">
                      <button
                        onClick={() => {
                          setShowAddressDropdown(false)
                          navigate('/profile')
                        }}
                        className="flex w-full items-center justify-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Manage Addresses
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Mobile Address Button */}
              {customer?.addresses?.length > 0 && (
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 md:hidden"
                  title="Manage addresses"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="hidden font-medium sm:inline">{customer?.name || 'Profile'}</span>
              </button>
              <button
                type="button"
                onClick={signout}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <svg className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
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
