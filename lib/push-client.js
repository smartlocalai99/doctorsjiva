import { useCallback, useEffect, useState } from 'react';

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

// state: 'checking' | 'install' (iPhone, not on the Home Screen yet) |
// 'unsupported' | 'blocked' | 'off' | 'on'
export function usePushNotifications() {
  const [state, setState] = useState('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!pushSupported()) return isIos() && !isStandalone() ? 'install' : 'unsupported';
      if (Notification.permission === 'denied') return 'blocked';
      const reg = await navigator.serviceWorker.getRegistration('/');
      const current = reg ? await reg.pushManager.getSubscription() : null;
      if (current && Notification.permission === 'granted') {
        // Keeps the server's copy in step (it forgets phones that stopped
        // answering), without another welcome message.
        await sendSubscription(current, false).catch(() => undefined);
        return 'on';
      }
      return 'off';
    };
    check()
      .then((next) => { if (active) setState(next); })
      .catch(() => { if (active) setState('off'); });
    return () => { active = false; };
  }, []);

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
      const [reg, keyResponse] = await Promise.all([registration(), fetch('/api/doctor/push', { cache: 'no-store' })]);
      const { publicKey } = await keyResponse.json();
      if (!publicKey) throw new Error('Notifications are not set up yet. Try again in a minute.');
      const subscription = (await reg.pushManager.getSubscription())
        || await reg.pushManager.subscribe({ applicationServerKey: keyBytes(publicKey), userVisibleOnly: true });
      await sendSubscription(subscription, true);
      setState('on');
    } catch (enableError) {
      setError(enableError.message || 'Could not turn on notifications. Try again.');
    } finally {
      setBusy(false);
    }
  }, []);

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
      setState('off');
    } finally {
      setBusy(false);
    }
  }, []);

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
