import { ArrowRight, BadgeCheck, LockKeyhole, Phone } from 'lucide-react';
import Head from 'next/head';
import { useState } from 'react';

import { AppLogo } from '@/components/AppLogo';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('9876543210');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(phone, code);
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Doctor login · DRJIVA</title></Head>
      <main className="social-login-shell" id="main-content">
        <section className="social-login-visual">
          <AppLogo inverse />
          <div className="login-reel" aria-hidden="true">
            <div className="reel-topic"><span>DRJIVA DOCTOR STUDIO</span><strong>Publish Clear Health Guidance.</strong><p>Your post moves directly from your studio to the patient feed.</p></div>
            <div className="reel-doctor"><span className="reel-avatar">RR</span><div><strong>Dr. Ritish Reddy <BadgeCheck size={14} fill="currentColor" /></strong><small>Gastroenterology · Asian Hospitals</small></div></div>
          </div>
          <p className="login-visual-caption">Create trusted health content that feels native to the way patients watch and learn.</p>
        </section>

        <section className="social-login-panel">
          <div className="login-form-wrap">
            <div className="lg:hidden"><AppLogo /></div>
            <p className="eyebrow mt-10 lg:mt-0">Doctor access</p>
            <h1>Welcome Back.</h1>
            <p className="login-intro">Use your registered mobile number and four-digit doctor code.</p>

            <form className="mt-8 grid gap-5" onSubmit={submit}>
              <label className="login-field">
                <span>Mobile number</span>
                <div><b>+91</b><Phone aria-hidden="true" size={18} /><input aria-label="Mobile number" inputMode="numeric" autoComplete="tel" maxLength={10} name="phone" spellCheck={false} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} /></div>
              </label>
              <label className="login-field">
                <span>Doctor code</span>
                <div><LockKeyhole aria-hidden="true" size={18} /><input aria-label="Doctor code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} name="doctor_code" spellCheck={false} type="password" placeholder="••••" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></div>
              </label>
              {error ? <p className="error-banner" role="alert">{error}</p> : null}
              <button className="primary-button w-full" type="submit" disabled={loading || phone.length !== 10 || code.length !== 4}>
                {loading ? 'Signing In…' : 'Sign In'} <ArrowRight aria-hidden="true" size={18} />
              </button>
            </form>

            <div className="test-access-card">
              <span>Testing access</span>
              <p><strong>98765 43210</strong><i />Code <strong>1234</strong></p>
              <small>Temporary access for Dr. Ritish Reddy</small>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
