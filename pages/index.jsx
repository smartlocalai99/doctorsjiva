import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';

import { DeskError, DeskLoading, DeskSection, EmptyRow, NotLinked, RefreshButton, VisitRow, shortDate } from '@/components/doctor/DeskParts';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { addDays, formatDate } from '@/lib/nurse-schedule';

// Today: who is coming, who did not come back, who the nurse has seen.
export default function TodayPage() {
  const { desk, error, patients } = useDoctorDesk();

  const today = desk?.today;
  const lists = useMemo(() => {
    if (!desk) return null;
    const todays = desk.appointments.filter((entry) => entry.date === today);
    const tomorrow = addDays(today, 1);
    return {
      missed: desk.missed,
      seen: todays.filter((entry) => entry.status === 'seen'),
      tomorrow: desk.appointments.filter((entry) => entry.date === tomorrow && entry.status !== 'seen'),
      waiting: todays.filter((entry) => entry.status === 'expected'),
    };
  }, [desk, today]);

  return (
    <>
      <Head><title>Today · DRJIVA Doctors</title></Head>
      <div className="desk-page">
        <header className="desk-day">
          <div>
            <p className="desk-day-weekday">{today ? formatDate(today, { weekday: 'long' }) : 'Today'}</p>
            <h1 className="desk-day-date">{today ? formatDate(today, { day: 'numeric', month: 'long' }) : ' '}</h1>
            {lists && desk.doctor.linked ? <Summary lists={lists} /> : null}
          </div>
          <RefreshButton />
        </header>

        {error && !desk ? <DeskError /> : null}
        {!desk && !error ? <DeskLoading /> : null}
        {desk && !desk.doctor.linked ? <NotLinked doctor={desk.doctor} /> : null}

        {lists && desk.doctor.linked ? (
          <>
            <DeskSection count={lists.waiting.length} id="coming" title="Coming today" tone="today">
              {lists.waiting.length
                ? lists.waiting.map((entry) => <VisitRow appointment={entry} key={entry.key} patient={patients.get(entry.patientId)} today={today} />)
                : <EmptyRow>{lists.seen.length ? 'Everyone booked for today has been seen.' : 'No one is booked for today.'}</EmptyRow>}
            </DeskSection>

            {lists.missed.length ? (
              <DeskSection
                count={lists.missed.length}
                detail="Missed a visit in the last 30 days and has not been back."
                id="missed"
                title="Didn’t come"
                tone="missed"
              >
                {lists.missed.map((entry) => (
                  <VisitRow
                    appointment={entry}
                    footnote={entry.rebookedFor ? `Booked again for ${shortDate(entry.rebookedFor)}` : 'No new date booked'}
                    key={entry.key}
                    patient={patients.get(entry.patientId)}
                    showDate
                    today={today}
                  />
                ))}
              </DeskSection>
            ) : null}

            {lists.seen.length ? (
              <DeskSection count={lists.seen.length} id="seen" title="Seen today" tone="seen">
                {lists.seen.map((entry) => <VisitRow appointment={entry} key={entry.key} patient={patients.get(entry.patientId)} today={today} />)}
              </DeskSection>
            ) : null}

            <DeskSection count={lists.tomorrow.length} id="tomorrow" link={<Link href="/calendar">Calendar</Link>} title="Tomorrow">
              {lists.tomorrow.length
                ? lists.tomorrow.map((entry) => <VisitRow appointment={entry} key={entry.key} patient={patients.get(entry.patientId)} today={today} />)
                : <EmptyRow>No one is booked for tomorrow.</EmptyRow>}
            </DeskSection>
          </>
        ) : null}
      </div>
    </>
  );
}

// "2 seen, 3 still to come. 3 to call back."
function Summary({ lists }) {
  const seen = lists.seen.length;
  const waiting = lists.waiting.length;
  const missed = lists.missed.length;
  const parts = [];
  if (seen) parts.push(<span className="is-seen" key="seen">{seen} seen</span>);
  if (waiting) parts.push(<span className="is-today" key="waiting">{waiting} still to come</span>);
  return (
    <p className="desk-day-summary">
      {parts.length ? <>{parts.reduce((all, part, index) => (index ? [...all, ', ', part] : [part]), [])}.</> : 'No patients booked today.'}
      {missed ? <> <a className="is-missed" href="#missed">{missed} to call back.</a></> : null}
    </p>
  );
}
