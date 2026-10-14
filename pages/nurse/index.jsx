import { HeartPulse, Search, UserPlus, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { NurseFrame, NurseLoading } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { PatientRow, PatientRowSkeleton } from '@/components/nurse/PatientRow';
import { NewPregnancySheet } from '@/components/nurse/PlanSheets';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import { searchPatients } from '@/lib/nurse-directory';
import { formatMobile } from '@/lib/nurse-schedule';

const RECENT_COUNT = 4;

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

// A full mobile number (10 digits, optionally with 91 / +91).
function mobileDigits(query) {
  if (!/^[+\d\s()-]+$/.test(query)) return '';
  const digits = query.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return '';
}

function PatientSearch() {
  const router = useRouter();
  const { directory, ensureDirectory, loadDirectory, profile, rememberPatient } = useNurse();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [notFound, setNotFound] = useState(null);
  const [addName, setAddName] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addHospitalId, setAddHospitalId] = useState('');
  const [adding, setAdding] = useState(false);
  const [pregnancyOpen, setPregnancyOpen] = useState(false);

  useEffect(() => {
    ensureDirectory();
  }, [ensureDirectory]);

  const hospitalName = profile?.hospital?.name;
  const patients = directory.patients;
  const suggestions = useMemo(() => searchPatients(patients, query, 6), [patients, query]);
  const typing = query.trim().length >= 2;
  const listLoading = directory.status === 'idle' && !patients.length;

  const openPatient = (patient) => void router.push(`/nurse/patient/${patient.id}`);

  const changeQuery = (value) => {
    setQuery(value);
    setActiveIndex(-1);
    setNotFound(null);
    setHint('');
    setError('');
  };

  const search = async (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (activeIndex >= 0 && suggestions[activeIndex]) return openPatient(suggestions[activeIndex]);
    if (suggestions.length === 1) return openPatient(suggestions[0]);
    const mobile = mobileDigits(q);
    if (suggestions.length > 1 && !mobile) {
      setHint('More than one patient matches. Tap the right one in the list.');
      return;
    }
    // Not in the list: exact lookup by full mobile number or hospital ID.
    setSearching(true);
    setError('');
    setNotFound(null);
    try {
      const result = await nurseRequest('/api/nurse/find', { body: { query: mobile || q }, method: 'POST' });
      if (result.found) {
        await router.push(`/nurse/patient/${result.patientId}`);
        return;
      }
      setNotFound({ mobile, query: q });
      setAddMobile(mobile);
      setAddHospitalId(mobile ? '' : q);
      setAddName('');
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  };

  const onKeyDown = (event) => {
    if (!typing || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      changeQuery('');
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
      rememberPatient({ ...view.patient, lastSeen: profile?.today });
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
        <p className="nurse-lead">Type a name, mobile number or hospital ID.</p>

        <form className="nurse-search" onSubmit={search} role="search">
          <div className="nurse-field">
            <label className="sr-only" htmlFor="nurse-find">Name, mobile number or hospital ID</label>
            <div className="nurse-input-wrap">
              <Search aria-hidden="true" className="nurse-input-icon" size={20} />
              <input
                aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                aria-autocomplete="list"
                aria-controls="nurse-suggestions"
                aria-expanded={typing && suggestions.length > 0}
                autoComplete="off"
                autoFocus
                enterKeyHint="search"
                id="nurse-find"
                maxLength={40}
                placeholder="e.g. Lakshmi or 98490…"
                role="combobox"
                spellCheck={false}
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                onKeyDown={onKeyDown}
              />
              {query ? (
                <button aria-label="Clear search" className="nurse-input-clear" type="button" onClick={() => changeQuery('')}>
                  <X aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>
          </div>

          {typing ? (
            suggestions.length ? (
              <div aria-label="Matching patients" className="nurse-suggestions" id="nurse-suggestions" role="listbox">
                {suggestions.map((patient, index) => (
                  <PatientRow
                    id={`suggestion-${index}`}
                    key={patient.id}
                    option
                    patient={patient}
                    selected={index === activeIndex}
                    showDate={false}
                  />
                ))}
              </div>
            ) : listLoading ? null : (
              <p className="nurse-muted">No match in your patient list. Press Search to look up a full mobile number or hospital ID.</p>
            )
          ) : null}
          {hint ? <p className="nurse-muted" role="status">{hint}</p> : null}

          <button className="primary-button nurse-big-button" type="submit" disabled={!query.trim() || searching}>
            <Search aria-hidden="true" size={20} /> {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error ? <p className="error-banner" role="alert">{error}</p> : null}
      </section>

      {notFound ? (
        <section className="nurse-card" aria-labelledby="add-heading">
          <h2 className="nurse-card-title" id="add-heading">
            {notFound.mobile
              ? `No patient with ${formatMobile(notFound.mobile)} at ${hospitalName}`
              : `No patient matches “${notFound.query}” at ${hospitalName}`}
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

      <section className="nurse-section" aria-label="New pregnancy">
        <button className="nurse-action-button" type="button" onClick={() => setPregnancyOpen(true)}>
          <HeartPulse aria-hidden="true" size={22} /> New pregnancy
        </button>
        <p className="nurse-muted">Doctor confirmed a pregnancy? Start it here with her mobile number.</p>
      </section>

      <section className="nurse-section" aria-labelledby="recent-heading">
        <div className="nurse-list-head">
          <h2 className="nurse-card-title" id="recent-heading">Recent patients</h2>
          {patients.length > RECENT_COUNT ? (
            <Link className="nurse-link-button" href="/nurse/patients">View all ({patients.length.toLocaleString('en-IN')})</Link>
          ) : null}
        </div>
        {listLoading ? (
          <div className="nurse-patient-list">
            <PatientRowSkeleton />
            <PatientRowSkeleton />
            <PatientRowSkeleton />
          </div>
        ) : directory.status === 'error' && !patients.length ? (
          <div className="nurse-card">
            <p className="nurse-muted">The patient list could not load. Search still works.</p>
            <button className="nurse-link-button" type="button" onClick={() => void loadDirectory({ fresh: true })}>Try again</button>
          </div>
        ) : patients.length ? (
          <div className="nurse-patient-list">
            {patients.slice(0, RECENT_COUNT).map((patient) => <PatientRow key={patient.id} patient={patient} />)}
          </div>
        ) : (
          <p className="nurse-muted">No patients yet. Search a mobile number to add one.</p>
        )}
      </section>

      {pregnancyOpen ? (
        <NewPregnancySheet
          doctors={profile?.doctors || []}
          onClose={() => setPregnancyOpen(false)}
          onStarted={(patient) => {
            rememberPatient({ ...patient, lastSeen: profile?.today });
            void router.push(`/nurse/patient/${patient.id}?started=pregnancy`);
          }}
          today={profile?.today}
        />
      ) : null}
    </NurseFrame>
  );
}
