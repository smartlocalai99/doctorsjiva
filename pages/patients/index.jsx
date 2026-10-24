import { Search, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CareMark, DeskError, DeskLoading, EmptyRow, NotLinked, RefreshButton, careText, dayDate, shortDate } from '@/components/doctor/DeskParts';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { searchPatients, toPatients } from '@/lib/nurse-directory';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pregnant', label: 'Pregnant' },
  { id: 'cycle', label: 'IUI cycle' },
  { id: 'missed', label: 'Didn’t come' },
];

const matches = {
  all: () => true,
  cycle: (patient) => Boolean(patient.cycle),
  missed: (patient) => Boolean(patient.missed),
  pregnant: (patient) => Boolean(patient.pregnancy),
};

export default function PatientsPage() {
  const { desk, error } = useDoctorDesk();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const everyone = useMemo(() => desk?.patients || [], [desk]);
  // The nurse desk's search (name, mobile digits, hospital ID).
  const searchable = useMemo(
    () => toPatients(everyone.map((patient) => [patient.id, patient.name, patient.mobile, patient.hospitalPatientId, '', []])),
    [everyone],
  );
  const shown = useMemo(() => {
    const byId = new Map(everyone.map((patient) => [patient.id, patient]));
    const base = query.trim().length >= 2
      ? searchPatients(searchable, query, 0).map((patient) => byId.get(patient.id))
      : [...everyone].sort(byNextVisit);
    return base.filter(matches[filter]);
  }, [everyone, filter, query, searchable]);

  return (
    <>
      <Head><title>Patients · DRJIVA Doctors</title></Head>
      <div className="desk-page">
        <header className="desk-page-head">
          <div>
            <h1 className="desk-page-title">Patients</h1>
            {desk?.doctor.linked ? <p className="desk-page-lead">{everyone.length} under your care at {desk.doctor.hospitalName}</p> : null}
          </div>
          <RefreshButton />
        </header>

        {error && !desk ? <DeskError /> : null}
        {!desk && !error ? <DeskLoading /> : null}
        {desk && !desk.doctor.linked ? <NotLinked doctor={desk.doctor} /> : null}

        {desk?.doctor.linked ? (
          <>
            <div className="desk-find">
              <div className="desk-search">
                <Search aria-hidden="true" size={18} />
                <input
                  aria-label="Search by name, mobile or hospital ID"
                  autoComplete="off"
                  placeholder="Search name, mobile or hospital ID"
                  spellCheck={false}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X aria-hidden="true" size={18} /></button>
                ) : null}
              </div>
              <div className="desk-filters" role="group" aria-label="Show">
                {FILTERS.map((entry) => (
                  <button aria-pressed={filter === entry.id} className={entry.id === 'missed' ? 'is-missed' : ''} key={entry.id} type="button" onClick={() => setFilter(entry.id)}>
                    {entry.label}
                    <span>{everyone.filter(matches[entry.id]).length}</span>
                  </button>
                ))}
              </div>
            </div>

            <ul className="desk-list">
              {shown.length
                ? shown.map((patient) => <PatientLine key={patient.id} patient={patient} today={desk.today} />)
                : <EmptyRow>{query ? 'No patient matches that search. Try the last 4 digits of her mobile.' : 'No patients in this list.'}</EmptyRow>}
            </ul>
          </>
        ) : null}
      </div>
    </>
  );
}

// Missed first, then by next visit date, then everyone else by name.
function byNextVisit(a, b) {
  if (Boolean(a.missed) !== Boolean(b.missed)) return a.missed ? -1 : 1;
  const left = a.next?.date || '9999';
  const right = b.next?.date || '9999';
  return left === right ? a.name.localeCompare(b.name) : left < right ? -1 : 1;
}

function PatientLine({ patient, today }) {
  let when = { text: 'No visit booked', tone: 'none' };
  if (patient.missed && !patient.next) when = { text: `Didn’t come on ${shortDate(patient.missed.date)}`, tone: 'missed' };
  else if (patient.next?.date === today) when = { text: 'Coming today', tone: 'today' };
  else if (patient.next) when = { text: `Next visit ${dayDate(patient.next.date)}`, tone: 'next' };
  return (
    <li className={`desk-row ${patient.missed && !patient.next ? 'is-missed' : ''}`}>
      <Link className="desk-row-link" href={`/patients/${patient.id}`}>
        <CareMark patient={patient} today={today} />
        <span className="desk-row-body">
          <span className="desk-row-top">
            <strong className="desk-row-name">{patient.name}</strong>
          </span>
          <span className="desk-row-meta">{[patient.hospitalPatientId, careText(patient)].filter(Boolean).join(' · ')}</span>
          <span className={`desk-when is-${when.tone}`}>{when.text}</span>
        </span>
      </Link>
    </li>
  );
}
