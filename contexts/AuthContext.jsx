import { createContext, use, useEffect, useMemo, useState } from 'react';

import { DEMO_DOCTOR_ID } from '@/lib/demo-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PREVIEW_SESSION_KEY = 'drjiva-doctor-preview-session';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      const timer = window.setTimeout(() => {
        if (localStorage.getItem(PREVIEW_SESSION_KEY) === 'active') {
          setSession({ user: { id: DEMO_DOCTOR_ID, email: 'doctor@gmail.com' } });
        }
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      isPreview: !isSupabaseConfigured,
      async continueWithGoogle() {
        if (!supabase) {
          localStorage.setItem(PREVIEW_SESSION_KEY, 'active');
          setSession({ user: { id: DEMO_DOCTOR_ID, email: 'doctor@gmail.com' } });
          return;
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      async signOut() {
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
        localStorage.removeItem(PREVIEW_SESSION_KEY);
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
