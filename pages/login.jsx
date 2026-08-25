import { ArrowRight, LockKeyhole } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

const carouselImages = ['ritish', 'prime', 'rekha', 'prime2', 'holistics', 'asian', 'holistics2'];

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pinInputRef = useRef(null);

  useEffect(() => {
    if (phone.length === 10) pinInputRef.current?.focus();
  }, [phone]);

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
      <main className="app-login-shell" id="main-content">
        <div className="login-carousel" aria-hidden="true">
          {[0, 2, 4].map((offset, rowIndex) => (
            <div className={`login-carousel-row ${rowIndex % 2 ? 'reverse' : ''}`} key={offset}>
              {[...carouselImages, ...carouselImages].map((image, index) => (
                <Image alt="" height={92} key={`${image}-${index}`} src={`/login-carousel/${image}.png`} width={92} />
              ))}
            </div>
          ))}
        </div>
        <section className="app-login-content" aria-labelledby="login-heading">
          <div className="app-login-heading">
            <h1 id="login-heading">Welcome to DR JIVA</h1>
            <p>ఆరోగ్యమే మహాభాగ్యం</p>
            <span>Sign in to continue to your doctor studio.</span>
          </div>

          <form className="app-login-form" onSubmit={submit}>
            <label className="app-login-field">
              <span>Mobile number</span>
              <div><span className="india-flag" role="img" aria-label="India">🇮🇳</span><input aria-label="Mobile number" inputMode="numeric" autoComplete="tel" maxLength={10} name="phone" spellCheck={false} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} /></div>
            </label>
            <div className="app-login-field">
              <span id="pin-label">4-digit PIN</span>
              <div className="pin-input-wrap">
                <LockKeyhole aria-hidden="true" size={18} />
                <div className="pin-cells" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => <span className={index < code.length ? 'filled' : ''} key={index}>{code[index] ? '•' : ''}</span>)}
                </div>
                <input ref={pinInputRef} aria-describedby="pin-label" aria-label="4-digit PIN" autoComplete="one-time-code" inputMode="numeric" maxLength={4} name="doctor_code" spellCheck={false} type="password" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
            </div>
            {error ? <p className="error-banner" role="alert">{error}</p> : null}
            <button className="primary-button app-login-button" type="submit" disabled={loading || phone.length !== 10 || code.length !== 4}>
              {loading ? 'Signing In…' : 'Continue'} <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>

          <p className="app-login-footer"><LockKeyhole aria-hidden="true" size={14} /> Your details are secure with DRJIVA</p>
        </section>
      </main>
    </>
  );
}
