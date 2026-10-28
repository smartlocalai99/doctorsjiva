import { RefreshCw, Search, X } from 'lucide-react';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/doctor/DeskParts';
import { NurseFrame, NurseLoading, NurseNavActions } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { PatientRow, PatientRowSkeleton } from '@/components/nurse/PatientRow';
import { useRemovePatient } from '@/components/nurse/RemovePatient';
import { useNurse, useNurseSchedule, withSchedule } from '@/contexts/NurseContext';
import { byNextVisit, groupByNextVisit } from '@/lib/doctor-desk';
import { patientsOfDoctor, searchPatients } from '@/lib/nurse-directory';

const PAGE = 40;

export default function NursePatientsPage() {
  const { status } = useNurse();
  if (status === 'loading' || status === 'error') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  return <AllPatients />;
}

// Every patient of the nurse's hospital, by when she is next due: today,
// tomorrow, this week, later, no visit booked. Uses the list the desk
// already loaded; filtering and sorting happen on the phone.
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
  const schedule = useNurseSchedule();
  const scheduled = schedule.status === 'ready';
  const searching = query.trim().length >= 2;
  // Search keeps its best-match order; otherwise soonest visit first.
  const ordered = useMemo(() => {
    if (!scheduled) return filtered;
    const list = filtered.map((patient) => withSchedule(patient, schedule));
    return searching ? list : list.sort(byNextVisit);
  }, [filtered, schedule, scheduled, searching]);
  const groups = useMemo(
    () => (scheduled && !searching ? groupByNextVisit(ordered.slice(0, shown), schedule.today) : null),
    [ordered, schedule, scheduled, searching, shown],
  );

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

      {loading ? (
        <div className="ios-group">
          {Array.from({ length: 6 }, (_, index) => <PatientRowSkeleton key={index} />)}
        </div>
      ) : ordered.length ? (
        <>
          {groups ? groups.map((group) => (
            <section className={`ios-section ${group.id === 'today' ? 'is-today' : ''}`} aria-labelledby={`next-${group.id}`} key={group.id}>
              <div className="ios-section-head">
                <h2 id={`next-${group.id}`}>{group.title}</h2>
                <span className="ios-section-count">{group.patients.length.toLocaleString('en-IN')}</span>
              </div>
              <ul className="ios-group nurse-list">
                {group.patients.map((patient) => (
                  <li className="ios-cell" key={patient.id}><PatientRow onRemove={requestRemove} patient={patient} today={schedule.today} /></li>
                ))}
              </ul>
            </section>
          )) : (
            <section className="ios-section" aria-labelledby="patients-list">
              <div className="ios-section-head">
                <h2 id="patients-list">{searching ? 'Results' : scope === 'mine' && deskDoctor ? `${deskDoctor.name}’s patients` : 'All patients'}</h2>
                <span className="ios-section-count">{ordered.length.toLocaleString('en-IN')}</span>
              </div>
              <ul className="ios-group nurse-list">
                {ordered.slice(0, shown).map((patient) => (
                  <li className="ios-cell" key={patient.id}>
                    <PatientRow onRemove={requestRemove} patient={patient} today={scheduled ? schedule.today : null} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="ios-section-foot">
            {searching ? 'Best matches first.' : scheduled ? 'Soonest visit first.' : 'Loading next visits…'} Swipe a patient left to remove them.
          </p>
          {ordered.length > shown ? (
            <button className="ios-button is-tinted" type="button" onClick={() => setShown((count) => count + PAGE)}>
              Show more ({(ordered.length - shown).toLocaleString('en-IN')} left)
            </button>
          ) : null}
        </>
      ) : (
        <div className="ios-notice">
          <p>{query ? `No patient matches “${query.trim()}”. Try the last 4 digits of the mobile number.` : 'No patients yet. Add one from Today with her mobile number.'}</p>
        </div>
      )}
      {removeSheet}
    </NurseFrame>
  );
}
