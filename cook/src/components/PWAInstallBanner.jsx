import { useState, useEffect } from 'react'
import { FiX, FiWifiOff, FiRefreshCw, FiShare } from 'react-icons/fi'
import { usePWA } from '../utils/usePWA'

/**
 * PWA Install Popup — shown once per session on first visit.
 * After dismiss, install option lives only in the Header button.
 */
const PWAInstallBanner = () => {
  const {
    isOnline,
    isInstallable,
    isInstalled,
    hasUpdate,
    isIOS,
    canShowIOSInstall,
    installApp,
    dismissIOSInstall,
    updateApp,
  } = usePWA()
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    if ((isInstallable || canShowIOSInstall) && !isInstalled) {
      const wasDismissed = sessionStorage.getItem('pwa-popup-dismissed')
      if (!wasDismissed) {
        const timer = setTimeout(() => setShowPopup(true), 1500)
        return () => clearTimeout(timer)
      }
    }
    if (isInstalled) setShowPopup(false)
  }, [isInstallable, isInstalled, canShowIOSInstall])

  const handleInstall = async () => {
    const installed = await installApp()
    if (installed) setShowPopup(false)
  }

  const handleDismiss = () => {
    setShowPopup(false)
    sessionStorage.setItem('pwa-popup-dismissed', 'true')
    if (isIOS) dismissIOSInstall()
  }

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 flex items-center gap-2 z-50 shadow-lg rounded-full">
        <FiWifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">You are offline</span>
      </div>
    )
  }

  // Update available
  if (hasUpdate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <FiRefreshCw className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Update Available</h3>
          <p className="text-gray-600 text-center text-sm mb-6">
            A new version of Homely Meals Cook is available.
          </p>
          <button onClick={updateApp} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Update Now
          </button>
        </div>
      </div>
    )
  }

  if (!showPopup) return null

  // iOS-specific instructions
  if (isIOS && canShowIOSInstall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
          <button onClick={handleDismiss} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
            <FiX className="h-5 w-5" />
          </button>

          <div className="flex justify-center mb-4">
            <img src="/cook.png" alt="HM Cook" className="h-28 w-28 object-contain" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 text-center mb-1">HM Cook</h3>
          <p className="text-gray-500 text-center text-xs mb-5">Add to your home screen</p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0"><span className="text-blue-600 font-bold">1</span></div>
              <span>Tap the <FiShare className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0"><span className="text-blue-600 font-bold">2</span></div>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0"><span className="text-blue-600 font-bold">3</span></div>
              <span>Tap <strong>"Add"</strong> to confirm</span>
            </div>
          </div>

          <button onClick={handleDismiss} className="w-full text-gray-400 py-2 text-sm font-medium hover:text-gray-600 transition-colors">
            Got it
          </button>
        </div>
      </div>
    )
  }

  // Chrome / Edge install popup
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        <button onClick={handleDismiss} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
          <FiX className="h-5 w-5" />
        </button>

        {/* App Icon */}
        <div className="flex justify-center mb-4">
          <img src="/cook.png" alt="HM Cook" className="h-28 w-28 object-contain" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 text-center mb-1">HM Cook</h3>
        <p className="text-gray-500 text-center text-xs mb-4">Manage your kitchen on the go</p>

        <div className="space-y-2.5 mb-6">
          {['Quick access from home screen', 'Works offline', 'Get instant order notifications'].map((text) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-gray-700">
              <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button onClick={handleInstall} className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
          <img src="/mobileapp.png" alt="" className="h-5 w-5 brightness-0 invert" />
          Install App
        </button>
        <button onClick={handleDismiss} className="w-full text-gray-400 py-2 text-sm font-medium hover:text-gray-600 transition-colors mt-2">
          Maybe Later
        </button>
      </div>
    </div>
  )
}

export default PWAInstallBanner
