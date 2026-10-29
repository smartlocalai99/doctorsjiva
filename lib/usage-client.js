// Screen time for the usage page (/usage). While the doctor or nurse app is
// on screen it counts seconds per screen and sends them about every 30
// seconds, and once more when the app goes to the background. Time while
// the app is hidden is not counted. A new "open" starts after 30 minutes
// away.
import { readStored, writeStored } from './device-store.js';

const BEAT_MS = 30 * 1000;
const NEW_OPEN_AFTER_MS = 30 * 60 * 1000;

const SCREENS = {
  doctor: {
    '/': 'Today',
    '/calendar': 'Calendar',
    '/login': 'Login',
    '/patients': 'Patients',
    '/patients/[id]': 'Patient page',
  },
  nurse: {
    '/nurse': 'Today',
    '/nurse/patient/[id]': 'Patient page',
    '/nurse/patients': 'All patients',
  },
};

// /usage itself is not counted.
export function usageApp(pathname) {
  if (pathname === '/usage' || pathname.startsWith('/usage/')) return null;
  return pathname === '/nurse' || pathname.startsWith('/nurse/') ? 'nurse' : 'doctor';
}

export function screenName(app, pathname) {
  return SCREENS[app]?.[pathname] || pathname.replace(/\/\[[^\]]+\]/g, '').split('/').filter(Boolean).join(' ') || 'Today';
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function deviceId() {
  let id = readStored('drjiva.device');
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomId().replace(/-/g, '');
    writeStored('drjiva.device', id);
  }
  return id;
}

export function createUsageTracker({ send = sendBeat, now = () => Date.now() } = {}) {
  let app = null;
  let screen = null;
  let session = null;
  let device = null;
  let lastTick = 0;
  let hiddenAt = 0;
  let visible = true;
  const pending = new Map();

  const entry = (name) => {
    if (!pending.has(name)) pending.set(name, { seconds: 0, views: 0 });
    return pending.get(name);
  };

  const tick = () => {
    const at = now();
    if (visible && screen && lastTick) entry(screen).seconds += Math.max(0, at - lastTick) / 1000;
    lastTick = at;
  };

  const flush = (leaving = false) => {
    tick();
    if (!app || !session || !pending.size) return;
    const screens = [...pending].map(([name, value]) => ({ screen: name, seconds: Math.round(value.seconds), views: value.views }))
      .filter((value) => value.seconds > 0 || value.views > 0);
    pending.clear();
    if (screens.length) send({ app, device, screens, session }, leaving);
  };

  return {
    // Called on every page change.
    show(pathname) {
      const nextApp = usageApp(pathname);
      tick();
      if (nextApp !== app) {
        flush();
        app = nextApp;
        session = app ? randomId() : null;
      }
      if (!app) {
        screen = null;
        return;
      }
      device ||= deviceId();
      screen = screenName(app, pathname);
      entry(screen).views += 1;
    },
    beat() {
      if (visible) flush();
    },
    hide() {
      tick();
      visible = false;
      hiddenAt = now();
      flush(true);
    },
    reveal() {
      if (visible) return;
      visible = true;
      lastTick = now();
      if (app && now() - hiddenAt > NEW_OPEN_AFTER_MS) {
        session = randomId();
        if (screen) entry(screen).views += 1;
      }
    },
    flush,
  };
}

function sendBeat(body, leaving) {
  const json = JSON.stringify(body);
  if (leaving && navigator.sendBeacon) {
    navigator.sendBeacon('/api/usage/beat', new Blob([json], { type: 'application/json' }));
    return;
  }
  void fetch('/api/usage/beat', { body: json, headers: { 'Content-Type': 'application/json' }, keepalive: true, method: 'POST' }).catch(() => undefined);
}

export { BEAT_MS };
