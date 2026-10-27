import { LockKeyhole } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useNurse } from '@/contexts/NurseContext';

// Typed or pasted with +91 / 0 in front: keep the last 10 digits.
function tenDigits(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Same look as the doctor login: mobile number, then the PIN as four dots.
export function NurseLogin() {
  const { login } = useNurse();
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pinRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (mobile.length === 10) pinRef.current?.focus();
  }, [mobile]);

  useEffect(() => {
    if (mobile.length === 10 && pin.length === 4 && !loading && !error) formRef.current?.requestSubmit();
  }, [error, loading, mobile, pin]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(mobile, pin);
    } catch (loginError) {
      setError(loginError.message);
      setPin('');
      setLoading(false);
      navigator.vibrate?.([30, 40, 30]);
      pinRef.current?.focus();
    }
  };

  return (
    <>
      <Head><title>Nurse login · DrJiva</title></Head>
      <main className="doc-login" id="main-content">
        <section className="doc-login-card" aria-labelledby="nurse-login-heading">
          <span className="doc-login-icon">
            <Image alt="DrJiva" height={60} priority src="/icons/drjiva-mark.png" width={60} />
          </span>
          <h1 id="nurse-login-heading">DrJiva Nurse</h1>
          <p className="doc-login-lead">Today’s patients, their tests, and the next visit date.</p>

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
                  name="mobile"
                  placeholder="10-digit mobile"
                  spellCheck={false}
                  value={mobile}
                  onChange={(event) => {
                    setError('');
                    setMobile(tenDigits(event.target.value));
                  }}
                />
              </span>
            </label>

            <div className="doc-login-pin-block">
              <span className="doc-login-label" id="nurse-pin-label">Enter your 4-digit PIN</span>
              <div className={`doc-login-pin ${error ? 'is-wrong' : ''}`}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span aria-hidden="true" className={index < pin.length ? 'is-filled' : ''} key={index} />
                ))}
                <input
                  ref={pinRef}
                  aria-labelledby="nurse-pin-label"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  inputMode="numeric"
                  maxLength={4}
                  name="pin"
                  spellCheck={false}
                  type="password"
                  value={pin}
                  onChange={(event) => {
                    setError('');
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                />
              </div>
              {error ? <p className="doc-login-error" role="alert">{error}</p> : null}
            </div>

            <button className="ios-button is-filled is-large" type="submit" disabled={loading || mobile.length !== 10 || pin.length !== 4}>
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
