import { Search, UserPlus } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { NurseFrame, NurseLoading } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import { formatMobile } from '@/lib/nurse-schedule';

export default function NurseHomePage() {
  const { status } = useNurse();
  if (status === 'loading') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  if (status === 'error') return <NurseOffline />;
  return <PatientSearch />;
}

function NurseOffline() {
  const { refresh } = useNurse();
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <div className="grid gap-4">
        <h1 className="nurse-title">Can&apos;t reach DrJiva</h1>
        <p className="text-base text-muted">Check the internet connection, then try again.</p>
        <button className="primary-button nurse-big-button" type="button" onClick={() => void refresh()}>Try again</button>
      </div>
    </main>
  );
}

function PatientSearch() {
  const router = useRouter();
  const { profile } = useNurse();
  const [mode, setMode] = useState('mobile');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(null);
  const [addName, setAddName] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addHospitalId, setAddHospitalId] = useState('');
  const [adding, setAdding] = useState(false);

  const hospitalName = profile?.hospital?.name;
  const canSearch = mode === 'mobile' ? query.length === 10 : query.trim().length > 0;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setQuery('');
    setNotFound(null);
    setError('');
  };

  const search = async (event) => {
    event.preventDefault();
    if (!canSearch) return;
    setSearching(true);
    setError('');
    setNotFound(null);
    try {
      const result = await nurseRequest('/api/nurse/find', { body: { query }, method: 'POST' });
      if (result.found) {
        await router.push(`/nurse/patient/${result.patientId}`);
        return;
      }
      setNotFound({ mode, query });
      setAddMobile(mode === 'mobile' ? query : '');
      setAddHospitalId(mode === 'hospitalId' ? query.trim() : '');
      setAddName('');
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  };

  const addPatient = async (event) => {
    event.preventDefault();
    setAdding(true);
    setError('');
    try {
      const view = await nurseRequest('/api/nurse/patient', {
        body: { hospitalPatientId: addHospitalId, mobile: addMobile, name: addName },
        method: 'POST',
      });
      await router.push(`/nurse/patient/${view.patient.id}`);
    } catch (addError) {
      setError(addError.message);
      setAdding(false);
    }
  };

  return (
    <NurseFrame>
      <Head><title>Find patient · DRJIVA Nurse</title></Head>
      <section className="nurse-section" aria-labelledby="find-heading">
        <h1 className="nurse-title" id="find-heading">Find a patient</h1>
        <p className="nurse-lead">Type the full number. Only {hospitalName} patients show up.</p>

        <div className="nurse-segment" role="tablist" aria-label="Search by">
          <button aria-selected={mode === 'mobile'} role="tab" type="button" onClick={() => switchMode('mobile')}>
            Mobile number
          </button>
          <button aria-selected={mode === 'hospitalId'} role="tab" type="button" onClick={() => switchMode('hospitalId')}>
            Hospital ID
          </button>
        </div>

        <form className="nurse-search" onSubmit={search}>
          <label className="nurse-field">
            <span className="sr-only">{mode === 'mobile' ? '10-digit mobile number' : 'Hospital patient ID (UHID / MRN)'}</span>
            <div className="nurse-input-wrap">
              {mode === 'mobile' ? <span className="nurse-input-prefix">+91</span> : null}
              <input
                autoComplete="off"
                autoFocus
                enterKeyHint="search"
                inputMode={mode === 'mobile' ? 'numeric' : 'text'}
                maxLength={mode === 'mobile' ? 10 : 40}
                placeholder={mode === 'mobile' ? '10-digit mobile' : 'UHID / MRN'}
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setNotFound(null);
                  setQuery(mode === 'mobile' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value);
                }}
              />
            </div>
          </label>
          <button className="primary-button nurse-big-button" type="submit" disabled={!canSearch || searching}>
            <Search aria-hidden="true" size={20} /> {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error ? <p className="error-banner" role="alert">{error}</p> : null}
      </section>

      {notFound ? (
        <section className="nurse-card" aria-labelledby="add-heading">
          <h2 className="nurse-card-title" id="add-heading">
            {notFound.mode === 'mobile'
              ? `No patient with ${formatMobile(notFound.query)} at ${hospitalName}`
              : `No patient with ID ${notFound.query} at ${hospitalName}`}
          </h2>
          <p className="nurse-muted">Add them now. They will see their visits when they open DrJiva with this mobile number.</p>
          <form className="nurse-form" onSubmit={addPatient}>
            <label className="nurse-field">
              <span>Mobile number</span>
              <div className="nurse-input-wrap">
                <span className="nurse-input-prefix">+91</span>
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={addMobile}
                  onChange={(event) => setAddMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </label>
            <label className="nurse-field">
              <span>Patient name</span>
              <div className="nurse-input-wrap">
                <input autoComplete="off" maxLength={80} required value={addName} onChange={(event) => setAddName(event.target.value)} />
              </div>
            </label>
            <label className="nurse-field">
              <span>Hospital ID <em>optional</em></span>
              <div className="nurse-input-wrap">
                <input autoComplete="off" maxLength={40} placeholder="UHID / MRN" value={addHospitalId} onChange={(event) => setAddHospitalId(event.target.value)} />
              </div>
            </label>
            <button
              className="primary-button nurse-big-button"
              type="submit"
              disabled={adding || addMobile.length !== 10 || addName.trim().length < 2}
            >
              <UserPlus aria-hidden="true" size={20} /> {adding ? 'Adding…' : 'Add patient'}
            </button>
          </form>
        </section>
      ) : null}
    </NurseFrame>
  );
}
