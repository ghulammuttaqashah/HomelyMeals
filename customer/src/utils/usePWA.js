import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for PWA functionality
 * Handles install prompt, online/offline status, and app updates
 */
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true
    
    if (isStandalone) {
      setIsInstalled(true)
      return // No need to set up install listeners if already installed
    }

    // Check if the beforeinstallprompt was captured globally before React mounted
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt)
      setIsInstallable(true)
    }

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Handle install prompt (Chrome, Edge, etc.)
    // This catches the event if it fires AFTER React mounted
    // (the index.html inline script catches it if it fires BEFORE)
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired')
      e.preventDefault()
      window.__pwaInstallPrompt = e // keep global ref in sync
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Handle app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed')
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      window.__pwaInstallPrompt = null
      // Clean up dismiss flag since the app is now installed
      sessionStorage.removeItem('pwa-banner-dismissed')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[PWA] Service worker ready')
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setHasUpdate(true)
            }
          })
        })
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available')
      return false
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] Install outcome:', outcome)
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt')
        setIsInstallable(false)
        setDeferredPrompt(null)
        window.__pwaInstallPrompt = null
        return true
      } else {
        console.log('[PWA] User dismissed the install prompt')
        return false
      }
    } catch (error) {
      console.error('[PWA] Install error:', error)
      return false
    }
  }, [deferredPrompt])

  const updateApp = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      })
    }
  }, [])

  return {
    isOnline,
    isInstallable,
    isInstalled,
    hasUpdate,
    isIOS,
    deferredPrompt,
    installApp,
    updateApp,
  }
}

export default usePWA
