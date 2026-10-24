import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';

const DoctorDeskContext = createContext(null);
export const DESK_POLL_MS = 20 * 1000;

// Today, Calendar and Patients share one read of /api/doctor/desk. While
// the app is on screen it is read again every 20 seconds, and straight
// away when she comes back to it, so a visit the nurse just saved shows up
// without a manual refresh. The refresh button skips the server's copy.
export function DoctorDeskProvider({ children }) {
  const { session, signOut } = useAuth();
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
    } catch (loadError) {
      // A failed background read keeps what is on screen.
      if (!quiet) setError(loadError.message || 'Could not load your patients. Check the internet and try again.');
    } finally {
      loading.current = false;
      if (!quiet) setRefreshing(false);
    }
  }, [session, signOut]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const visible = () => document.visibilityState === 'visible';
    const poll = window.setInterval(() => {
      if (visible()) void load({ quiet: true });
    }, DESK_POLL_MS);
    const onReturn = () => {
      if (visible() && Date.now() - loadedAt.current > 5000) void load({ quiet: true });
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [load]);

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
