import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi'
import { getPermissionState, requestAndSubscribe, subscribeUserToPush } from '../utils/push'
import api from '../api/axios'
import toast from 'react-hot-toast'

const PushTest = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const checkStatus = async () => {
    const { permission } = getPermissionState()
    
    // Check if service worker is registered
    const swRegistered = 'serviceWorker' in navigator
    const swReady = swRegistered ? await navigator.serviceWorker.ready : null
    
    // Check if push subscription exists
    let hasSubscription = false
    if (swReady) {
      const subscription = await swReady.pushManager.getSubscription()
      hasSubscription = !!subscription
    }

    // Check if server has subscription
    let serverHasSubscription = false
    try {
      const { data } = await api.get('/api/customer/auth/me')
      serverHasSubscription = data.customer.hasPushSubscription || false
    } catch (error) {
      console.error('Failed to check server subscription:', error)
    }

    setStatus({
      permission,
      swRegistered,
      swReady: !!swReady,
      hasSubscription,
      serverHasSubscription,
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY ? 'Present' : 'Missing'
    })
  }

  const handleRequestPermission = async () => {
    setLoading(true)
    try {
      const success = await requestAndSubscribe()
      if (success) {
        toast.success('Push notifications enabled!')
        await checkStatus()
      } else {
        toast.error('Failed to enable push notifications')
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResubscribe = async () => {
    setLoading(true)
    try {
      const success = await subscribeUserToPush()
      if (success) {
        toast.success('Resubscribed successfully!')
        await checkStatus()
      } else {
        toast.error('Failed to resubscribe')
      }
    } catch (error) {
      console.error('Error resubscribing:', error)
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/customer/auth/push/test')
      toast.success(data.message)
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error(error.response?.data?.message || 'Failed to send test notification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Push Notification Test</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Status Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <FiBell className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notification Status</h2>
          </div>

          {!status ? (
            <button
              onClick={checkStatus}
              className="w-full rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              Check Status
            </button>
          ) : (
            <div className="space-y-3">
              <StatusItem
                label="Browser Permission"
                value={status.permission}
                isGood={status.permission === 'granted'}
              />
              <StatusItem
                label="Service Worker Registered"
                value={status.swRegistered ? 'Yes' : 'No'}
                isGood={status.swRegistered}
              />
              <StatusItem
                label="Service Worker Ready"
                value={status.swReady ? 'Yes' : 'No'}
                isGood={status.swReady}
              />
              <StatusItem
                label="Push Subscription (Browser)"
                value={status.hasSubscription ? 'Yes' : 'No'}
                isGood={status.hasSubscription}
              />
              <StatusItem
                label="Push Subscription (Server)"
                value={status.serverHasSubscription ? 'Yes' : 'No'}
                isGood={status.serverHasSubscription}
              />
              <StatusItem
                label="VAPID Public Key"
                value={status.vapidKey}
                isGood={status.vapidKey === 'Present'}
              />

              <button
                onClick={checkStatus}
                className="mt-4 w-full rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
              >
                Refresh Status
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRequestPermission}
            disabled={loading || status?.permission === 'granted'}
            className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Request Permission & Subscribe'}
          </button>

          <button
            onClick={handleResubscribe}
            disabled={loading || status?.permission !== 'granted'}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Resubscribe to Server'}
          </button>

          <button
            onClick={handleTestNotification}
            disabled={loading || !status?.serverHasSubscription}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-xl bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Instructions:</h3>
          <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
            <li>Click "Check Status" to see current state</li>
            <li>If permission is not granted, click "Request Permission & Subscribe"</li>
            <li>If subscription is missing on server, click "Resubscribe to Server"</li>
            <li>Click "Send Test Notification" to test if notifications work</li>
            <li>Check browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

const StatusItem = ({ label, value, isGood }) => {
  const Icon = isGood ? FiCheckCircle : value === 'denied' ? FiXCircle : FiAlertCircle
  const colorClass = isGood ? 'text-green-600' : value === 'denied' ? 'text-red-600' : 'text-yellow-600'

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
    </div>
  )
}

export default PushTest
