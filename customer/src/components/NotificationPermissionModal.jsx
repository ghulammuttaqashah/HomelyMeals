import { useState, useEffect, useCallback } from 'react'
import { FiBell } from 'react-icons/fi'
import { getPermissionState, requestAndSubscribe } from '../utils/push'
import { useAuth } from '../context/AuthContext'

const PERM_PROMPT_SHOWN_KEY = 'notification-permission-prompt-shown'

/**
 * Full-screen modal that asks users to enable notifications.
 * Shows once after login if permission hasn't been granted.
 * The "Enable" button is a direct user gesture → triggers browser prompt.
 */
const NotificationPermissionModal = () => {
  const { isAuthenticated } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return

    const { permission } = getPermissionState()

    // Already granted or unsupported — don't show
    if (permission === 'granted' || permission === 'unsupported') return

    // If permanently denied, don't show modal (the banner handles this)
    if (permission === 'denied') return

    // Only show once per session to avoid being annoying
    if (sessionStorage.getItem(PERM_PROMPT_SHOWN_KEY)) return

    // Show after a short delay so the page is loaded
    const timer = setTimeout(() => {
      setVisible(true)
      sessionStorage.setItem(PERM_PROMPT_SHOWN_KEY, 'true')
    }, 1500)

    return () => clearTimeout(timer)
  }, [isAuthenticated])

  const handleEnable = useCallback(async () => {
    // This is a DIRECT button click — clean user gesture
    await requestAndSubscribe()
    setVisible(false)
  }, [])

  const handleSkip = useCallback(() => {
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm animate-slide-up rounded-2xl bg-white p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
          <FiBell className="h-8 w-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
          Turn on Notifications
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-sm text-gray-600">
          Get instant alerts for order updates, new messages, and important activity. You won't miss a thing!
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleEnable}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:from-orange-600 hover:to-orange-700 active:scale-[0.98]"
          >
            Enable Notifications
          </button>
          <button
            onClick={handleSkip}
            className="w-full rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            Maybe Later
          </button>
        </div>

        {/* Note */}
        <p className="mt-4 text-center text-xs text-gray-400">
          You can change this anytime in your browser settings
        </p>
      </div>
    </div>
  )
}

export default NotificationPermissionModal
