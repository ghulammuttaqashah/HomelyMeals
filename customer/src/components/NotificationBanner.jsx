import { useState, useEffect } from 'react'
import { FiBell, FiBellOff, FiX } from 'react-icons/fi'
import { getPermissionState, subscribeUserToPush } from '../utils/push'
import { useAuth } from '../context/AuthContext'

const BANNER_DISMISS_KEY = 'notification-banner-dismissed-until'

/**
 * Shows a gentle banner prompting users to enable push notifications.
 * Only shows when:
 *   - User is authenticated
 *   - Permission is 'default' (not yet decided) or 'denied' (need to go to settings)
 *   - Banner hasn't been recently dismissed
 */
const NotificationBanner = () => {
  const { isAuthenticated } = useAuth()
  const [visible, setVisible] = useState(false)
  const [permState, setPermState] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false)
      return
    }

    const state = getPermissionState()
    setPermState(state)

    // Already granted — no banner needed
    if (state.permission === 'granted' || state.permission === 'unsupported') {
      setVisible(false)
      return
    }

    // Check if dismissed recently
    const dismissedUntil = parseInt(localStorage.getItem(BANNER_DISMISS_KEY) || '0', 10)
    if (Date.now() < dismissedUntil) {
      setVisible(false)
      return
    }

    // Show the banner after a short delay so it doesn't feel intrusive on page load
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [isAuthenticated])

  const handleEnable = async () => {
    const granted = await subscribeUserToPush(true)
    if (granted !== undefined) {
      // Refresh state
      const newState = getPermissionState()
      setPermState(newState)
      if (newState.permission === 'granted') {
        setVisible(false)
      }
    }
  }

  const handleDismiss = () => {
    // Dismiss for 3 days
    localStorage.setItem(BANNER_DISMISS_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000))
    setVisible(false)
  }

  if (!visible) return null

  const isDenied = permState?.permission === 'denied'

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-full bg-white/20 p-2">
            {isDenied ? (
              <FiBellOff className="h-5 w-5 text-white" />
            ) : (
              <FiBell className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {isDenied ? 'Notifications Blocked' : 'Enable Notifications'}
            </p>
            <p className="mt-1 text-xs text-orange-100">
              {isDenied
                ? 'Notifications are blocked. Open browser settings to enable them for order updates.'
                : "Get instant updates on your orders, messages, and more!"}
            </p>
            {!isDenied && (
              <button
                onClick={handleEnable}
                className="mt-2 rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-orange-600 shadow-sm transition-transform active:scale-95"
              >
                Enable Now
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationBanner
