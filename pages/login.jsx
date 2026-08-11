import { FileImage, LayoutDashboard, UserRoundPen } from 'lucide-react';
import Head from 'next/head';
import { useState } from 'react';

import { AppLogo } from '@/components/AppLogo';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { continueWithGoogle, isPreview } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const continueToStudio = async () => {
    setLoading(true);
    setError('');
    try {
      await continueWithGoogle();
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sign in · DRJIVA Doctors</title></Head>
      <main className="login-shell">
        <section className="login-story">
          <AppLogo />
          <div className="login-copy">
            <p className="eyebrow eyebrow-light">Doctor content studio</p>
            <h1>Your health guidance, made simple.</h1>
            <p>Create posts, publish short health videos and manage your professional identity from any phone or computer.</p>
          </div>
          <div className="login-note" aria-hidden="true">
            <span>HEALTH NOTE / 08.11</span>
            <strong>Explain one useful thing today.</strong>
            <div className="note-lines"><i /><i /><i /></div>
          </div>
        </section>

        <section className="login-actions">
          <div className="w-full max-w-md">
            <div className="lg:hidden"><AppLogo /></div>
            <h2>Open your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Everything you need to publish and manage DRJIVA health content.</p>
            <div className="my-8 grid gap-4">
              <Feature icon={FileImage} title="Create content" text="Upload an image or short video." />
              <Feature icon={LayoutDashboard} title="Track performance" text="See views, likes and comments." />
              <Feature icon={UserRoundPen} title="Manage your profile" text="Update your photo, specialty and bio." />
            </div>
            <button className="google-button" type="button" onClick={continueToStudio} disabled={loading}>
              <GoogleMark />
              {loading ? 'Opening Google…' : 'Continue with Google'}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-muted">
              {isPreview ? 'Preview mode is active—no Google setup is required yet.' : 'Choose the Google account for your doctor workspace.'}
            </p>
            {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          </div>
        </section>
      </main>
    </>
  );
}

function Feature({ icon: Icon, title, text }) {
  return <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={20} /></span><div><strong className="block text-sm">{title}</strong><span className="text-xs text-muted">{text}</span></div></div>;
}

function GoogleMark() {
  return <span className="grid size-6 place-items-center rounded-full border-2 border-[#4285F4] text-sm font-extrabold text-[#4285F4]">G</span>;
}
