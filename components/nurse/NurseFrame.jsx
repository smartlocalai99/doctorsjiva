import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppLogo } from '@/components/AppLogo';
import { useNurse } from '@/contexts/NurseContext';

const CHECK_EVERY_MS = 5 * 60 * 1000;

// Phones keep the nurse desk open for days. When the page comes back on
// screen and a newer deploy is live, reload, unless there are unsaved
// changes; then offer a refresh button instead.
function useNewerDeploy() {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const mine = process.env.APP_BUILD_ID;
    if (!mine) return undefined;
    let stopped = false;
    const check = async () => {
      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        const { build } = await response.json();
        if (stopped || !build || build === mine) return;
        if (window.__drjivaNurseDirty) setWaiting(true);
        else window.location.reload();
      } catch {
        // Offline: try again later.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    void check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, []);
  return waiting;
}

// Phone-first frame: who is signed in, where, and with which doctor.
export function NurseFrame({ backHref, children, footer }) {
  const { deskDoctor, logout, profile } = useNurse();
  const newerDeploy = useNewerDeploy();
  return (
    <div className="nurse-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="nurse-topbar">
        {backHref ? (
          <Link className="nurse-icon-button" href={backHref} aria-label="Back to patient search">
            <ArrowLeft aria-hidden="true" size={22} />
          </Link>
        ) : (
          <div className="nurse-logo"><AppLogo compact label="Nurse desk" /></div>
        )}
        <div className="nurse-identity">
          <strong>{profile?.nurse?.name}</strong>
          <span>{deskDoctor ? `${profile?.hospital?.name} · ${deskDoctor.name}` : profile?.hospital?.name}</span>
        </div>
        <button className="nurse-icon-button" type="button" onClick={logout} aria-label="Log out">
          <LogOut aria-hidden="true" size={20} />
        </button>
      </header>
      {newerDeploy ? (
        <div className="nurse-update-bar" role="status">
          <span>A newer nurse desk is ready. Save your changes, then refresh.</span>
          <button type="button" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" size={16} /> Refresh
          </button>
        </div>
      ) : null}
      <main className={`nurse-main ${footer ? 'nurse-main-with-footer' : ''}`} id="main-content">{children}</main>
      {footer ? <div className="nurse-footer">{footer}</div> : null}
    </div>
  );
}

export function NurseLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas">
      <div className="size-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-label="Loading" />
    </main>
  );
}
