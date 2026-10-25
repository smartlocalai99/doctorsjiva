import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return undefined;
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    // The page may have finished loading before this ran.
    if (document.readyState === 'complete') {
      void register();
      return undefined;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
