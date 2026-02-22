import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] SW registered:', registration.scope)
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, show update notification if needed
              console.log('[PWA] New content available, please refresh.')
            }
          })
        })
      })
      .catch((error) => {
        console.log('[PWA] SW registration failed:', error)
      })
  })
}

// Debug: Log PWA eligibility info
if (typeof window !== 'undefined') {
  console.log('[PWA Debug] Protocol:', window.location.protocol)
  console.log('[PWA Debug] Host:', window.location.host)
  console.log('[PWA Debug] Is secure context:', window.isSecureContext)
  console.log('[PWA Debug] Service Worker supported:', 'serviceWorker' in navigator)
  
  // Check if manifest is accessible
  fetch('/manifest.json')
    .then(res => res.json())
    .then(manifest => console.log('[PWA Debug] Manifest loaded:', manifest.name))
    .catch(err => console.log('[PWA Debug] Manifest error:', err))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
