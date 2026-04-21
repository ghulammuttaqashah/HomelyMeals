const CACHE_NAME = 'homely-meals-customer-v5';
const STATIC_CACHE = 'static-customer-v5';
const DYNAMIC_CACHE = 'dynamic-customer-v5';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mobileapp.png',
  '/notification-icon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API calls - always go to network
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // For navigation requests, try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in background
        fetch(request).then((response) => {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response);
          });
        });
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Clone and cache the response
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received!');
  console.log('[Service Worker] Push event data:', event.data);
  
  let data = { title: 'Homely Meals', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[Service Worker] Parsed push data:', data);
    } catch (e) {
      console.log('[Service Worker] Failed to parse JSON, using text');
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/notification-icon.png', // Main image shown in the popup
    badge: '/mobileapp.png', // Small monochrome icon for the Android status bar
    vibrate: [100, 50, 200, 50, 100],
    requireInteraction: true, // Prevents notification from auto-closing
    timestamp: Date.now(),
    dir: 'ltr',
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  console.log('[Service Worker] Showing notification with options:', options);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[Service Worker] Notification shown successfully'))
      .catch(err => console.error('[Service Worker] Error showing notification:', err))
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  // Implement cart sync logic here when needed
  console.log('[Service Worker] Syncing cart...');
}
