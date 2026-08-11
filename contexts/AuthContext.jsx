import { createContext, use, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
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
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
        const nextSession = { doctor: result.doctor, expiresAt: Date.now() + 604800000 };
        setSession(nextSession);
        return nextSession;
      },
      async signOut() {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
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
