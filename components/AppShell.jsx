import { CalendarDays, LogOut, MonitorDown, Sun, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { DoctorDeskProvider, useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { NurseProvider } from '@/contexts/NurseContext';

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
      <main className="grid min-h-dvh place-items-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-label="Loading" />
      </main>
    );
  }
  if (isLogin) return children;
  return <DoctorDeskProvider><AppShell>{children}</AppShell></DoctorDeskProvider>;
}

function AppShell({ children }) {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { desk } = useDoctorDesk();
  const [installPrompt, setInstallPrompt] = useState(null);
  const name = desk?.doctor?.name || session?.doctor?.display_name || 'Doctor';
  const hospital = desk?.doctor?.hospitalName || session?.doctor?.hospital_name || '';

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <div className="desk-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="desk-sidebar" aria-label="Doctor desk">
        <div className="desk-brand">
          <Image alt="" height={36} src="/icons/drjiva-mark.png" width={36} />
          <span>DrJiva</span>
        </div>
        <nav className="desk-nav" aria-label="Main navigation">
          {navigation.map((item) => <NavItem key={item.href} item={item} currentPath={router.pathname} />)}
        </nav>
        <div className="mt-auto grid gap-3">
          {installPrompt ? (
            <button className="desk-nav-item" type="button" onClick={install}>
              <MonitorDown aria-hidden="true" size={19} /> Install app
            </button>
          ) : null}
          <div className="desk-account">
            <span className="desk-avatar" aria-hidden="true">{initial(name)}</span>
            <span className="min-w-0 flex-1">
              <strong>{name}</strong>
              <small>{hospital}</small>
            </span>
            <button className="desk-icon-button" type="button" onClick={signOut} aria-label="Sign out">
              <LogOut aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="desk-topbar">
        <span className="desk-avatar" aria-hidden="true">{initial(name)}</span>
        <div className="desk-topbar-who">
          <strong>{name}</strong>
          <span>{hospital}</span>
        </div>
        <button className="desk-icon-button" type="button" onClick={signOut} aria-label="Sign out">
          <LogOut aria-hidden="true" size={19} />
        </button>
      </header>

      <main className="desk-main" id="main-content">{children}</main>

      <nav className="desk-tabbar" aria-label="Main navigation">
        {navigation.map((item) => <TabItem key={item.href} item={item} currentPath={router.pathname} />)}
      </nav>
    </div>
  );
}

function initial(name) {
  return String(name).replace(/^Dr\.?\s*/i, '').slice(0, 1).toUpperCase() || 'D';
}

function isActive(item, currentPath) {
  return item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href);
}

function NavItem({ item, currentPath }) {
  const Icon = item.icon;
  const active = isActive(item, currentPath);
  return (
    <Link aria-current={active ? 'page' : undefined} className="desk-nav-item" href={item.href}>
      <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}

function TabItem({ item, currentPath }) {
  const Icon = item.icon;
  const active = isActive(item, currentPath);
  return (
    <Link aria-current={active ? 'page' : undefined} className="desk-tab" href={item.href}>
      <span className="desk-tab-icon"><Icon aria-hidden="true" size={21} strokeWidth={active ? 2.4 : 2} /></span>
      {item.label}
    </Link>
  );
}
