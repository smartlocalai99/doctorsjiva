import { CalendarDays, CircleCheck, Clock, PhoneMissed } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';

import { AppTip } from '@/components/doctor/AppTip';
import { DeskError, DeskLoading, DeskSection, EmptyRow, NotLinked, PageHeader, VisitRow, shortDate } from '@/components/doctor/DeskParts';
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
      <Head><title>Today · DrJiva Doctors</title></Head>
      <div className="desk-page">
        <PageHeader kicker={today ? formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' }) : ' '} title="Today" />

        <AppTip />

        {error && !desk ? <DeskError /> : null}
        {!desk && !error ? <DeskLoading /> : null}
        {desk && !desk.doctor.linked ? <NotLinked doctor={desk.doctor} /> : null}

        {lists && desk.doctor.linked ? (
          <>
            <nav className="ios-tiles" aria-label="Today at a glance">
              <Tile count={lists.waiting.length} href="#coming-section" icon={Clock} label="Coming" tone="orange" />
              <Tile count={lists.seen.length} href="#seen-section" icon={CircleCheck} label="Seen" tone="green" />
              <Tile count={lists.missed.length} href="#missed-section" icon={PhoneMissed} label="Didn’t come" tone="red" />
              <Tile count={lists.tomorrow.length} href="#tomorrow-section" icon={CalendarDays} label="Tomorrow" tone="blue" />
            </nav>

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

            <DeskSection count={lists.tomorrow.length} id="tomorrow" link={<Link className="ios-section-link" href="/calendar">Calendar</Link>} title="Tomorrow">
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

// Like the lists in Reminders: an icon, the count, what it counts.
function Tile({ count, href, icon: Icon, label, tone }) {
  const empty = !count;
  return (
    <a className={`ios-tile-card ${empty ? 'is-empty' : ''}`} href={empty ? undefined : href} aria-disabled={empty || undefined}>
      <span className={`ios-icon is-round is-${tone}`} aria-hidden="true"><Icon size={18} strokeWidth={2.4} /></span>
      <b>{count}</b>
      <span>{label}</span>
    </a>
  );
}
