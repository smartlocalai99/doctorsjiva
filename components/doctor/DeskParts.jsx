import { Phone, RefreshCw, Stethoscope } from 'lucide-react';
import Link from 'next/link';

import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { childAge, formatDate, formatMobile, ordinal } from '@/lib/nurse-schedule';

export const shortDate = (date) => formatDate(date, { day: 'numeric', month: 'short' });
export const dayDate = (date) => formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' });

export function pregnancyText(pregnancy) {
  return `${pregnancy.week} ${pregnancy.week === 1 ? 'week' : 'weeks'} · ${ordinal(pregnancy.month)} month`;
}

// The left column of every row: how far along she is, the way the doctor
// reads it. Weeks for a pregnancy, cycle day for IUI, age for a baby.
function careMark(patient, appointment, today) {
  const pregnancy = appointment?.pregnancy || patient?.pregnancy;
  if (pregnancy) {
    return { kind: 'pregnancy', label: `${pregnancy.week} weeks pregnant`, trimester: pregnancy.trimester, unit: 'wk', value: pregnancy.week };
  }
  const day = appointment?.cycleDay ?? patient?.cycle?.day;
  if (day) return { kind: 'cycle', label: `Cycle day ${day}`, unit: 'day', value: day };
  if (patient?.child?.birthDate) {
    const [value, unit] = childAge(patient.child.birthDate, today).split(' ');
    return { kind: 'child', label: `Baby, ${childAge(patient.child.birthDate, today)}`, unit: { months: 'mo', month: 'mo', weeks: 'wk', week: 'wk', years: 'yr', year: 'yr' }[unit] || '', value };
  }
  return { kind: 'visit', label: 'Follow-up' };
}

export function CareMark({ appointment, patient, today }) {
  const mark = careMark(patient, appointment, today);
  return (
    <span className={`desk-mark is-${mark.kind}`} role="img" aria-label={mark.label}>
      {mark.kind === 'visit' ? <Stethoscope aria-hidden="true" size={20} strokeWidth={1.8} /> : (
        <>
          <b>{mark.value}</b>
          <small>{mark.unit}</small>
        </>
      )}
      {mark.trimester ? (
        <i aria-hidden="true">{[1, 2, 3].map((t) => <em className={t <= mark.trimester ? 'is-on' : ''} key={t} />)}</i>
      ) : null}
    </span>
  );
}

// "6th month" / "OI-TI / IUI" / "Baby Arjun" next to the hospital ID.
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

export function StatusTag({ appointment }) {
  const { status } = appointment;
  return (
    <span className={`desk-status is-${status}`}>
      {status === 'late' ? `Came ${shortDate(appointment.cameOn)}` : STATUS[status]}
    </span>
  );
}

// What to have ready: overdue tests on one red line, the rest on the next.
export function PrepareList({ items, limit = 4 }) {
  if (!items?.length) return null;
  const overdue = items.filter((item) => item.overdue);
  const due = items.filter((item) => !item.overdue);
  return (
    <span className="desk-todo">
      <TodoLine items={overdue} label="Overdue" limit={limit} tone="overdue" />
      <TodoLine items={due} label="To do" limit={limit} />
    </span>
  );
}

function TodoLine({ items, label, limit, tone = '' }) {
  if (!items.length) return null;
  const shown = items.slice(0, limit);
  return (
    <span className={`desk-todo-line ${tone ? `is-${tone}` : ''}`}>
      <b>{label}</b>
      <ul aria-label={label}>
        {shown.map((item) => <li key={item.label}>{item.label}</li>)}
        {items.length > shown.length ? <li className="is-more">{items.length - shown.length} more</li> : null}
      </ul>
    </span>
  );
}

function seenAt(appointment) {
  if (!appointment.seenBy?.at) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(appointment.seenBy.at));
}

// One expected visit: how far along, who, what to have ready, and whether
// she came.
export function VisitRow({ appointment, footnote, patient, today, showDate = false }) {
  if (!patient) return null;
  // A missed day is in the past: show how far along she is now.
  const now = appointment.status === 'missed' || appointment.status === 'late';
  const meta = [showDate ? dayDate(appointment.date) : null, patient.hospitalPatientId, careText(patient, now ? null : appointment, today)].filter(Boolean);
  const time = seenAt(appointment);
  return (
    <li className={`desk-row is-${appointment.status}`}>
      <Link className="desk-row-link" href={`/patients/${patient.id}`}>
        <CareMark appointment={now ? null : appointment} patient={patient} today={today} />
        <span className="desk-row-body">
          <span className="desk-row-top">
            <strong className="desk-row-name">{patient.name}</strong>
            <StatusTag appointment={appointment} />
          </span>
          <span className="desk-row-meta">{meta.join(' · ')}</span>
          {appointment.status === 'seen' && appointment.seenBy ? (
            <span className="desk-row-line">Saved by {appointment.seenBy.nurse}{time ? ` at ${time}` : ''}</span>
          ) : (
            <PrepareList items={appointment.prepare} />
          )}
          {appointment.note && appointment.status !== 'seen' ? <span className="desk-row-note">“{appointment.note}”</span> : null}
        </span>
      </Link>
      {appointment.status === 'missed' && patient.mobile ? (
        <div className="desk-row-actions">
          <a className="desk-call" href={`tel:+91${patient.mobile}`}>
            <Phone aria-hidden="true" size={15} /> Call {formatMobile(patient.mobile)}
          </a>
          {footnote ? <span>{footnote}</span> : null}
        </div>
      ) : null}
    </li>
  );
}

export function DeskSection({ children, count, detail, id, link, title, tone = '' }) {
  return (
    <section aria-labelledby={id} className={`desk-section ${tone ? `is-${tone}` : ''}`}>
      <div className="desk-section-head">
        <h2 id={id}>{title}{typeof count === 'number' ? <span className="desk-section-count">{count}</span> : null}</h2>
        {link}
      </div>
      {detail ? <p className="desk-section-detail">{detail}</p> : null}
      <ul className="desk-list">{children}</ul>
    </section>
  );
}

export function EmptyRow({ children }) {
  return <li className="desk-list-empty">{children}</li>;
}

export function DeskLoading() {
  return (
    <div className="desk-skeleton" aria-label="Loading patients" role="status">
      {[0, 1, 2, 3].map((index) => <span key={index} />)}
    </div>
  );
}

export function DeskError() {
  const { error, refresh, refreshing } = useDoctorDesk();
  return (
    <div className="desk-error" role="alert">
      <p>{error}</p>
      <button className="desk-button" disabled={refreshing} type="button" onClick={refresh}>
        <RefreshCw aria-hidden="true" size={16} /> Try again
      </button>
    </div>
  );
}

// Signed in, but no nurse-desk doctor matches this login yet.
export function NotLinked({ doctor }) {
  return (
    <div className="desk-empty">
      <h2>No patients linked yet</h2>
      <p>
        {doctor?.hospitalName ? `${doctor.name} is not on the nurse desk at ${doctor.hospitalName} yet.` : 'This login is not linked to a hospital yet.'}
        {' '}Ask the DrJiva admin to link your login to your nurse desk name.
      </p>
    </div>
  );
}

export function RefreshButton() {
  const { refresh, refreshing } = useDoctorDesk();
  return (
    <button className="desk-icon-button" disabled={refreshing} type="button" onClick={refresh} aria-label="Refresh">
      <RefreshCw aria-hidden="true" className={refreshing ? 'animate-spin' : ''} size={18} />
    </button>
  );
}
