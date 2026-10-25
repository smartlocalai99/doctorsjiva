// v3: keeps the last copy of each doctor page for weak signal, and shows
// notifications. v2 dropped files cached from older deploys.
const CACHE_NAME = 'drjiva-doctors-shell-v3';
const APP_SHELL = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const DOCTOR_PAGES = new Set(['/', '/calendar', '/patients', '/login']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Pages always come from the network (a new deploy shows at once); the
  // last copy of a doctor page is the fallback with no signal.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && DOCTOR_PAGES.has(url.pathname)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) || caches.match('/offline.html')),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })),
    );
  }
});

// { title, body, url, tag } from lib/server/doctor-push.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(message.title || 'DrJiva', {
      badge: '/icons/icon-192.png',
      body: message.body || '',
      data: { url: message.url || '/' },
      icon: '/icons/icon-192.png',
      renotify: Boolean(message.tag),
      tag: message.tag || undefined,
    });
    // An open app reads the desk again straight away.
    const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    windows.forEach((client) => client.postMessage({ type: 'desk-changed' }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin && !new URL(client.url).pathname.startsWith('/nurse'));
    if (open) {
      await open.focus();
      open.postMessage({ type: 'open', url: event.notification.data?.url || '/' });
      return;
    }
    await self.clients.openWindow(target);
  })());
});
