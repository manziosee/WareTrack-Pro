/* WareTrack Pro service worker: the app shell works offline; API data always comes from the network. */
const VERSION = 'waretrack-v5';
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
          const fetching = fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()).catch(() => undefined); return res; }).catch(() => hit);
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
        if (res.ok) caches.open(VERSION).then((cache) => cache.put('/', copy)).catch(() => undefined);
        return res;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // Built assets (hashed file names): cache first
  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        // Copy before handing the response to the page: its body can only be read once
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return res;
      }))
    );
  }
});

// Push notifications: show them even when the app is closed
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'WareTrack Pro', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'WareTrack Pro', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/notifications' },
    })
  );
});

// Tapping a notification opens (or focuses) the app on the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (win.url.startsWith(self.location.origin) && 'focus' in win) {
          win.navigate(url).catch(() => undefined);
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
