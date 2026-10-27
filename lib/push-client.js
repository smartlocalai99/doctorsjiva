import { useCallback, useEffect, useState } from 'react';

import { readStored, writeStored } from './device-store';

// Notifications and "Add to Home Screen" on this phone.
//
// iPhone: notifications only work once DrJiva is on the Home Screen and
// opened from there (iOS 16.4 and later). Android and computers: in the
// browser too.

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function keyBytes(base64) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

// Who is signed in on this phone, for the service worker (public/sw.js): it
// only shows a message addressed to that doctor, and nothing at all once
// she has logged out. '' means nobody.
const SIGNED_IN_CACHE = 'drjiva-signed-in';

export async function markSignedIn(phone) {
  try {
    const cache = await caches.open(SIGNED_IN_CACHE);
    await cache.put('/__signed-in', new Response(phone || ''));
  } catch {
    // No Cache Storage (old browser): the server-side cleanup still applies.
  }
}

// Logging out stops this phone's notifications with Apple / Google and on
// the server, so nothing more arrives until a doctor logs in here again.
export async function stopNotificationsOnThisPhone() {
  await markSignedIn('');
  let endpoint = '';
  try {
    if (!('serviceWorker' in navigator)) return '';
    const reg = await navigator.serviceWorker.getRegistration('/');
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe();
    }
  } catch {
    // The server forgets the phone below either way.
  }
  return endpoint;
}

// A doctor who turned notifications off on this phone keeps them off, even
// across logging out and in.
const offKey = (phone) => `drjiva.push.off.${phone}`;

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

async function sendSubscription(subscription, welcome) {
  const response = await fetch('/api/doctor/push', {
    body: JSON.stringify({ subscription: subscription.toJSON(), welcome }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Could not turn on notifications. Try again.');
  }
}

async function subscribe(reg) {
  const keyResponse = await fetch('/api/doctor/push', { cache: 'no-store' });
  const { publicKey } = await keyResponse.json();
  if (!publicKey) throw new Error('Notifications are not set up yet. Try again in a minute.');
  return (await reg.pushManager.getSubscription())
    || reg.pushManager.subscribe({ applicationServerKey: keyBytes(publicKey), userVisibleOnly: true });
}

// state: 'checking' | 'install' (iPhone, not on the Home Screen yet) |
// 'unsupported' | 'blocked' | 'off' | 'on'
// `phone` is the signed-in doctor: this phone's notifications are hers.
export function usePushNotifications(phone) {
  const [state, setState] = useState('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone) return undefined;
    let active = true;
    const check = async () => {
      await markSignedIn(phone);
      if (!pushSupported()) return isIos() && !isStandalone() ? 'install' : 'unsupported';
      if (Notification.permission === 'denied') return 'blocked';
      if (Notification.permission !== 'granted') return 'off';
      const reg = await navigator.serviceWorker.getRegistration('/');
      let current = reg ? await reg.pushManager.getSubscription() : null;
      // Logged in on a phone that already allows notifications: turn them
      // back on for her, unless she switched them off here.
      if (!current && reg && !readStored(offKey(phone))) current = await subscribe(reg).catch(() => null);
      if (!current) return 'off';
      // Files this phone under her (and keeps the server's copy in step),
      // without another welcome message.
      await sendSubscription(current, false).catch(() => undefined);
      return 'on';
    };
    check()
      .then((next) => { if (active) setState(next); })
      .catch(() => { if (active) setState('off'); });
    return () => { active = false; };
  }, [phone]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      // Asked straight from her tap: iPhone only shows the question then.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const subscription = await subscribe(await registration());
      await sendSubscription(subscription, true);
      if (phone) writeStored(offKey(phone), null);
      setState('on');
    } catch (enableError) {
      setError(enableError.message || 'Could not turn on notifications. Try again.');
    } finally {
      setBusy(false);
    }
  }, [phone]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const subscription = await (await registration()).pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/doctor/push', {
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: { 'Content-Type': 'application/json' },
          method: 'DELETE',
        }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      if (phone) writeStored(offKey(phone), true);
      setState('off');
    } finally {
      setBusy(false);
    }
  }, [phone]);

  return { busy, disable, enable, error, state };
}

// Chrome and Android offer their own install button; Safari never does.
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  // The doctor app frame only renders in the browser (after the sign-in
  // check), so this can read the window straight away.
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    setPrompt(null);
  }, [prompt]);

  return { canPrompt: Boolean(prompt), install, installed };
}
