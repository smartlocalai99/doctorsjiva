import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';

const DoctorDeskContext = createContext(null);
const STALE_MS = 2 * 60 * 1000;

// Today, Calendar and Patients share one read of /api/doctor/desk. It is
// read again when the app comes back on screen after a couple of minutes,
// so a visit the nurse just saved shows up without a manual refresh.
export function DoctorDeskProvider({ children }) {
  const { session, signOut } = useAuth();
  const [desk, setDesk] = useState(null);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/doctor/desk', { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await signOut();
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load your patients.');
      setDesk(result);
      setError('');
      setLoadedAt(Date.now());
    } catch (loadError) {
      setError(loadError.message || 'Could not load your patients. Check the internet and try again.');
    } finally {
      setRefreshing(false);
    }
  }, [session, signOut]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt > STALE_MS) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, loadedAt]);

  const value = useMemo(() => {
    const patients = new Map((desk?.patients || []).map((patient) => [patient.id, patient]));
    return { desk, error, patients, refresh: load, refreshing };
  }, [desk, error, load, refreshing]);

  return <DoctorDeskContext value={value}>{children}</DoctorDeskContext>;
}

export function useDoctorDesk() {
  const value = use(DoctorDeskContext);
  if (!value) throw new Error('useDoctorDesk must be used inside DoctorDeskProvider.');
  return value;
}
