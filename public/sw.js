const CACHE_NAME = 'habitflow-couple-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install Event: cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Force immediate active state
      return self.skipWaiting();
    })
  );
});

// Activate Event: remove stale/old cache names
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: handle offline cache-first or stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass requests to live Realtime database (firebaseio) or analytics
  if (
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    return; // let fetch pass through natively
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to keep cache hot
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            /* Ignore backup background failure */
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache dynamic static assets (like custom photos/fonts) on the go
          if (
            networkResponse && 
            networkResponse.status === 200 && 
            (requestUrl.origin === self.location.origin || requestUrl.href.includes('fonts.googleapis.com'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Secondary fallback to cache root for navigate request so user is never locked out
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
