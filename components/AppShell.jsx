/* eslint-disable @next/next/no-img-element -- doctor avatars are user-uploaded URLs and local IndexedDB blob previews */
import {
  CircleUserRound,
  FilePlus2,
  Home,
  LogOut,
  MonitorDown,
  PanelsTopLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AppLogo } from './AppLogo';

const navigation = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/create', label: 'Create', icon: FilePlus2 },
  { href: '/posts', label: 'Posts', icon: PanelsTopLeft },
  { href: '/profile', label: 'Profile', icon: CircleUserRound },
];

export function RouteGuard({ children }) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const isLogin = router.pathname === '/login';

  useEffect(() => {
    if (loading) return;
    if (!session && !isLogin) void router.replace('/login');
    if (session && isLogin) void router.replace('/');
  }, [isLogin, loading, router, session]);

  if (loading || (!session && !isLogin) || (session && isLogin)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-label="Loading" />
      </main>
    );
  }
  if (isLogin) return children;
  return <AppShell>{children}</AppShell>;
}

function AppShell({ children }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { profile } = useWorkspace();
  const [installPrompt, setInstallPrompt] = useState(null);

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
    <div className="min-h-dvh bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white px-5 py-6 lg:flex">
        <AppLogo />
        <nav className="mt-10 grid gap-2" aria-label="Main navigation">
          {navigation.map((item) => <NavItem key={item.href} item={item} currentPath={router.pathname} />)}
        </nav>
        <div className="mt-auto grid gap-3">
          {installPrompt ? (
            <button className="quiet-button justify-start" type="button" onClick={install}>
              <MonitorDown size={18} /> Install app
            </button>
          ) : null}
          <div className="rounded-2xl border border-line bg-canvas p-3">
            <div className="flex items-center gap-3">
              <Avatar profile={profile} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{profile?.display_name || 'Doctor'}</p>
                <p className="truncate text-xs text-muted">{profile?.specialty || 'Complete your profile'}</p>
              </div>
              <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out">
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <AppLogo compact />
        <Link href="/profile" aria-label="Open profile"><Avatar profile={profile} /></Link>
      </header>

      <main className="min-h-dvh pb-24 lg:ml-64 lg:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white/95 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {navigation.map((item) => <MobileNavItem key={item.href} item={item} currentPath={router.pathname} />)}
      </nav>
    </div>
  );
}

function NavItem({ item, currentPath }) {
  const Icon = item.icon;
  const active = item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href);
  return (
    <Link className={`nav-item ${active ? 'nav-item-active' : ''}`} href={item.href}>
      <Icon size={19} strokeWidth={2.1} />
      {item.label}
    </Link>
  );
}

function MobileNavItem({ item, currentPath }) {
  const Icon = item.icon;
  const active = item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href);
  return (
    <Link className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-semibold ${active ? 'text-brand' : 'text-muted'}`} href={item.href}>
      <Icon size={21} strokeWidth={active ? 2.5 : 2} />
      {item.label}
    </Link>
  );
}

function Avatar({ profile }) {
  if (profile?.avatar_url) {
    return <img className="size-10 rounded-full border border-line object-cover" src={profile.avatar_url} alt="" />;
  }
  return (
    <span className="grid size-10 place-items-center rounded-full border border-line bg-slate-100 text-sm font-extrabold text-slate-600">
      {(profile?.display_name || 'D').replace('Dr. ', '').slice(0, 1).toUpperCase()}
    </span>
  );
}
