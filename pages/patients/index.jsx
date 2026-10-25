import { ChevronRight, Search, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CareMark, DeskError, DeskLoading, EmptyRow, NotLinked, PageHeader, careText, dayDate, shortDate } from '@/components/doctor/DeskParts';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { searchPatients, toPatients } from '@/lib/nurse-directory';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pregnant', label: 'Pregnant' },
  { id: 'cycle', label: 'IUI' },
  { id: 'missed', label: 'Didn’t come' },
];

const LIST_TITLE = { all: 'All patients', cycle: 'OI-TI / IUI cycle', missed: 'Didn’t come', pregnant: 'Pregnant' };

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
      <Head><title>Patients · DrJiva Doctors</title></Head>
      <div className="desk-page">
        <PageHeader
          lead={desk?.doctor.linked ? <p>{everyone.length} under your care at {desk.doctor.hospitalName}</p> : null}
          title="Patients"
        />

        {error && !desk ? <DeskError /> : null}
        {!desk && !error ? <DeskLoading /> : null}
        {desk && !desk.doctor.linked ? <NotLinked doctor={desk.doctor} /> : null}

        {desk?.doctor.linked ? (
          <>
            <div className="ios-find">
              <label className="ios-search">
                <Search aria-hidden="true" size={17} strokeWidth={2.4} />
                <input
                  aria-label="Search by name, mobile or hospital ID"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="Name, mobile or hospital ID"
                  spellCheck={false}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X aria-hidden="true" size={12} strokeWidth={3} /></button>
                ) : null}
              </label>
              <div className="ios-segmented" role="group" aria-label="Show">
                {FILTERS.map((entry) => (
                  <button aria-pressed={filter === entry.id} key={entry.id} type="button" onClick={() => setFilter(entry.id)}>
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            <section className="ios-section" aria-labelledby="patient-list">
              <div className="ios-section-head">
                <h2 id="patient-list">{query.trim().length >= 2 ? 'Results' : LIST_TITLE[filter]}</h2>
                <span className="ios-section-count">{shown.length}</span>
              </div>
              <ul className="ios-group">
                {shown.length
                  ? shown.map((patient) => <PatientLine key={patient.id} patient={patient} today={desk.today} />)
                  : <EmptyRow>{query ? 'No patient matches that search. Try the last 4 digits of her mobile.' : 'No patients in this list.'}</EmptyRow>}
              </ul>
            </section>
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
    <li className="ios-cell">
      <Link className="ios-cell-link" href={`/patients/${patient.id}`}>
        <CareMark patient={patient} today={today} />
        <span className="ios-cell-body">
          <strong className="ios-cell-title">{patient.name}</strong>
          <span className="ios-cell-sub">
            <span>{careText(patient)}</span>
            {patient.hospitalPatientId ? <span className="is-id">{patient.hospitalPatientId}</span> : null}
          </span>
          <span className={`ios-when is-${when.tone}`}>{when.text}</span>
        </span>
        <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
      </Link>
    </li>
  );
}
