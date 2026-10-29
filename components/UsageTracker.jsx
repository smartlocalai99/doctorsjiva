import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

import { BEAT_MS, createUsageTracker } from '@/lib/usage-client';

// Counts screen time in the doctor and nurse apps (see lib/usage-client).
export function UsageTracker() {
  const router = useRouter();
  const tracker = useRef(null);

  useEffect(() => {
    const usage = createUsageTracker();
    tracker.current = usage;
    const onVisibility = () => (document.visibilityState === 'visible' ? usage.reveal() : usage.hide());
    const onLeave = () => usage.hide();
    const timer = window.setInterval(() => usage.beat(), BEAT_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      usage.flush();
      tracker.current = null;
    };
  }, []);

  useEffect(() => {
    if (router.isReady) tracker.current?.show(router.pathname);
  }, [router.isReady, router.pathname]);

  return null;
}
