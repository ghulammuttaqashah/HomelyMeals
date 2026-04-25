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
 * Request notification permission AND subscribe in one call.
 * MUST be called directly from a button click handler (user gesture).
 * Returns true if successfully subscribed, false otherwise.
 */
export const requestAndSubscribe = async () => {
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const result = await Notification.requestPermission();
    console.log('[Push] Permission result:', result);
    
    if (result !== 'granted') {
      console.log('[Push] Permission denied or dismissed');
      return false;
    }

    return await subscribeUserToPush();
  } catch (error) {
    console.error('[Push] Error requesting permission:', error);
    return false;
  }
};

/**
 * Subscribe the user to push notifications and save subscription to server.
 * Does NOT request permission — permission must already be 'granted'.
 * Returns true if successfully subscribed.
 */
export const subscribeUserToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push messaging is not supported.');
    return false;
  }

  try {
    const permission = Notification.permission;
    
    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted (' + permission + '), skipping.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!publicVapidKey) {
        console.error('[Push] VITE_VAPID_PUBLIC_KEY is missing in .env file!');
        return false;
      }
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    }

    await api.post('/api/cook/auth/push/subscribe', { subscription });
    console.log('[Push] Successfully subscribed to push notifications!');
    return true;
    
  } catch (error) {
    console.error('[Push] Error in push subscription:', error);
    return false;
  }
};
