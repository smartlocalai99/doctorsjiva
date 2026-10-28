import { ChevronLeft, ChevronRight, FlaskConical, Phone, RefreshCw, Stethoscope, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { useShell } from '@/contexts/ShellContext';
import { untilText } from '@/lib/doctor-desk';
import { childAge, formatDate, formatMobile, ordinal } from '@/lib/nurse-schedule';

export const shortDate = (date) => formatDate(date, { day: 'numeric', month: 'short' });
export const dayDate = (date) => formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' });

export function pregnancyText(pregnancy) {
  return `${pregnancy.week} ${pregnancy.week === 1 ? 'week' : 'weeks'}, ${ordinal(pregnancy.month)} month`;
}

export function initialOf(name) {
  return String(name || '').replace(/^Dr\.?\s*/i, '').slice(0, 1).toUpperCase() || 'D';
}

// iOS navigation bar over a large title. The small title fades in once
// the large one scrolls under the bar.
export function PageHeader({ above, back, kicker, lead, title, trailing }) {
  const titleRef = useRef(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const node = titleRef.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { rootMargin: '-56px 0px 0px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className={`ios-navbar ${compact ? 'is-compact' : ''}`}>
        <div className="ios-navbar-side">{back}</div>
        <p className="ios-navbar-title" aria-hidden="true">{title}</p>
        <div className="ios-navbar-side is-trailing">{trailing === undefined ? <NavActions /> : trailing}</div>
      </div>
      <header className="ios-largetitle">
        {above}
        {kicker ? <p className="ios-kicker">{kicker}</p> : null}
        <h1 ref={titleRef}>{title}</h1>
        {lead ? <div className="ios-lead">{lead}</div> : null}
      </header>
    </>
  );
}

// Refresh (computers; phones pull down) and her picture, which opens settings.
export function NavActions() {
  const { refresh, refreshing } = useDoctorDesk();
  const { openSettings } = useShell();
  const { session } = useAuth();
  const { desk } = useDoctorDesk();
  const name = desk?.doctor?.name || session?.doctor?.display_name || 'Doctor';
  return (
    <>
      <button className="ios-nav-icon is-wide-only" disabled={refreshing} type="button" onClick={refresh} aria-label="Refresh">
        <RefreshCw aria-hidden="true" className={refreshing ? 'animate-spin' : ''} size={20} />
      </button>
      <button className="ios-nav-avatar" type="button" onClick={openSettings} aria-label="Settings and notifications">
        {initialOf(name)}
      </button>
    </>
  );
}

export function BackButton({ label = 'Back', onBack }) {
  return (
    <button className="ios-back" type="button" onClick={onBack}>
      <ChevronLeft aria-hidden="true" size={28} strokeWidth={2.2} />
      <span>{label}</span>
    </button>
  );
}

// The tile at the start of every row, like the coloured icons in iOS
// Settings: weeks for a pregnancy, cycle day for IUI, age for a baby.
function careMark(patient, appointment, today) {
  const pregnancy = appointment?.pregnancy || patient?.pregnancy;
  if (pregnancy) {
    return { kind: 'pregnancy', label: `${pregnancy.week} weeks pregnant`, unit: 'wk', value: pregnancy.week };
  }
  const day = appointment?.cycleDay ?? patient?.cycle?.day;
  if (day) return { kind: 'cycle', label: `Cycle day ${day}`, unit: 'day', value: day };
  if (patient?.child?.birthDate) {
    const [value, unit] = childAge(patient.child.birthDate, today).split(' ');
    return { kind: 'child', label: `Baby, ${childAge(patient.child.birthDate, today)}`, unit: { months: 'mo', month: 'mo', weeks: 'wk', week: 'wk', years: 'yr', year: 'yr', days: 'd', day: 'd' }[unit] || '', value };
  }
  return { kind: 'visit', label: 'Follow-up' };
}

export function CareMark({ appointment, patient, today }) {
  const mark = careMark(patient, appointment, today);
  return (
    <span className={`ios-tile is-${mark.kind}`} role="img" aria-label={mark.label}>
      {mark.kind === 'visit' ? <Stethoscope aria-hidden="true" size={21} strokeWidth={2} /> : (
        <>
          <b>{mark.value}</b>
          <small>{mark.unit}</small>
        </>
      )}
    </span>
  );
}

// "6th month" / "OI-TI / IUI" / "Baby Arjun" under the name.
export function careText(patient, appointment) {
  const pregnancy = appointment?.pregnancy || patient?.pregnancy;
  if (pregnancy) return `${ordinal(pregnancy.month)} month`;
  if (appointment?.cycleDay ?? patient?.cycle?.day) return patient?.cycle?.title || 'OI-TI / IUI';
  if (patient?.child) return patient.child.name ? `Baby ${patient.child.name}` : 'Baby';
  return 'Follow-up';
}

const STATUS = {
  expected: 'Coming',
  late: 'Came late',
  missed: 'Didn’t come',
  seen: 'Seen',
  upcoming: 'Booked',
};

function seenAt(appointment) {
  if (!appointment.seenBy?.at) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(appointment.seenBy.at));
}

export function StatusTag({ appointment }) {
  const { status } = appointment;
  const time = status === 'seen' ? seenAt(appointment) : '';
  return (
    <span className={`ios-status is-${status}`}>
      {status === 'late' ? `Came ${shortDate(appointment.cameOn)}` : time || STATUS[status]}
    </span>
  );
}

// At the end of a patient row: when she is next due at the hospital,
// the date the lists are sorted by.
export function NextVisitTag({ patient, today }) {
  const date = patient?.next?.date;
  if (date) {
    const days = untilText(today, date);
    const near = days === 'Today' || days === 'Tomorrow';
    return (
      <span className={`ios-next ${days === 'Today' ? 'is-today' : ''}`}>
        <b>{near ? days : dayDate(date)}</b>
        <small>{near ? dayDate(date) : days}</small>
      </span>
    );
  }
  if (patient?.missed) {
    return (
      <span className="ios-next is-missed">
        <b>Didn’t come</b>
        <small>{shortDate(patient.missed.date)}</small>
      </span>
    );
  }
  return <span className="ios-next is-none"><small>No visit booked</small></span>;
}

// What to have ready: overdue tests on one red line, the rest on the next.
export function PrepareList({ items, limit = 4 }) {
  if (!items?.length) return null;
  const overdue = items.filter((item) => item.overdue);
  const due = items.filter((item) => !item.overdue);
  return (
    <span className="ios-todo">
      <TodoLine items={overdue} label="Overdue" limit={limit} tone="overdue" />
      <TodoLine items={due} label="To do" limit={limit} />
    </span>
  );
}

function TodoLine({ items, label, limit, tone = '' }) {
  if (!items.length) return null;
  const shown = items.slice(0, limit);
  const Icon = tone === 'overdue' ? TriangleAlert : FlaskConical;
  return (
    <span className={`ios-todo-line ${tone ? `is-${tone}` : ''}`}>
      <Icon aria-hidden="true" size={14} strokeWidth={2.2} />
      <span>
        <span className="sr-only">{label}: </span>
        <ul aria-label={label}>
          {shown.map((item) => <li key={item.label}>{item.label}</li>)}
          {items.length > shown.length ? <li className="is-more">{items.length - shown.length} more</li> : null}
        </ul>
      </span>
    </span>
  );
}

// One expected visit: how far along, who, what to have ready, and whether
// she came.
export function VisitRow({ appointment, footnote, patient, today, showDate = false }) {
  if (!patient) return null;
  // A missed day is in the past: show how far along she is now.
  const now = appointment.status === 'missed' || appointment.status === 'late';
  const care = careText(patient, now ? null : appointment, today);
  return (
    <li className={`ios-cell is-${appointment.status}`}>
      <Link className="ios-cell-link" href={`/patients/${patient.id}`}>
        <CareMark appointment={now ? null : appointment} patient={patient} today={today} />
        <span className="ios-cell-body">
          <span className="ios-cell-top">
            <strong className="ios-cell-title">{patient.name}</strong>
            <StatusTag appointment={appointment} />
          </span>
          <span className="ios-cell-sub">
            {showDate ? <span>{dayDate(appointment.date)}</span> : null}
            <span>{care}</span>
            {patient.hospitalPatientId ? <span className="is-id">{patient.hospitalPatientId}</span> : null}
          </span>
          {appointment.status === 'seen' && appointment.seenBy ? (
            <span className="ios-cell-line">Saved by {appointment.seenBy.nurse}</span>
          ) : (
            <PrepareList items={appointment.prepare} />
          )}
          {appointment.note && appointment.status !== 'seen' ? <span className="ios-cell-note">{appointment.note}</span> : null}
        </span>
        <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
      </Link>
      {appointment.status === 'missed' && patient.mobile ? (
        <div className="ios-cell-actions">
          <a className="ios-call" href={`tel:+91${patient.mobile}`}>
            <Phone aria-hidden="true" size={15} strokeWidth={2.4} /> Call {formatMobile(patient.mobile)}
          </a>
          {footnote ? <span>{footnote}</span> : null}
        </div>
      ) : null}
    </li>
  );
}

export function DeskSection({ children, count, detail, id, link, title, tone = '' }) {
  return (
    <section aria-labelledby={id} className={`ios-section ${tone ? `is-${tone}` : ''}`} id={`${id}-section`}>
      <div className="ios-section-head">
        <h2 id={id}>{title}</h2>
        {typeof count === 'number' ? <span className="ios-section-count">{count}</span> : null}
        {link}
      </div>
      <ul className="ios-group">{children}</ul>
      {detail ? <p className="ios-section-foot">{detail}</p> : null}
    </section>
  );
}

export function EmptyRow({ children }) {
  return <li className="ios-empty">{children}</li>;
}

export function DeskLoading() {
  return (
    <div className="ios-skeleton" aria-label="Loading patients" role="status">
      {[0, 1, 2, 3].map((index) => (
        <span key={index}><i /><b /></span>
      ))}
    </div>
  );
}

export function DeskError() {
  const { error, refresh, refreshing } = useDoctorDesk();
  return (
    <div className="ios-notice" role="alert">
      <p>{error}</p>
      <button className="ios-button is-tinted" disabled={refreshing} type="button" onClick={refresh}>
        <RefreshCw aria-hidden="true" size={16} /> Try again
      </button>
    </div>
  );
}

// Signed in, but no nurse-desk doctor matches this login yet.
export function NotLinked({ doctor }) {
  return (
    <div className="ios-notice">
      <h2>No patients linked yet</h2>
      <p>
        {doctor?.hospitalName ? `${doctor.name} is not on the nurse desk at ${doctor.hospitalName} yet.` : 'This login is not linked to a hospital yet.'}
        {' '}Ask the DrJiva admin to link your login to your nurse desk name.
      </p>
    </div>
  );
}
