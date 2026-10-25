import { useRouter } from 'next/router';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readStored, writeStored } from '@/lib/device-store';
import { useAuth } from './AuthContext';

const DoctorDeskContext = createContext(null);
export const DESK_POLL_MS = 20 * 1000;

// Today, Calendar and Patients share one read of /api/doctor/desk. The last
// read is kept on the phone, so the app opens onto her patients at once and
// then brings them up to date. While the app is on screen it is read again
// every 20 seconds, straight away when she comes back to it, and when a
// notification says the nurse saved something. The refresh button (and
// pull to refresh) skips the server's copy.
export function DoctorDeskProvider({ children }) {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const phone = session?.doctor?.phone_number || '';
  const storeKey = phone ? `drjiva.desk.${phone}` : '';
  const [desk, setDesk] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const loadedAt = useRef(0);
  const loading = useRef(false);

  const load = useCallback(async ({ fresh = false, quiet = false } = {}) => {
    if (!session || loading.current) return;
    loading.current = true;
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch(`/api/doctor/desk${fresh ? '?fresh=1' : ''}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await signOut();
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load your patients.');
      setDesk(result);
      setError('');
      loadedAt.current = Date.now();
      if (storeKey) writeStored(storeKey, result);
    } catch (loadError) {
      // A failed background read keeps what is on screen.
      if (!quiet) setError(loadError.message || 'Could not load your patients. Check the internet and try again.');
    } finally {
      loading.current = false;
      if (!quiet) setRefreshing(false);
    }
  }, [session, signOut, storeKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = storeKey ? readStored(storeKey) : null;
      if (stored?.appointments) setDesk(stored);
      // With her last desk on screen, the first read is a quiet one.
      void load({ quiet: Boolean(stored?.appointments) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, storeKey]);

  useEffect(() => {
    const visible = () => document.visibilityState === 'visible';
    const poll = window.setInterval(() => {
      if (visible()) void load({ quiet: true });
    }, DESK_POLL_MS);
    const onReturn = () => {
      if (visible() && Date.now() - loadedAt.current > 5000) void load({ quiet: true });
    };
    const onMessage = (event) => {
      if (event.data?.type === 'desk-changed') void load({ fresh: true, quiet: true });
      if (event.data?.type === 'open' && typeof event.data.url === 'string' && event.data.url.startsWith('/')) void router.push(event.data.url);
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [load, router]);

  const value = useMemo(() => {
    const patients = new Map((desk?.patients || []).map((patient) => [patient.id, patient]));
    return { desk, error, patients, refresh: () => load({ fresh: true }), refreshing };
  }, [desk, error, load, refreshing]);

  return <DoctorDeskContext value={value}>{children}</DoctorDeskContext>;
}

export function useDoctorDesk() {
  const value = use(DoctorDeskContext);
  if (!value) throw new Error('useDoctorDesk must be used inside DoctorDeskProvider.');
  return value;
}
