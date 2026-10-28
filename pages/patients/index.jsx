import { ChevronRight, Search, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CareMark, DeskError, DeskLoading, EmptyRow, NextVisitTag, NotLinked, PageHeader, careText, shortDate } from '@/components/doctor/DeskParts';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { byNextVisit, groupByNextVisit } from '@/lib/doctor-desk';
import { searchPatients, toPatients } from '@/lib/nurse-directory';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pregnant', label: 'Pregnant' },
  { id: 'cycle', label: 'IUI' },
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
  const searching = query.trim().length >= 2;
  const shown = useMemo(() => {
    const byId = new Map(everyone.map((patient) => [patient.id, patient]));
    const base = searching
      ? searchPatients(searchable, query, 0).map((patient) => byId.get(patient.id))
      : [...everyone].sort(byNextVisit);
    return base.filter(matches[filter]);
  }, [everyone, filter, query, searchable, searching]);
  // By next visit: today, tomorrow, this week, later, no visit booked.
  const groups = useMemo(() => (searching || !desk ? [] : groupByNextVisit(shown, desk.today)), [desk, searching, shown]);

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

            {searching || !shown.length ? (
              <section className="ios-section" aria-labelledby="patient-list">
                <div className="ios-section-head">
                  <h2 id="patient-list">{searching ? 'Results' : 'Patients'}</h2>
                  <span className="ios-section-count">{shown.length}</span>
                </div>
                <ul className="ios-group">
                  {shown.length
                    ? shown.map((patient) => <PatientLine key={patient.id} patient={patient} today={desk.today} />)
                    : <EmptyRow>{query ? 'No patient matches that search. Try the last 4 digits of her mobile.' : 'No patients in this list.'}</EmptyRow>}
                </ul>
              </section>
            ) : groups.map((group) => (
              <section className={`ios-section ${group.id === 'today' ? 'is-today' : ''}`} aria-labelledby={`next-${group.id}`} key={group.id}>
                <div className="ios-section-head">
                  <h2 id={`next-${group.id}`}>{group.title}</h2>
                  <span className="ios-section-count">{group.patients.length}</span>
                </div>
                <ul className="ios-group">
                  {group.patients.map((patient) => <PatientLine key={patient.id} patient={patient} today={desk.today} />)}
                </ul>
              </section>
            ))}
          </>
        ) : null}
      </div>
    </>
  );
}

// One patient: how far along, who, and on the right when she is next due.
function PatientLine({ patient, today }) {
  const missedThenBooked = patient.missed && patient.next;
  return (
    <li className="ios-cell">
      <Link className="ios-cell-link has-trail" href={`/patients/${patient.id}`}>
        <CareMark patient={patient} today={today} />
        <span className="ios-cell-body">
          <strong className="ios-cell-title">{patient.name}</strong>
          <span className="ios-cell-sub">
            <span>{careText(patient)}</span>
            {patient.hospitalPatientId ? <span className="is-id">{patient.hospitalPatientId}</span> : null}
          </span>
          {missedThenBooked ? <span className="ios-cell-line is-missed">Didn’t come on {shortDate(patient.missed.date)}</span> : null}
        </span>
        <NextVisitTag patient={patient} today={today} />
        <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
      </Link>
    </li>
  );
}
