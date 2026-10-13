import { ArrowLeft, LogOut } from 'lucide-react';
import Link from 'next/link';

import { AppLogo } from '@/components/AppLogo';
import { useNurse } from '@/contexts/NurseContext';

// Phone-first frame: who is signed in, at which hospital, always on top.
export function NurseFrame({ backHref, children, footer }) {
  const { logout, profile } = useNurse();
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
          <span>{profile?.hospital?.name}</span>
        </div>
        <button className="nurse-icon-button" type="button" onClick={logout} aria-label="Log out">
          <LogOut aria-hidden="true" size={20} />
        </button>
      </header>
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
