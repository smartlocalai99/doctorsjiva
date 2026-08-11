import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';

import { DEMO_DOCTOR_ID } from '../data/demo-data';
import { isBackendConfigured, supabase } from '../lib/supabase';

const DEMO_SESSION_KEY = 'drjiva-doctor-demo-session';
const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      AsyncStorage.getItem(DEMO_SESSION_KEY)
        .then((value) => {
          if (mounted && value === 'active') {
            setSession({ user: { id: DEMO_DOCTOR_ID, email: 'doctor@demo.drjiva.com' } });
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isDemo: !isBackendConfigured,
      async signIn(email, password) {
        if (!supabase) {
          await AsyncStorage.setItem(DEMO_SESSION_KEY, 'active');
          setSession({ user: { id: DEMO_DOCTOR_ID, email: email || 'doctor@demo.drjiva.com' } });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      },
      async enterDemo() {
        await AsyncStorage.setItem(DEMO_SESSION_KEY, 'active');
        setSession({ user: { id: DEMO_DOCTOR_ID, email: 'doctor@demo.drjiva.com' } });
      },
      async signOut() {
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);
        setSession(null);
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
