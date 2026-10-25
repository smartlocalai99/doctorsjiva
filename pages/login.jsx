import { LockKeyhole } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

// Typed or pasted with +91 / 0 in front: keep the last 10 digits.
function tenDigits(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pinInputRef = useRef(null);
  const formRef = useRef(null);

  // Today's page is ready before she finishes typing.
  useEffect(() => {
    void router.prefetch('/');
  }, [router]);

  useEffect(() => {
    if (phone.length === 10) pinInputRef.current?.focus();
  }, [phone]);

  useEffect(() => {
    // Not again after a wrong PIN: the PIN is cleared and she types a new one.
    if (phone.length === 10 && code.length === 4 && !loading && !error) formRef.current?.requestSubmit();
  }, [code, error, loading, phone]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(phone, code);
    } catch (loginError) {
      setError(loginError.message);
      setCode('');
      setLoading(false);
      navigator.vibrate?.([30, 40, 30]);
      pinInputRef.current?.focus();
    }
  };

  return (
    <>
      <Head><title>Doctor login · DrJiva</title></Head>
      <main className="doc-login" id="main-content">
        <section className="doc-login-card" aria-labelledby="login-heading">
          <span className="doc-login-icon">
            <Image alt="DrJiva" height={60} priority src="/icons/drjiva-mark.png" width={60} />
          </span>
          <h1 id="login-heading">DrJiva Doctors</h1>
          <p className="doc-login-lead">Today’s patients, what the nurse saved, and who didn’t come.</p>

          <form ref={formRef} className="doc-login-form" onSubmit={submit}>
            <label className="doc-login-group">
              <span className="doc-login-label">Mobile number</span>
              <span className="doc-login-phone">
                <b aria-hidden="true">+91</b>
                <input
                  aria-label="Mobile number"
                  autoComplete="tel-national"
                  autoFocus
                  enterKeyHint="next"
                  inputMode="numeric"
                  name="phone"
                  placeholder="10-digit mobile"
                  spellCheck={false}
                  value={phone}
                  onChange={(event) => { setError(''); setPhone(tenDigits(event.target.value)); }}
                />
              </span>
            </label>

            <div className="doc-login-pin-block">
              <span className="doc-login-label" id="pin-label">Enter your 4-digit PIN</span>
              <div className={`doc-login-pin ${error ? 'is-wrong' : ''}`}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span aria-hidden="true" className={index < code.length ? 'is-filled' : ''} key={index} />
                ))}
                <input
                  ref={pinInputRef}
                  aria-labelledby="pin-label"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  inputMode="numeric"
                  maxLength={4}
                  name="doctor_code"
                  spellCheck={false}
                  type="password"
                  value={code}
                  onChange={(event) => { setError(''); setCode(event.target.value.replace(/\D/g, '').slice(0, 4)); }}
                />
              </div>
              {error ? <p className="doc-login-error" role="alert">{error}</p> : null}
            </div>

            <button className="ios-button is-filled is-large" type="submit" disabled={loading || phone.length !== 10 || code.length !== 4}>
              {loading ? <span className="ios-spinner is-light" aria-hidden="true" /> : null}
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="doc-login-help"><LockKeyhole aria-hidden="true" size={14} /> Forgot your PIN? Ask your DrJiva admin to reset it.</p>
          <p className="doc-login-telugu" lang="te">ఆరోగ్యమే మహాభాగ్యం</p>
        </section>
      </main>
    </>
  );
}
