// v4: notifications only for the doctor signed in on this phone.
// v3: keeps the last copy of each doctor page for weak signal, and shows
// notifications. v2 dropped files cached from older deploys.
const CACHE_NAME = 'drjiva-doctors-shell-v4';
// Who is signed in here, written by the app (lib/push-client markSignedIn).
const SIGNED_IN_CACHE = 'drjiva-signed-in';
const APP_SHELL = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const DOCTOR_PAGES = new Set(['/', '/calendar', '/patients', '/login']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== SIGNED_IN_CACHE).map((key) => caches.delete(key))))
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

// The phone number signed in on this phone, '' after logout, or null if the
// app has not said yet (an older version of the app).
async function signedInDoctor() {
  try {
    const hit = await (await caches.open(SIGNED_IN_CACHE)).match('/__signed-in');
    return hit ? await hit.text() : null;
  } catch {
    return null;
  }
}

// { title, body, url, tag, doctor } from lib/server/doctor-push.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil((async () => {
    const signedIn = await signedInDoctor();
    if (message.doctor && signedIn !== null && signedIn !== message.doctor) {
      // Meant for a doctor who is not signed in here: never show it. After
      // logout, also stop this phone's notifications for good.
      if (signedIn === '') {
        const subscription = await self.registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe().catch(() => undefined);
      }
      return;
    }
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
