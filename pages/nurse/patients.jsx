import { RefreshCw, Search, X } from 'lucide-react';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/doctor/DeskParts';
import { NurseFrame, NurseLoading, NurseNavActions } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { PatientRow, PatientRowSkeleton } from '@/components/nurse/PatientRow';
import { useRemovePatient } from '@/components/nurse/RemovePatient';
import { useNurse } from '@/contexts/NurseContext';
import { patientsOfDoctor, searchPatients } from '@/lib/nurse-directory';

const PAGE = 40;

export default function NursePatientsPage() {
  const { status } = useNurse();
  if (status === 'loading' || status === 'error') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  return <AllPatients />;
}

// Every patient of the nurse's hospital, newest first. Uses the list the
// desk already loaded; filtering happens on the phone.
function AllPatients() {
  const { deskDoctor, directory, ensureDirectory, loadDirectory, profile } = useNurse();
  const { removeSheet, requestRemove } = useRemovePatient();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('mine');
  const [shown, setShown] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    ensureDirectory();
  }, [ensureDirectory]);

  const everyone = directory.patients;
  const patients = useMemo(
    () => (deskDoctor && scope === 'mine' ? patientsOfDoctor(everyone, deskDoctor.id) : everyone),
    [deskDoctor, everyone, scope],
  );
  const filtered = useMemo(
    () => (query.trim().length >= 2 ? searchPatients(patients, query, 0) : patients),
    [patients, query],
  );
  const loading = directory.status === 'idle' && !patients.length;

  const refresh = async () => {
    setRefreshing(true);
    await loadDirectory({ fresh: true });
    setRefreshing(false);
  };

  return (
    <NurseFrame>
      <Head><title>Patients · DrJiva Nurse</title></Head>
      <PageHeader
        lead={<p>{loading ? 'Loading…' : `${patients.length.toLocaleString('en-IN')} at ${profile?.hospital?.name || 'your hospital'}`}</p>}
        title="Patients"
        trailing={(
          <>
            <button aria-label="Refresh the list" className="ios-nav-icon" disabled={refreshing} type="button" onClick={() => void refresh()}>
              <RefreshCw aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} size={20} />
            </button>
            <NurseNavActions />
          </>
        )}
      />

      <div className="ios-find">
        <label className="ios-search">
          <Search aria-hidden="true" size={17} strokeWidth={2.4} />
          <span className="sr-only">Filter by name, mobile or hospital ID</span>
          <input
            autoComplete="off"
            enterKeyHint="search"
            maxLength={40}
            placeholder="Name, mobile or hospital ID"
            spellCheck={false}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE);
            }}
          />
          {query ? (
            <button aria-label="Clear filter" type="button" onClick={() => setQuery('')}><X aria-hidden="true" size={12} strokeWidth={3} /></button>
          ) : null}
        </label>
        {deskDoctor ? (
          <div className="ios-segmented" role="group" aria-label="Whose patients">
            <button aria-pressed={scope === 'mine'} type="button" onClick={() => { setScope('mine'); setShown(PAGE); }}>
              {deskDoctor.name}
            </button>
            <button aria-pressed={scope === 'all'} type="button" onClick={() => { setScope('all'); setShown(PAGE); }}>
              Everyone
            </button>
          </div>
        ) : null}
      </div>

      <section className="ios-section" aria-labelledby="patients-list">
        <div className="ios-section-head">
          <h2 id="patients-list">{query.trim().length >= 2 ? 'Results' : scope === 'mine' && deskDoctor ? `${deskDoctor.name}’s patients` : 'All patients'}</h2>
          {!loading ? <span className="ios-section-count">{filtered.length.toLocaleString('en-IN')}</span> : null}
        </div>
        {loading ? (
          <div className="ios-group">
            {Array.from({ length: 6 }, (_, index) => <PatientRowSkeleton key={index} />)}
          </div>
        ) : filtered.length ? (
          <>
            <ul className="ios-group nurse-list">
              {filtered.slice(0, shown).map((patient) => (
                <li className="ios-cell" key={patient.id}><PatientRow onRemove={requestRemove} patient={patient} /></li>
              ))}
            </ul>
            <p className="ios-section-foot">Newest first. Swipe a patient left to remove them.</p>
            {filtered.length > shown ? (
              <button className="ios-button is-tinted" type="button" onClick={() => setShown((count) => count + PAGE)}>
                Show more ({(filtered.length - shown).toLocaleString('en-IN')} left)
              </button>
            ) : null}
          </>
        ) : (
          <div className="ios-notice">
            <p>{query ? `No patient matches “${query.trim()}”. Try the last 4 digits of the mobile number.` : 'No patients yet. Add one from Today with her mobile number.'}</p>
          </div>
        )}
      </section>
      {removeSheet}
    </NurseFrame>
  );
}
