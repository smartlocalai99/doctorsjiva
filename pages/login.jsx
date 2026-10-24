import { LockKeyhole } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

// Typed or pasted with +91 / 0 in front: keep the last 10 digits.
function tenDigits(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinFocused, setPinFocused] = useState(false);
  const pinInputRef = useRef(null);
  const formRef = useRef(null);

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
      pinInputRef.current?.focus();
    }
  };

  return (
    <>
      <Head><title>Doctor login · DRJIVA</title></Head>
      <main className="doc-login" id="main-content">
        <section className="doc-login-card" aria-labelledby="login-heading">
          <Image alt="DrJiva" className="doc-login-mark" height={64} priority src="/icons/drjiva-mark.png" width={64} />
          <h1 id="login-heading">Doctor login</h1>
          <p className="doc-login-telugu" lang="te">ఆరోగ్యమే మహాభాగ్యం</p>
          <p className="doc-login-lead">Your patients for today, what the nurse saved, and who didn&apos;t come.</p>

          <form ref={formRef} className="doc-login-form" onSubmit={submit}>
            <label className="doc-login-field">
              <span>Mobile number</span>
              <div className="doc-login-phone">
                <b aria-hidden="true">+91</b>
                <input
                  aria-label="Mobile number"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  name="phone"
                  placeholder="10-digit mobile"
                  spellCheck={false}
                  value={phone}
                  onChange={(event) => { setError(''); setPhone(tenDigits(event.target.value)); }}
                />
              </div>
            </label>

            <div className="doc-login-field">
              <span id="pin-label">4-digit PIN</span>
              <div className={`doc-login-pin ${pinFocused ? 'is-focused' : ''} ${error ? 'is-wrong' : ''}`}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    aria-hidden="true"
                    className={`${index < code.length ? 'is-filled' : ''} ${index === Math.min(code.length, 3) ? 'is-next' : ''}`}
                    key={index}
                  />
                ))}
                <input
                  ref={pinInputRef}
                  aria-describedby="pin-label"
                  aria-label="4-digit PIN"
                  autoComplete="current-password"
                  inputMode="numeric"
                  maxLength={4}
                  name="doctor_code"
                  spellCheck={false}
                  type="password"
                  value={code}
                  onBlur={() => setPinFocused(false)}
                  onChange={(event) => { setError(''); setCode(event.target.value.replace(/\D/g, '').slice(0, 4)); }}
                  onFocus={() => setPinFocused(true)}
                />
              </div>
            </div>

            {error ? <p className="doc-login-error" role="alert">{error}</p> : null}

            <button className="doc-login-button" type="submit" disabled={loading || phone.length !== 10 || code.length !== 4}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="doc-login-help"><LockKeyhole aria-hidden="true" size={14} /> Forgot your PIN? Ask your DrJiva admin to reset it.</p>
        </section>
      </main>
    </>
  );
}
