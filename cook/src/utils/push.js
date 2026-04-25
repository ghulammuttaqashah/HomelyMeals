import api from '../api/axios';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get current notification permission state.
 */
export const getPermissionState = () => {
  if (!('Notification' in window)) {
    return { permission: 'unsupported', canAsk: false };
  }
  return {
    permission: Notification.permission,
    canAsk: Notification.permission === 'default',
  };
};

/**
 * Request notification permission.
 * MUST be called synchronously from a user gesture (button click).
 * Returns the permission promise — caller can await it later or ignore it.
 */
export const requestNotificationPermission = () => {
  if (!('Notification' in window)) return Promise.resolve('denied');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);

  console.log('[Push] Requesting notification permission...');
  return Notification.requestPermission();
};

/**
 * Subscribe the user to push notifications and save subscription to server.
 * Does NOT request permission — call requestNotificationPermission() first.
 * Safe to call anytime; will silently skip if permission is not granted.
 */
export const subscribeUserToPush = async () => {
  console.log('[Push] Starting push subscription process...');
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push messaging is not supported.');
    return;
  }

  try {
    const permission = Notification.permission;
    
    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted (' + permission + '), skipping.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    // If not subscribed, create subscription
    if (!subscription) {
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!publicVapidKey) {
        console.error('[Push] VITE_VAPID_PUBLIC_KEY is missing in .env file!');
        return;
      }
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    }

    // Send subscription to server
    await api.post('/api/cook/auth/push/subscribe', { subscription });
    console.log('[Push] Successfully subscribed to push notifications!');
    
  } catch (error) {
    console.error('[Push] Error in push subscription:', error);
  }
};
