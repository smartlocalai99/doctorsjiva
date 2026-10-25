import { Bell, CalendarDays, ChevronRight, LogOut, RefreshCw, Share, Smartphone, SquarePlus, Sun, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { initialOf } from '@/components/doctor/DeskParts';
import { useAuth } from '@/contexts/AuthContext';
import { DoctorDeskProvider, useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { NurseProvider } from '@/contexts/NurseContext';
import { ShellContext } from '@/contexts/ShellContext';
import { formatMobile } from '@/lib/nurse-schedule';
import { isIos, useInstallPrompt, usePushNotifications } from '@/lib/push-client';

const navigation = [
  { href: '/', label: 'Today', icon: Sun },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/patients', label: 'Patients', icon: Users },
];

export function RouteGuard({ children }) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const isLogin = router.pathname === '/login';
  // The nurse desk (/nurse) has its own PIN login and never uses the
  // doctor session or the doctor navigation.
  const isNurse = router.pathname === '/nurse' || router.pathname.startsWith('/nurse/');

  useEffect(() => {
    if (isNurse || loading) return;
    if (!session && !isLogin) void router.replace('/login');
    if (session && isLogin) void router.replace('/');
  }, [isLogin, isNurse, loading, router, session]);

  if (isNurse) return <NurseProvider>{children}</NurseProvider>;

  if (loading || (!session && !isLogin) || (session && isLogin)) {
    return (
      <main className="ios-launch">
        <Image alt="" height={72} priority src="/icons/drjiva-mark.png" width={72} />
        <span className="ios-spinner" aria-label="Loading" role="status" />
      </main>
    );
  }
  if (isLogin) return children;
  return <DoctorDeskProvider><AppShell>{children}</AppShell></DoctorDeskProvider>;
}

// Phones keep the app open for days: when it comes back on screen and a
// newer deploy is live, reload (the doctor desk has nothing unsaved).
function useNewerDeploy() {
  useEffect(() => {
    const mine = process.env.APP_BUILD_ID;
    if (!mine) return undefined;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        const { build } = await response.json();
        if (build && build !== mine) window.location.reload();
      } catch {
        // Offline: try again next time.
      }
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
}

// Pull down at the top of a page to refresh, like Mail. Moves only the
// spinner (no re-render while the finger moves).
const PULL_TRIGGER = 72;

function usePullToRefresh(indicatorRef, onRefresh) {
  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return undefined;
    let startY = null;
    let distance = 0;
    const paint = (value, settle = false) => {
      indicator.style.transition = settle ? 'transform 0.25s ease, opacity 0.25s ease' : 'none';
      indicator.style.opacity = String(Math.min(value / PULL_TRIGGER, 1));
      indicator.style.transform = `translate(-50%, ${Math.min(value, PULL_TRIGGER + 16) - 40}px) rotate(${value * 4}deg)`;
    };
    const start = (event) => {
      const blocked = event.target.closest?.('dialog, input, textarea, .ios-calendar-grid');
      startY = window.scrollY <= 0 && event.touches.length === 1 && !blocked ? event.touches[0].clientY : null;
      distance = 0;
    };
    const move = (event) => {
      if (startY === null) return;
      distance = Math.max(0, (event.touches[0].clientY - startY) * 0.55);
      if (window.scrollY > 0) distance = 0;
      paint(distance);
    };
    const end = () => {
      if (startY === null) return;
      if (distance >= PULL_TRIGGER) {
        navigator.vibrate?.(8);
        onRefresh();
      }
      startY = null;
      distance = 0;
      paint(0, true);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [indicatorRef, onRefresh]);
}

function AppShell({ children }) {
  const router = useRouter();
  const { session } = useAuth();
  const { desk, refresh, refreshing } = useDoctorDesk();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const indicatorRef = useRef(null);
  const push = usePushNotifications();
  const install = useInstallPrompt();
  const name = desk?.doctor?.name || session?.doctor?.display_name || 'Doctor';
  const hospital = desk?.doctor?.hospitalName || session?.doctor?.hospital_name || '';

  useNewerDeploy();
  const pullRefresh = useCallback(() => {
    void refresh();
    window.dispatchEvent(new Event('drjiva:refresh'));
  }, [refresh]);
  usePullToRefresh(indicatorRef, pullRefresh);

  const shell = useMemo(() => ({ install, openSettings: () => setSettingsOpen(true), push }), [install, push]);

  return (
    <ShellContext value={shell}>
      <div className="desk-shell">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <span ref={indicatorRef} className={`ios-pull ${refreshing ? 'is-busy' : ''}`} aria-hidden="true">
          <RefreshCw size={18} strokeWidth={2.4} />
        </span>

        <aside className="desk-sidebar" aria-label="Doctor desk">
          <div className="desk-brand">
            <Image alt="" height={32} src="/icons/drjiva-mark.png" width={32} />
            <span>DrJiva</span>
          </div>
          <nav className="desk-nav" aria-label="Main navigation">
            {navigation.map((item) => <NavItem key={item.href} item={item} currentPath={router.pathname} />)}
          </nav>
          <button className="desk-account" type="button" onClick={() => setSettingsOpen(true)}>
            <span className="desk-avatar" aria-hidden="true">{initialOf(name)}</span>
            <span className="min-w-0 flex-1">
              <strong>{name}</strong>
              <small>{hospital}</small>
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </aside>

        <main className="desk-main" id="main-content">{children}</main>

        <nav className="ios-tabbar" aria-label="Main navigation">
          {navigation.map((item) => <TabItem key={item.href} item={item} currentPath={router.pathname} />)}
        </nav>

        <SettingsSheet hospital={hospital} install={install} name={name} open={settingsOpen} push={push} onClose={() => setSettingsOpen(false)} />
      </div>
    </ShellContext>
  );
}

function isActive(item, currentPath) {
  return item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href);
}

function NavItem({ item, currentPath }) {
  const Icon = item.icon;
  const active = isActive(item, currentPath);
  return (
    <Link aria-current={active ? 'page' : undefined} className="desk-nav-item" href={item.href}>
      <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}

function TabItem({ item, currentPath }) {
  const Icon = item.icon;
  const active = isActive(item, currentPath);
  return (
    <Link aria-current={active ? 'page' : undefined} className="ios-tab" href={item.href}>
      <Icon aria-hidden="true" size={25} strokeWidth={active ? 2.3 : 1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

// iOS sheet: who is signed in, notifications, Home Screen, sign out.
function SettingsSheet({ hospital, install, name, onClose, open, push }) {
  const dialogRef = useRef(null);
  const { session, signOut } = useAuth();
  const [showSteps, setShowSteps] = useState(false);
  const phone = String(session?.doctor?.phone_number || '').replace(/^\+91/, '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onSwitch = () => {
    if (push.state === 'on') void push.disable();
    else void push.enable();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-title"
      className="ios-sheet"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onClose={onClose}
    >
      <div className="ios-sheet-body">
        <span className="ios-grabber" aria-hidden="true" />
        <div className="ios-sheet-nav">
          <span />
          <h2 id="settings-title">Settings</h2>
          <button className="ios-text-button is-bold" type="button" onClick={onClose}>Done</button>
        </div>

        <div className="ios-profile">
          <span className="ios-profile-avatar" aria-hidden="true">{initialOf(name)}</span>
          <strong>{name}</strong>
          <span>{hospital}</span>
          {phone ? <span className="ios-profile-phone">+91 {formatMobile(phone)}</span> : null}
        </div>

        <div className="ios-section">
          <ul className="ios-group">
            <li className="ios-cell">
              <div className="ios-cell-link is-static is-setting">
                <span className="ios-icon is-red" aria-hidden="true"><Bell size={17} strokeWidth={2.4} /></span>
                <span className="ios-cell-body"><span className="ios-cell-title">Notifications</span></span>
                <button
                  aria-checked={push.state === 'on'}
                  aria-label="Notifications"
                  className="ios-switch"
                  disabled={push.busy || !['on', 'off'].includes(push.state)}
                  role="switch"
                  type="button"
                  onClick={onSwitch}
                />
              </div>
            </li>
          </ul>
          <p className="ios-section-foot">{notificationText(push.state)}</p>
          {push.error ? <p className="ios-section-foot is-error" role="alert">{push.error}</p> : null}
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
                  <span className="ios-icon is-blue" aria-hidden="true"><Smartphone size={17} strokeWidth={2.4} /></span>
                  <span className="ios-cell-body"><span className="ios-cell-title">Add to Home Screen</span></span>
                  <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
                </button>
              </li>
            </ul>
            {showSteps ? <InstallSteps /> : <p className="ios-section-foot">Opens full screen like an app, stays signed in, and can send notifications.</p>}
          </div>
        ) : null}

        <div className="ios-section">
          <ul className="ios-group">
            <li className="ios-cell">
              <button className="ios-cell-link is-setting is-destructive" type="button" onClick={() => { onClose(); void signOut(); }}>
                <span className="ios-icon is-gray" aria-hidden="true"><LogOut size={17} strokeWidth={2.4} /></span>
                <span className="ios-cell-body"><span className="ios-cell-title">Sign out</span></span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </dialog>
  );
}

function notificationText(state) {
  switch (state) {
    case 'on': return 'You hear when the nurse sees your patients or adds a new one, and get the day’s list at 8 AM.';
    case 'install': return 'On iPhone, add DrJiva to your Home Screen first and open it from there. Then turn this on.';
    case 'blocked': return 'Notifications are blocked for DrJiva. Allow them in your phone’s Settings, under Notifications.';
    case 'unsupported': return 'This browser cannot show notifications. Open DrJiva in Safari (iPhone) or Chrome (Android).';
    case 'checking': return 'Checking this phone…';
    default: return 'Hear when the nurse sees your patients or adds a new one, and get the day’s list at 8 AM.';
  }
}

// Safari has no install button: the three taps, in order.
export function InstallSteps() {
  if (!isIos()) {
    return <p className="ios-section-foot">In Chrome, open the ⋮ menu and choose “Add to Home screen” or “Install app”.</p>;
  }
  return (
    <ol className="ios-steps">
      <li><span aria-hidden="true">1</span><span>Tap Share <Share aria-hidden="true" size={17} strokeWidth={2.2} /> in Safari.</span></li>
      <li><span aria-hidden="true">2</span><span><SquarePlus aria-hidden="true" size={17} strokeWidth={2.2} /> <b>Add to Home Screen</b></span></li>
      <li><span aria-hidden="true">3</span><span>Open DrJiva from your Home Screen.</span></li>
    </ol>
  );
}
