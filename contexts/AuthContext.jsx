import { createContext, use, useEffect, useMemo, useState } from 'react';

import { clearStored, readStored, writeStored } from '@/lib/device-store';

const AuthContext = createContext(null);
const SESSION_KEY = 'drjiva.doctor.session';

// The signed-in doctor is remembered on the phone, so the app opens at once
// (and with no signal) instead of waiting for the server. The server's
// answer still decides: a logged-out cookie logs her out here too.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // The phone's copy is only readable after hydration.
    const timer = window.setTimeout(() => {
      const stored = readStored(SESSION_KEY);
      if (!active || !stored?.doctor || (stored.expiresAt && stored.expiresAt <= Date.now())) return;
      setSession((current) => current ?? stored);
      setLoading(false);
    }, 0);
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Session check failed.');
        return response.json();
      })
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        writeStored(SESSION_KEY, nextSession);
        if (!nextSession) clearStored('drjiva.desk.');
      })
      // No signal: keep the remembered doctor.
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      async login(phone, code) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
        const nextSession = { doctor: result.doctor, expiresAt: result.expiresAt };
        writeStored(SESSION_KEY, nextSession);
        setSession(nextSession);
        return nextSession;
      },
      async signOut() {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        writeStored(SESSION_KEY, null);
        clearStored('drjiva.desk.');
        setSession(null);
      },
    }),
    [loading, session],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
