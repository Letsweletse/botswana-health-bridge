// ChekaMeds SW v3 - Nuclear cache reset
const CACHE_VERSION = "chekameds-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network only - no caching at all
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
