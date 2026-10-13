import { ArrowRight, LockKeyhole } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useNurse } from '@/contexts/NurseContext';

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
      pinRef.current?.focus();
    }
  };

  return (
    <>
      <Head><title>Nurse login · DRJIVA</title></Head>
      <main className="app-login-shell nurse-login" id="main-content">
        <section className="app-login-content nurse-login-content" aria-labelledby="nurse-login-heading">
          <Image alt="" className="nurse-login-mark" height={72} priority src="/icons/drjiva-mark.png" width={72} />
          <div className="app-login-heading">
            <h1 id="nurse-login-heading">Nurse login</h1>
            <p>ఆరోగ్యమే మహాభాగ్యం</p>
            <span>Update your patients&apos; next visit and checklist.</span>
          </div>

          <form ref={formRef} className="app-login-form" onSubmit={submit}>
            <label className="app-login-field">
              <span>Mobile number</span>
              <div>
                <span className="india-flag" role="img" aria-label="India">🇮🇳</span>
                <input
                  aria-label="Mobile number"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={10}
                  name="mobile"
                  spellCheck={false}
                  value={mobile}
                  onChange={(event) => {
                    setError('');
                    setMobile(event.target.value.replace(/\D/g, '').slice(0, 10));
                  }}
                />
              </div>
            </label>
            <div className="app-login-field">
              <span id="nurse-pin-label">4-digit PIN</span>
              <div className="pin-input-wrap">
                <LockKeyhole aria-hidden="true" size={18} />
                <div className="pin-cells" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => (
                    <span className={index < pin.length ? 'filled' : ''} key={index}>{pin[index] ? '•' : ''}</span>
                  ))}
                </div>
                <input
                  ref={pinRef}
                  aria-describedby="nurse-pin-label"
                  aria-label="4-digit PIN"
                  autoComplete="current-password"
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
            </div>
            {error ? <p className="error-banner" role="alert">{error}</p> : null}
            <button className="primary-button app-login-button" type="submit" disabled={loading || mobile.length !== 10 || pin.length !== 4}>
              {loading ? 'Logging in…' : 'Log in'} <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>

          <p className="app-login-footer"><LockKeyhole aria-hidden="true" size={14} /> Forgot your PIN? Ask your DrJiva admin to reset it.</p>
        </section>
      </main>
    </>
  );
}
