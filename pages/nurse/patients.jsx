import { RefreshCw, Search, X } from 'lucide-react';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

import { NurseFrame, NurseLoading } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { PatientRow, PatientRowSkeleton } from '@/components/nurse/PatientRow';
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
    <NurseFrame backHref="/nurse">
      <Head><title>All patients · DRJIVA Nurse</title></Head>
      <section className="nurse-section" aria-labelledby="all-heading">
        <div className="nurse-list-head">
          <div>
            <h1 className="nurse-title" id="all-heading">All patients</h1>
            <p className="nurse-muted">
              {loading ? 'Loading…' : `${patients.length.toLocaleString('en-IN')} at ${profile?.hospital?.name || 'your hospital'}`}
            </p>
          </div>
          <button aria-label="Refresh the list" className="nurse-icon-button" disabled={refreshing} type="button" onClick={() => void refresh()}>
            <RefreshCw aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} size={20} />
          </button>
        </div>

        {deskDoctor ? (
          <div className="nurse-segment" role="tablist" aria-label="Whose patients">
            <button aria-selected={scope === 'mine'} role="tab" type="button" onClick={() => { setScope('mine'); setShown(PAGE); }}>
              {deskDoctor.name}
            </button>
            <button aria-selected={scope === 'all'} role="tab" type="button" onClick={() => { setScope('all'); setShown(PAGE); }}>
              All patients
            </button>
          </div>
        ) : null}

        <div className="nurse-field">
          <label className="sr-only" htmlFor="nurse-filter">Filter by name, mobile or hospital ID</label>
          <div className="nurse-input-wrap">
            <Search aria-hidden="true" className="nurse-input-icon" size={20} />
            <input
              autoComplete="off"
              enterKeyHint="search"
              id="nurse-filter"
              maxLength={40}
              placeholder="Name, mobile or hospital ID"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE);
              }}
            />
            {query ? (
              <button aria-label="Clear filter" className="nurse-input-clear" type="button" onClick={() => setQuery('')}>
                <X aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="nurse-patient-list">
            {Array.from({ length: 6 }, (_, index) => <PatientRowSkeleton key={index} />)}
          </div>
        ) : filtered.length ? (
          <>
            {query.trim().length >= 2 ? (
              <p className="nurse-muted" role="status">{filtered.length} {filtered.length === 1 ? 'match' : 'matches'}</p>
            ) : null}
            <div className="nurse-patient-list">
              {filtered.slice(0, shown).map((patient) => <PatientRow key={patient.id} patient={patient} />)}
            </div>
            {filtered.length > shown ? (
              <button className="secondary-button nurse-big-button" type="button" onClick={() => setShown((count) => count + PAGE)}>
                Show more ({(filtered.length - shown).toLocaleString('en-IN')} left)
              </button>
            ) : null}
          </>
        ) : (
          <p className="nurse-muted">{query ? `No patient matches “${query.trim()}”.` : 'No patients yet.'}</p>
        )}
      </section>
    </NurseFrame>
  );
}
