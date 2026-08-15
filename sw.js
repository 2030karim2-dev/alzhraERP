
import { get, set, del, clear } from 'idb-keyval';

const CACHE_NAME = 'alz-erp-v4.1';
const APP_SHELL_URLS = [
  '/',
  '/index.html'
];
const SYNC_TAG = 'offline-sync';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                 .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass Service Worker for Supabase API requests to allow direct browser handling
  // This avoids "Failed to fetch" errors caused by SW interception of opaque responses or CORS issues
  if (request.url.includes('supabase.co')) {
    return;
  }
  
  // Navigation: Network First -> Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Assets: Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
        }
        return networkResponse;
      }).catch(() => null); 
      return cachedResponse || fetchPromise;
    })
  );
});

// Sync Logic remains same
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    // Background sync logic placeholder
  }
});
