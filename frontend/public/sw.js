/* WareTrack Pro service worker: the app shell works offline; API data always comes from the network. */
const VERSION = 'waretrack-v3';
const SHELL = ['/', '/manifest.webmanifest', '/logo.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache API calls, sockets or other origins' data (except fonts and map tiles)
  if (url.origin !== self.location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com|tile\.openstreetmap\.org/.test(url.host)) {
      event.respondWith(
        caches.open(VERSION).then(async (cache) => {
          const hit = await cache.match(request);
          const fetching = fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; }).catch(() => hit);
          return hit || fetching;
        })
      );
    }
    return;
  }

  // Page navigations: network first, fall back to the cached shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put('/', copy));
        return res;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // Built assets (hashed file names): cache first
  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) caches.open(VERSION).then((cache) => cache.put(request, res.clone()));
        return res;
      }))
    );
  }
});
