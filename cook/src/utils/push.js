import api from '../api/axios';

const PUSH_PERMISSION_KEY = 'push-permission-denied-count';
const PUSH_PERMISSION_COOLDOWN_KEY = 'push-permission-cooldown-until';
const MAX_DENY_ASKS = 2; // After 2 denials, stop asking automatically
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours between re-asks

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
 * Get current notification permission state info.
 * Returns: { permission, deniedCount, inCooldown, canAsk }
 */
export const getPermissionState = () => {
  if (!('Notification' in window)) {
    return { permission: 'unsupported', deniedCount: 0, inCooldown: false, canAsk: false };
  }

  const permission = Notification.permission;
  const deniedCount = parseInt(localStorage.getItem(PUSH_PERMISSION_KEY) || '0', 10);
  const cooldownUntil = parseInt(localStorage.getItem(PUSH_PERMISSION_COOLDOWN_KEY) || '0', 10);
  const inCooldown = Date.now() < cooldownUntil;
  const canAsk = permission === 'default' && deniedCount < MAX_DENY_ASKS && !inCooldown;

  return { permission, deniedCount, inCooldown, canAsk };
};

/**
 * Ask for notification permission — ONLY call from a user gesture context (click handler).
 * Tracks denial count to avoid annoying users.
 * Returns true if permission was granted.
 */
export const askNotificationPermission = async () => {
  if (!('Notification' in window)) return false;

  const { canAsk, permission } = getPermissionState();

  // Already granted
  if (permission === 'granted') return true;

  // Already denied by browser (permanent) — can't ask again
  if (permission === 'denied') return false;

  // We've asked too many times or in cooldown — don't ask
  if (!canAsk) return false;

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      // Reset denial tracking on grant
      localStorage.removeItem(PUSH_PERMISSION_KEY);
      localStorage.removeItem(PUSH_PERMISSION_COOLDOWN_KEY);
      return true;
    } else {
      // User dismissed or denied
      const count = parseInt(localStorage.getItem(PUSH_PERMISSION_KEY) || '0', 10) + 1;
      localStorage.setItem(PUSH_PERMISSION_KEY, String(count));
      localStorage.setItem(PUSH_PERMISSION_COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
      return false;
    }
  } catch (e) {
    console.error('[Push] Error requesting permission:', e);
    return false;
  }
};

/**
 * Subscribe the user to push notifications and save to server.
 * @param {boolean} hasGesture - Whether this is called from a user gesture (click)
 */
export const subscribeUserToPush = async (hasGesture = false) => {
  console.log('[Push] Starting push subscription process...');
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push messaging is not supported.');
    return;
  }

  try {
    let permission = Notification.permission;

    // Only request permission if we have a gesture context and permission isn't decided
    if (permission === 'default' && hasGesture) {
      console.log('[Push] Requesting notification permission (has gesture)...');
      permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
      
      if (permission !== 'granted') {
        const count = parseInt(localStorage.getItem(PUSH_PERMISSION_KEY) || '0', 10) + 1;
        localStorage.setItem(PUSH_PERMISSION_KEY, String(count));
        localStorage.setItem(PUSH_PERMISSION_COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
      } else {
        localStorage.removeItem(PUSH_PERMISSION_KEY);
        localStorage.removeItem(PUSH_PERMISSION_COOLDOWN_KEY);
      }
    }
    
    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted, skipping subscription.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    // If not subscribed, subscribe
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
