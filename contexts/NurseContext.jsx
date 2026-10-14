import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toPatients } from '@/lib/nurse-directory';

const NurseContext = createContext(null);

export async function nurseRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    method,
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(data?.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.code = data?.code || null;
    throw error;
  }
  return data;
}

const NO_DIRECTORY = { loadedAt: 0, patients: [], status: 'idle' };

export function NurseProvider({ children }) {
  // profile = { nurse, hospital, doctors, today }
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  // The hospital's patient list: fetched once per session (lists and
  // suggestions all use this copy), refreshed only on request.
  const [directory, setDirectory] = useState(NO_DIRECTORY);
  const directoryRequested = useRef(false);

  const loadDirectory = useCallback(async ({ fresh = false } = {}) => {
    directoryRequested.current = true;
    try {
      const data = await nurseRequest(`/api/nurse/patients${fresh ? '?fresh=1' : ''}`);
      setDirectory({ loadedAt: data.loadedAt, patients: toPatients(data.patients), status: 'ready' });
    } catch {
      setDirectory((current) => ({ ...current, status: current.patients.length ? 'ready' : 'error' }));
    }
  }, []);

  const ensureDirectory = useCallback(() => {
    if (!directoryRequested.current) void loadDirectory();
  }, [loadDirectory]);

  // A patient just added or opened goes to the top without a reload.
  const rememberPatient = useCallback((patient) => {
    if (!patient?.id) return;
    setDirectory((current) => {
      const existing = current.patients.find((item) => item.id === patient.id);
      const [row] = toPatients([[
        patient.id,
        patient.name ?? existing?.name ?? '',
        String(patient.mobile ?? existing?.mobile ?? '').replace(/^\+91/, ''),
        patient.hospitalPatientId ?? existing?.hospitalId ?? '',
        patient.lastSeen ?? existing?.lastSeen ?? '',
      ]]);
      return { ...current, patients: [row, ...current.patients.filter((item) => item.id !== patient.id)] };
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await nurseRequest('/api/nurse/me');
      setProfile(next);
      setStatus('ready');
      return next;
    } catch (error) {
      if (error.status === 401) {
        setProfile(null);
        setStatus('signed_out');
        return null;
      }
      setStatus((current) => (current === 'ready' ? current : 'error'));
      return null;
    }
  }, []);

  // First load: same pattern as AuthContext (state is set in the promise
  // callbacks, after the request finishes).
  useEffect(() => {
    let active = true;
    nurseRequest('/api/nurse/me')
      .then((next) => {
        if (!active) return;
        setProfile(next);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        setProfile(null);
        setStatus(error.status === 401 ? 'signed_out' : 'error');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (mobile, pin) => {
    await nurseRequest('/api/nurse/login', { body: { mobile, pin }, method: 'POST' });
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await nurseRequest('/api/nurse/logout', { body: {}, method: 'POST' }).catch(() => undefined);
    directoryRequested.current = false;
    setDirectory(NO_DIRECTORY);
    setProfile(null);
    setStatus('signed_out');
  }, []);

  const value = useMemo(
    () => ({ directory, ensureDirectory, loadDirectory, login, logout, profile, refresh, rememberPatient, status }),
    [directory, ensureDirectory, loadDirectory, login, logout, profile, refresh, rememberPatient, status],
  );
  return <NurseContext value={value}>{children}</NurseContext>;
}

export function useNurse() {
  const value = use(NurseContext);
  if (!value) throw new Error('useNurse must be used inside NurseProvider.');
  return value;
}
