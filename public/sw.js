const CACHE_NAME = 'mizan-no-cache-v2';

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW takes control immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

// Bypass cache; always go to network to avoid stale builds and bad assets
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
