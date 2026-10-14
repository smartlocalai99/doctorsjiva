import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

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

export function NurseProvider({ children }) {
  // profile = { nurse, hospital, doctors, today }
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');

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
    setProfile(null);
    setStatus('signed_out');
  }, []);

  const value = useMemo(() => ({ login, logout, profile, refresh, status }), [login, logout, profile, refresh, status]);
  return <NurseContext value={value}>{children}</NurseContext>;
}

export function useNurse() {
  const value = use(NurseContext);
  if (!value) throw new Error('useNurse must be used inside NurseProvider.');
  return value;
}
