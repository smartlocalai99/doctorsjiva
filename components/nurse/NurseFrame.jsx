import { ChevronRight, LogOut, RefreshCw, Smartphone, Stethoscope, Sun, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createContext, use, useEffect, useMemo, useRef, useState } from 'react';

import { InstallSteps } from '@/components/AppShell';
import { initialOf } from '@/components/doctor/DeskParts';
import { useNurse } from '@/contexts/NurseContext';
import { useInstallPrompt } from '@/lib/push-client';

const CHECK_EVERY_MS = 5 * 60 * 1000;

const TABS = [
  { href: '/nurse', icon: Sun, label: 'Today' },
  { href: '/nurse/patients', icon: Users, label: 'Patients' },
];

const NurseShellContext = createContext(null);

function useNurseShell() {
  const value = use(NurseShellContext);
  if (!value) throw new Error('useNurseShell must be used inside NurseFrame.');
  return value;
}

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

// The nurse desk drawn like the doctor app: Today and Patients tabs (a
// sidebar on computers), her initial top right for settings. A patient
// page swaps the tab bar for its Save bar (`footer`).
export function NurseFrame({ children, detail = false, footer, onChangeDoctor }) {
  const router = useRouter();
  const { deskDoctor, profile } = useNurse();
  const newerDeploy = useNewerDeploy();
  const install = useInstallPrompt();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const shell = useMemo(() => ({ install, openSettings: () => setSettingsOpen(true) }), [install]);
  const name = profile?.nurse?.name || 'Nurse';
  // Off the Today page, "Doctor today" goes back to Today's doctor list.
  const changeDoctor = onChangeDoctor || (() => void router.push('/nurse?pick=1'));

  return (
    <NurseShellContext value={shell}>
      <div className={`desk-shell nurse-shell ${footer ? 'has-footer' : ''}`}>
        <a className="skip-link" href="#main-content">Skip to content</a>

        <aside className="desk-sidebar" aria-label="Nurse desk">
          <div className="desk-brand">
            <Image alt="" height={32} src="/icons/drjiva-mark.png" width={32} />
            <span>DrJiva Nurse</span>
          </div>
          <nav className="desk-nav" aria-label="Main navigation">
            {TABS.map((tab) => <TabLink item={tab} key={tab.href} kind="nav" pathname={router.pathname} />)}
          </nav>
          <button className="desk-account" type="button" onClick={() => setSettingsOpen(true)}>
            <span className="desk-avatar" aria-hidden="true">{initialOf(name)}</span>
            <span className="min-w-0 flex-1">
              <strong>{name}</strong>
              <small>{deskDoctor ? `With ${deskDoctor.name}` : profile?.hospital?.name}</small>
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </aside>

        {newerDeploy ? (
          <div className="nurse-update-bar" role="status">
            <span>A newer nurse desk is ready. Save your changes, then refresh.</span>
            <button type="button" onClick={() => window.location.reload()}>
              <RefreshCw aria-hidden="true" size={16} /> Refresh
            </button>
          </div>
        ) : null}

        <main className="desk-main" id="main-content">
          <div className={`desk-page ${detail ? 'is-detail' : ''}`}>{children}</div>
        </main>

        {footer ? <div className="nurse-footer">{footer}</div> : (
          <nav className="ios-tabbar is-two" aria-label="Main navigation">
            {TABS.map((tab) => <TabLink item={tab} key={tab.href} kind="tab" pathname={router.pathname} />)}
          </nav>
        )}

        <NurseSettings
          install={install}
          onChangeDoctor={changeDoctor}
          onClose={() => setSettingsOpen(false)}
          open={settingsOpen}
        />
      </div>
    </NurseShellContext>
  );
}

function TabLink({ item, kind, pathname }) {
  const Icon = item.icon;
  const active = item.href === '/nurse' ? pathname === '/nurse' || pathname.startsWith('/nurse/patient/') : pathname.startsWith(item.href);
  if (kind === 'nav') {
    return (
      <Link aria-current={active ? 'page' : undefined} className="desk-nav-item" href={item.href}>
        <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.4 : 2} />
        {item.label}
      </Link>
    );
  }
  return (
    <Link aria-current={active ? 'page' : undefined} className="ios-tab" href={item.href}>
      <Icon aria-hidden="true" size={25} strokeWidth={active ? 2.3 : 1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

// Her initial in the navigation bar: opens settings.
export function NurseNavActions() {
  const { openSettings } = useNurseShell();
  const { profile } = useNurse();
  return (
    <button className="ios-nav-avatar" type="button" onClick={openSettings} aria-label="Settings">
      {initialOf(profile?.nurse?.name || 'N')}
    </button>
  );
}

export function useNurseInstall() {
  return useNurseShell().install;
}

function NurseSettings({ install, onChangeDoctor, onClose, open }) {
  const dialogRef = useRef(null);
  const { deskDoctor, logout, profile } = useNurse();
  const [showSteps, setShowSteps] = useState(false);
  const name = profile?.nurse?.name || 'Nurse';
  const canChange = (profile?.doctors || []).length > 1 && onChangeDoctor;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="nurse-settings-title"
      className="ios-sheet"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onClose={onClose}
    >
      <div className="ios-sheet-body">
        <span className="ios-grabber" aria-hidden="true" />
        <div className="ios-sheet-nav">
          <span />
          <h2 id="nurse-settings-title">Settings</h2>
          <button className="ios-text-button is-bold" type="button" onClick={onClose}>Done</button>
        </div>

        <div className="ios-profile">
          <span className="ios-profile-avatar" aria-hidden="true">{initialOf(name)}</span>
          <strong>{name}</strong>
          <span>Nurse, {profile?.hospital?.name}</span>
        </div>

        <div className="ios-section">
          <ul className="ios-group">
            <li className="ios-cell">
              <button
                className="ios-cell-link is-setting has-value"
                disabled={!canChange}
                type="button"
                onClick={() => { onClose(); onChangeDoctor?.(); }}
              >
                <span className="ios-icon is-blue" aria-hidden="true"><Stethoscope size={17} strokeWidth={2.4} /></span>
                <span className="ios-cell-body"><span className="ios-cell-title">Doctor today</span></span>
                <span className="nurse-cell-value">{deskDoctor?.name || 'Not chosen'}</span>
                {canChange ? <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} /> : null}
              </button>
            </li>
          </ul>
          <p className="ios-section-foot">Your lists and buttons follow this doctor.</p>
        </div>

        {!install.installed ? (
          <div className="ios-section">
            <ul className="ios-group">
              <li className="ios-cell">
                <button
                  className="ios-cell-link is-setting"
                  type="button"
                  onClick={() => (install.canPrompt ? void install.install() : setShowSteps((shown) => !shown))}
                >
                  <span className="ios-icon is-green" aria-hidden="true"><Smartphone size={17} strokeWidth={2.4} /></span>
                  <span className="ios-cell-body"><span className="ios-cell-title">Add to Home Screen</span></span>
                  <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
                </button>
              </li>
            </ul>
            {showSteps ? <InstallSteps /> : <p className="ios-section-foot">Opens full screen like an app and stays signed in.</p>}
          </div>
        ) : null}

        <div className="ios-section">
          <ul className="ios-group">
            <li className="ios-cell">
              <button className="ios-cell-link is-setting is-destructive" type="button" onClick={() => { onClose(); void logout(); }}>
                <span className="ios-icon is-gray" aria-hidden="true"><LogOut size={17} strokeWidth={2.4} /></span>
                <span className="ios-cell-body"><span className="ios-cell-title">Log out</span></span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </dialog>
  );
}

export function NurseLoading() {
  return (
    <main className="ios-launch">
      <Image alt="" height={72} priority src="/icons/drjiva-mark.png" width={72} />
      <span className="ios-spinner" aria-label="Loading" role="status" />
    </main>
  );
}
