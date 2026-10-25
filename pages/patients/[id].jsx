import { AlertCircle, Baby, CalendarClock, Check, ChevronDown, FlaskConical, HeartPulse, History as HistoryIcon, MessageCircle, Minus, Phone, Repeat } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { BackButton, PageHeader, PrepareList, StatusTag, dayDate, shortDate } from '@/components/doctor/DeskParts';
import { DESK_POLL_MS } from '@/contexts/DoctorDeskContext';
import { cycleDayOn, planPrepare, pregnancyOn } from '@/lib/doctor-desk';
import { initials } from '@/lib/nurse-directory';
import { childAge, daysBetween, formatDate, formatMobile, itemState, ordinal, visitState } from '@/lib/nurse-schedule';

export default function PatientPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [view, setView] = useState(null);
  const [error, setError] = useState('');

  // Read again every 20 seconds while on screen, like Today and Calendar,
  // so what the nurse saves shows up here too. Pull to refresh reads now.
  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    let shown = false;
    const read = () => fetch(`/api/doctor/patient?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load this patient.');
        if (!active) return;
        shown = true;
        setView(result);
        setError('');
      })
      .catch((loadError) => {
        // A failed background read keeps what is on screen.
        if (active && !shown) setError(loadError.message);
      });
    void read();
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void read();
    }, DESK_POLL_MS);
    const onPull = () => void read();
    window.addEventListener('drjiva:refresh', onPull);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener('drjiva:refresh', onPull);
    };
  }, [id]);

  const patient = view?.patient;
  const back = <BackButton label="Back" onBack={() => (window.history.length > 1 ? router.back() : router.push('/patients'))} />;
  return (
    <>
      <Head><title>{patient ? `${patient.name} · DrJiva Doctors` : 'Patient · DrJiva Doctors'}</title></Head>
      <div className="desk-page is-detail">
        {view ? <PatientView back={back} view={view} /> : (
          <>
            <PageHeader back={back} title=" " trailing={null} />
            {error ? <div className="ios-notice" role="alert"><p>{error}</p><Link className="ios-button is-tinted" href="/patients">All patients</Link></div> : null}
            {!error ? <div className="ios-skeleton" role="status" aria-label="Loading patient"><span><i /><b /></span><span><i /><b /></span></div> : null}
          </>
        )}
      </div>
    </>
  );
}

function PatientView({ back, view }) {
  const { patient, today } = view;
  const pregnancy = view.plans.find((plan) => plan.type === 'pregnancy');
  const child = view.plans.find((plan) => plan.type === 'child');
  const cycle = view.cycles[0];
  const upcoming = view.appointments.filter((entry) => entry.date >= today && entry.status !== 'seen');
  const missed = [...view.appointments].reverse().find((entry) => entry.status === 'missed');
  // Due now, minus what the next visit already lists.
  const nextItems = new Set((upcoming[0]?.prepare || []).map((item) => item.label));
  const todo = view.plans.flatMap((plan) => planPrepare(plan, today)).filter((item) => !nextItems.has(item.label));

  return (
    <>
      {/* Like a contact card: who she is, then call or message. */}
      <PageHeader
        above={<span className="ios-contact-avatar" aria-hidden="true">{initials(patient.name)}</span>}
        back={back}
        title={patient.name}
        trailing={null}
      />

      <section className="ios-contact" aria-label="Contact">
        <p className="ios-contact-ids">
          {patient.hospitalPatientId ? <span>{patient.hospitalPatientId}</span> : null}
          {patient.mobile ? <span>+91 {formatMobile(patient.mobile)}</span> : null}
        </p>
        {patient.mobile ? (
          <div className="ios-contact-actions">
            <a href={`tel:+91${patient.mobile}`}><Phone aria-hidden="true" size={20} strokeWidth={2.2} /><span>Call</span></a>
            <a href={`sms:+91${patient.mobile}`}><MessageCircle aria-hidden="true" size={20} strokeWidth={2.2} /><span>Message</span></a>
            <a href={`https://wa.me/91${patient.mobile}`} rel="noreferrer" target="_blank"><WhatsAppIcon /><span>WhatsApp</span></a>
          </div>
        ) : null}
      </section>

      {missed ? (
        <p className="ios-alert" role="status">
          <AlertCircle aria-hidden="true" size={20} strokeWidth={2.2} />
          <span>
            Didn’t come on {dayDate(missed.date)}.{' '}
            {upcoming.length ? `Booked again for ${shortDate(upcoming[0].date)}.` : 'No new date booked yet.'}
          </span>
        </p>
      ) : null}

      {pregnancy ? <PregnancyCard plan={pregnancy} today={today} /> : null}
      {cycle ? <CycleCard cycle={cycle} today={today} /> : null}
      {child ? (
        <section className="ios-card is-row">
          <span className="ios-icon is-large is-teal" aria-hidden="true"><Baby size={22} strokeWidth={2.2} /></span>
          <div>
            <h2 className="ios-card-title">Baby {child.personName}</h2>
            <p className="ios-card-lead">{childAge(child.birthDate, today)}, born {formatDate(child.birthDate)}</p>
          </div>
        </section>
      ) : null}

      <section className="ios-section" aria-labelledby="next-visit">
        <div className="ios-section-head"><h2 id="next-visit">Next visit</h2></div>
        {upcoming.length ? (
          <ul className="ios-group">
            {upcoming.slice(0, 3).map((entry) => (
              <li className={`ios-cell is-${entry.status}`} key={entry.key}>
                <div className="ios-cell-link is-static">
                  <span className="ios-date-tile" aria-hidden="true">
                    <small>{formatDate(entry.date, { month: 'short' })}</small>
                    <b>{Number(entry.date.slice(8))}</b>
                  </span>
                  <span className="ios-cell-body">
                    <span className="ios-cell-top">
                      <strong className="ios-cell-title">{entry.date === today ? 'Today' : formatDate(entry.date, { weekday: 'long' })}</strong>
                      <StatusTag appointment={entry} />
                    </span>
                    <span className="ios-cell-sub">
                      {entry.date > today ? <span>{inDays(today, entry.date)}</span> : null}
                      {entry.pregnancy ? <span>at {entry.pregnancy.week} weeks</span> : null}
                    </span>
                    <PrepareList items={entry.prepare} limit={6} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="ios-section-foot">No visit booked. The nurse sets the next date when she saves a visit.</p>}
      </section>

      {todo.length ? (
        <section className="ios-section" aria-labelledby="due-now">
          <div className="ios-section-head"><h2 id="due-now">Due now</h2></div>
          <div className="ios-card"><PrepareList items={todo} limit={8} /></div>
        </section>
      ) : null}

      {pregnancy ? <Schedule plan={pregnancy} today={today} /> : null}
      {view.extras.length ? <ExtraTests extras={view.extras} today={today} /> : null}
      <History view={view} />
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function inDays(today, date) {
  const days = daysBetween(today, date);
  if (days === 1) return 'Tomorrow';
  return days < 14 ? `In ${days} days` : `In ${Math.round(days / 7)} weeks`;
}

function weekOf(plan, date) {
  return daysBetween(plan.startDate, date) / 7;
}

const MARK_STATE = { done: 'done', due_now: 'due', pending: 'late', upcoming: 'next', optional: 'next' };
const at = (week) => `${(Math.min(Math.max(week, 0), 40) / 40) * 100}%`;

// 40 weeks drawn as a ruler: her week filled in, each schedule visit
// marked above it.
function PregnancyCard({ plan, today }) {
  const now = pregnancyOn(plan, today);
  const marks = plan.visits.map((visit) => ({ key: visit.id, state: MARK_STATE[visitState(visit, today)], title: visit.titleEn, week: weekOf(plan, visit.fromDate) }));
  const left = daysBetween(today, plan.eddDate);
  return (
    <section className="ios-card ios-pregnancy" aria-label="Pregnancy">
      <div className="ios-card-head">
        <span className="ios-icon is-pink" aria-hidden="true"><HeartPulse size={17} strokeWidth={2.4} /></span>
        <h2>Pregnancy</h2>
      </div>
      <p className="ios-big-number"><b>{now.week}</b> weeks</p>
      <p className="ios-card-lead">{ordinal(now.month)} month, {ordinal(now.trimester)} trimester</p>
      <dl className="ios-facts">
        <div><dt>Due date</dt><dd>{formatDate(plan.eddDate)}</dd></div>
        <div><dt>{left >= 0 ? 'To go' : 'Past due'}</dt><dd>{Math.abs(left)} {Math.abs(left) === 1 ? 'day' : 'days'}</dd></div>
      </dl>

      <div className="ios-ruler" role="img" aria-label={`Week ${now.week} of 40`}>
        <div className="ios-ruler-marks">
          {marks.map((mark) => <i className={`is-${mark.state}`} key={mark.key} style={{ left: at(mark.week) }} title={mark.title} />)}
        </div>
        <div className="ios-ruler-track">
          <span className="ios-ruler-fill" style={{ width: at(now.week + 0.5) }} />
          <span className="ios-ruler-now" style={{ left: at(now.week + 0.5) }} />
        </div>
        <div className="ios-ruler-scale" aria-hidden="true">
          <span style={{ left: '0%' }}>0</span>
          <span style={{ left: at(13) }}>13</span>
          <span style={{ left: at(27) }}>27</span>
          <span style={{ left: '100%' }}>40</span>
        </div>
      </div>
      <p className="ios-ruler-legend">
        <span><i className="is-done" /> Done</span>
        <span><i className="is-due" /> Due now</span>
        <span><i className="is-late" /> Overdue</span>
        <span><i className="is-next" /> Later</span>
      </p>
    </section>
  );
}

function CycleCard({ cycle, today }) {
  const day = cycleDayOn(cycle, today);
  return (
    <section className="ios-card" aria-label="Cycle">
      <div className="ios-card-head">
        <span className="ios-icon is-purple" aria-hidden="true"><Repeat size={17} strokeWidth={2.4} /></span>
        <h2>{cycle.title}</h2>
      </div>
      <p className="ios-big-number"><span>Day</span> <b>{day}</b></p>
      <p className="ios-card-lead">Day 1 was {formatDate(cycle.anchorDate)}{cycle.partnerName ? `. Husband ${cycle.partnerName}` : ''}</p>
      <ul className="ios-steps-list">
        {cycle.steps.map((step) => {
          const state = stepState(step, today);
          return (
            <li className={`is-${state}`} key={step.id}>
              <ItemIcon state={state} />
              <span className="ios-step-label">{step.labelEn}{step.who === 'husband' ? ' (husband)' : step.who === 'couple' ? ' (both)' : ''}</span>
              <span className="ios-step-date">{step.status === 'done' && step.doneOn ? `Done ${shortDate(step.doneOn)}` : `Day ${cycleDayOn(cycle, step.date)}, ${shortDate(step.date)}`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function stepState(step, today) {
  if (step.status === 'done') return 'done';
  if (step.status === 'not_needed') return 'not_needed';
  if (step.date === today) return 'due_now';
  return step.date < today ? 'pending' : 'upcoming';
}

function ItemIcon({ state }) {
  if (state === 'done') return <span className="ios-check is-done"><Check aria-label="Done" size={13} strokeWidth={3.4} /></span>;
  if (state === 'not_needed') return <span className="ios-check is-skip"><Minus aria-label="Not needed" size={13} strokeWidth={3.4} /></span>;
  if (state === 'pending') return <span className="ios-check is-late"><AlertCircle aria-label="Overdue" size={13} strokeWidth={3} /></span>;
  return <span aria-hidden="true" className={`ios-check ${state === 'due_now' ? 'is-due' : ''}`} />;
}

function VisitBlock({ plan, today, visit }) {
  const state = visitState(visit, today);
  const from = Math.round(weekOf(plan, visit.fromDate));
  const to = Math.round(weekOf(plan, visit.toDate)) - 1;
  return (
    <li className={`is-${state}`}>
      <div className="ios-schedule-head">
        <strong>{visit.titleEn}</strong>
        <span>{from === to || to < from ? `Week ${from}` : `Weeks ${from}–${to}`}, {shortDate(visit.plannedDate || visit.fromDate)}</span>
      </div>
      <ul className="ios-steps-list">
        {visit.items.map((item) => {
          const itemNow = itemState(item, today);
          return (
            <li className={`is-${itemNow}`} key={item.id}>
              <ItemIcon state={itemNow} />
              <span className="ios-step-label">{item.labelEn}</span>
              <span className="ios-step-date">
                {item.status === 'done' && item.doneOn ? `Done ${shortDate(item.doneOn)}` : item.status === 'not_needed' ? 'Not needed' : itemNow === 'pending' ? 'Overdue' : itemNow === 'due_now' ? 'Due now' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

// Finished visits fold away; what is open or still to come stays visible.
function Schedule({ plan, today }) {
  const done = plan.visits.filter((visit) => visitState(visit, today) === 'done');
  const open = plan.visits.filter((visit) => visitState(visit, today) !== 'done');
  return (
    <section className="ios-section" aria-labelledby="schedule">
      <div className="ios-section-head"><h2 id="schedule">Pregnancy schedule</h2></div>
      <div className="ios-card is-flush">
        {done.length ? (
          <details className="ios-disclosure">
            <summary>
              <span className="ios-check is-done"><Check aria-hidden="true" size={13} strokeWidth={3.4} /></span>
              {done.length} {done.length === 1 ? 'visit' : 'visits'} done
              <ChevronDown aria-hidden="true" className="ios-disclosure-chevron" size={18} strokeWidth={2.4} />
            </summary>
            <ol className="ios-schedule">{done.map((visit) => <VisitBlock key={visit.id} plan={plan} today={today} visit={visit} />)}</ol>
          </details>
        ) : null}
        <ol className="ios-schedule">{open.map((visit) => <VisitBlock key={visit.id} plan={plan} today={today} visit={visit} />)}</ol>
      </div>
    </section>
  );
}

function ExtraTests({ extras, today }) {
  return (
    <section className="ios-section" aria-labelledby="extra-tests">
      <div className="ios-section-head">
        <h2 id="extra-tests"><FlaskConical aria-hidden="true" size={18} strokeWidth={2.4} /> Tests added by the nurse</h2>
      </div>
      <ul className="ios-steps-list ios-card">
        {[...extras].sort((a, b) => (a.date < b.date ? -1 : 1)).map((item) => {
          const state = item.status || (item.date < today ? 'pending' : item.date === today ? 'due_now' : 'upcoming');
          return (
            <li className={`is-${state}`} key={item.id}>
              <ItemIcon state={state} />
              <span className="ios-step-label">{item.label}</span>
              <span className="ios-step-date">{item.status === 'done' && item.doneOn ? `Done ${shortDate(item.doneOn)}` : shortDate(item.date)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// " Was due for NT scan." — nothing when it was a plain follow-up.
function dueFor(reasons) {
  const named = reasons.filter((reason) => reason !== 'Follow-up visit' && reason !== 'Visit');
  return named.length ? ` Was due for ${named.join(', ')}.` : '';
}

// Saved visits and missed days, newest first.
function History({ view }) {
  const entries = [
    ...view.visits.map((visit) => ({ date: visit.date, key: visit.id, kind: 'visit', visit })),
    ...view.appointments
      .filter((entry) => entry.status === 'missed' || entry.status === 'late')
      .map((entry) => ({ date: entry.date, entry, key: entry.key, kind: 'missed' })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return (
    <section className="ios-section" aria-labelledby="history">
      <div className="ios-section-head">
        <h2 id="history"><HistoryIcon aria-hidden="true" size={18} strokeWidth={2.4} /> Visit history</h2>
      </div>
      {entries.length ? (
        <ol className="ios-history ios-card">
          {entries.map((row) => (row.kind === 'visit' ? (
            <li className="is-visit" key={row.key}>
              <strong>{dayDate(row.date)}</strong>
              <span>Came. Saved by {row.visit.nurse}{row.visit.nextDate ? `, next visit ${shortDate(row.visit.nextDate)}` : ''}.</span>
              {row.visit.note ? <p>{row.visit.note}</p> : null}
            </li>
          ) : (
            <li className="is-missed" key={row.key}>
              <strong>{dayDate(row.date)}</strong>
              <span>{row.entry.status === 'late' ? `Didn’t come. Came on ${shortDate(row.entry.cameOn)}.` : 'Didn’t come.'}{dueFor(row.entry.reasons)}</span>
            </li>
          )))}
        </ol>
      ) : <p className="ios-section-foot"><CalendarClock aria-hidden="true" size={14} /> No visits saved yet.</p>}
    </section>
  );
}
