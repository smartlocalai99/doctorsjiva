import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { secureAuthStorage } from './secure-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isBackendConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isBackendConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: secureAuthStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
        persistSession: true,
      },
    })
  : null;

if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
