import { AlertCircle, ArrowLeft, Check, ChevronDown, Minus, Phone } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { PrepareList, StatusTag, dayDate, shortDate } from '@/components/doctor/DeskParts';
import { cycleDayOn, planPrepare, pregnancyOn } from '@/lib/doctor-desk';
import { childAge, daysBetween, formatDate, formatMobile, itemState, ordinal, visitState } from '@/lib/nurse-schedule';

export default function PatientPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [view, setView] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    fetch(`/api/doctor/patient?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load this patient.');
        if (active) setView(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => { active = false; };
  }, [id]);

  const patient = view?.patient;
  return (
    <>
      <Head><title>{patient ? `${patient.name} · DRJIVA Doctors` : 'Patient · DRJIVA Doctors'}</title></Head>
      <div className="desk-page">
        <button className="desk-back" type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push('/patients'))}>
          <ArrowLeft aria-hidden="true" size={18} /> Back
        </button>
        {error ? <div className="desk-error" role="alert"><p>{error}</p><Link className="desk-button" href="/patients">All patients</Link></div> : null}
        {!view && !error ? <div className="desk-skeleton" role="status" aria-label="Loading patient"><span /><span /></div> : null}
        {view ? <PatientView view={view} /> : null}
      </div>
    </>
  );
}

function PatientView({ view }) {
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
      <header className="desk-patient-head">
        <div className="min-w-0">
          <h1 className="desk-patient-name">{patient.name}</h1>
          <p className="desk-patient-ids">
            {patient.hospitalPatientId ? <span>{patient.hospitalPatientId}</span> : null}
            {patient.mobile ? <span>{formatMobile(patient.mobile)}</span> : null}
          </p>
        </div>
        {patient.mobile ? (
          <a className="desk-call is-round" href={`tel:+91${patient.mobile}`} aria-label={`Call ${patient.name}`}>
            <Phone aria-hidden="true" size={19} />
          </a>
        ) : null}
      </header>

      {missed ? (
        <p className="desk-alert" role="status">
          <AlertCircle aria-hidden="true" size={18} />
          <span>
            Didn’t come on {dayDate(missed.date)}.{' '}
            {upcoming.length ? `Booked again for ${shortDate(upcoming[0].date)}.` : 'No new date booked yet.'}
          </span>
        </p>
      ) : null}

      {pregnancy ? <PregnancyCard plan={pregnancy} today={today} /> : null}
      {cycle ? <CycleCard cycle={cycle} today={today} /> : null}
      {child ? (
        <section className="desk-card">
          <h2 className="desk-card-title">Baby {child.personName}</h2>
          <p className="desk-card-lead">{childAge(child.birthDate, today)}, born {formatDate(child.birthDate)}</p>
        </section>
      ) : null}

      <section className="desk-section" aria-labelledby="next-visit">
        <div className="desk-section-head"><h2 id="next-visit">Next visit</h2></div>
        {upcoming.length ? (
          <ul className="desk-list">
            {upcoming.slice(0, 3).map((entry) => (
              <li className={`desk-row is-${entry.status}`} key={entry.key}>
                <div className="desk-row-link is-static">
                  <span className="desk-mark is-date" aria-hidden="true">
                    <b>{Number(entry.date.slice(8))}</b>
                    <small>{formatDate(entry.date, { month: 'short' })}</small>
                  </span>
                  <span className="desk-row-body">
                    <span className="desk-row-top">
                      <strong className="desk-row-name">{entry.date === today ? 'Today' : formatDate(entry.date, { weekday: 'long' })}</strong>
                      <StatusTag appointment={entry} />
                    </span>
                    <span className="desk-row-meta">
                      {[entry.date > today ? inDays(today, entry.date) : null, entry.pregnancy ? `at ${entry.pregnancy.week} weeks` : null].filter(Boolean).join(', ')}
                    </span>
                    <PrepareList items={entry.prepare} limit={6} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="desk-section-detail">No visit booked. The nurse sets the next date when she saves a visit.</p>}
      </section>

      {todo.length ? (
        <section className="desk-section" aria-labelledby="due-now">
          <div className="desk-section-head"><h2 id="due-now">Due now</h2></div>
          <div className="desk-card is-tight"><PrepareList items={todo} limit={8} /></div>
        </section>
      ) : null}

      {pregnancy ? <Schedule plan={pregnancy} today={today} /> : null}
      {view.extras.length ? <ExtraTests extras={view.extras} today={today} /> : null}
      <History view={view} />
    </>
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

// 40 weeks drawn as a ruler: one tick a week, her week filled in, each
// schedule visit marked above it.
function PregnancyCard({ plan, today }) {
  const now = pregnancyOn(plan, today);
  const marks = plan.visits.map((visit) => ({ key: visit.id, state: MARK_STATE[visitState(visit, today)], title: visit.titleEn, week: weekOf(plan, visit.fromDate) }));
  const left = daysBetween(today, plan.eddDate);
  return (
    <section className="desk-pregnancy" aria-label="Pregnancy">
      <p className="desk-pregnancy-week"><b>{now.week}</b> weeks</p>
      <p className="desk-pregnancy-lead">{ordinal(now.month)} month, {ordinal(now.trimester)} trimester</p>
      <dl className="desk-pregnancy-dates">
        <div><dt>Due date</dt><dd>{formatDate(plan.eddDate)}</dd></div>
        <div><dt>{left >= 0 ? 'To go' : 'Past due'}</dt><dd>{Math.abs(left)} {Math.abs(left) === 1 ? 'day' : 'days'}</dd></div>
      </dl>

      <div className="desk-ruler" role="img" aria-label={`Week ${now.week} of 40`}>
        <div className="desk-ruler-marks">
          {marks.map((mark) => <i className={`is-${mark.state}`} key={mark.key} style={{ left: at(mark.week) }} title={mark.title} />)}
        </div>
        <div className="desk-ruler-track">
          <span className="desk-ruler-fill" style={{ width: at(now.week + 0.5) }} />
          <span className="desk-ruler-now" style={{ left: at(now.week + 0.5) }} />
        </div>
        <div className="desk-ruler-scale" aria-hidden="true">
          <span style={{ left: '0%' }}>0</span>
          <span style={{ left: at(13) }}>13</span>
          <span style={{ left: at(27) }}>27</span>
          <span style={{ left: '100%' }}>40</span>
        </div>
      </div>
      <p className="desk-ruler-legend">
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
    <section className="desk-card" aria-label="Cycle">
      <div className="desk-cycle-head">
        <p className="desk-pregnancy-week"><span className="desk-cycle-day">Day</span> <b>{day}</b></p>
        <div>
          <h2 className="desk-card-title">{cycle.title}</h2>
          <p className="desk-card-lead">Day 1 was {formatDate(cycle.anchorDate)}{cycle.partnerName ? `. Husband ${cycle.partnerName}` : ''}</p>
        </div>
      </div>
      <ul className="desk-steps">
        {cycle.steps.map((step) => {
          const state = stepState(step, today);
          return (
            <li className={`is-${state}`} key={step.id}>
              <ItemIcon state={state} />
              <span className="desk-step-label">{step.labelEn}{step.who === 'husband' ? ' (husband)' : step.who === 'couple' ? ' (both)' : ''}</span>
              <span className="desk-step-date">{step.status === 'done' && step.doneOn ? `Done ${shortDate(step.doneOn)}` : `Day ${cycleDayOn(cycle, step.date)}, ${shortDate(step.date)}`}</span>
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
  if (state === 'done') return <Check aria-label="Done" className="desk-item-icon" size={15} strokeWidth={3} />;
  if (state === 'not_needed') return <Minus aria-label="Not needed" className="desk-item-icon" size={15} strokeWidth={3} />;
  if (state === 'pending') return <AlertCircle aria-label="Overdue" className="desk-item-icon" size={15} strokeWidth={2.5} />;
  return <span aria-hidden="true" className="desk-item-dot" />;
}

function VisitBlock({ plan, today, visit }) {
  const state = visitState(visit, today);
  const from = Math.round(weekOf(plan, visit.fromDate));
  const to = Math.round(weekOf(plan, visit.toDate)) - 1;
  return (
    <li className={`is-${state}`}>
      <div className="desk-schedule-head">
        <strong>{visit.titleEn}</strong>
        <span>{from === to || to < from ? `Week ${from}` : `Weeks ${from}–${to}`}, {shortDate(visit.plannedDate || visit.fromDate)}</span>
      </div>
      <ul className="desk-steps">
        {visit.items.map((item) => {
          const itemNow = itemState(item, today);
          return (
            <li className={`is-${itemNow}`} key={item.id}>
              <ItemIcon state={itemNow} />
              <span className="desk-step-label">{item.labelEn}</span>
              <span className="desk-step-date">
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
    <section className="desk-section" aria-labelledby="schedule">
      <div className="desk-section-head"><h2 id="schedule">Pregnancy schedule</h2></div>
      <div className="desk-card is-flush">
        {done.length ? (
          <details className="desk-schedule-done">
            <summary>
              <Check aria-hidden="true" size={16} strokeWidth={3} />
              {done.length} {done.length === 1 ? 'visit' : 'visits'} done
              <ChevronDown aria-hidden="true" className="desk-schedule-chevron" size={18} />
            </summary>
            <ol className="desk-schedule">{done.map((visit) => <VisitBlock key={visit.id} plan={plan} today={today} visit={visit} />)}</ol>
          </details>
        ) : null}
        <ol className="desk-schedule">{open.map((visit) => <VisitBlock key={visit.id} plan={plan} today={today} visit={visit} />)}</ol>
      </div>
    </section>
  );
}

function ExtraTests({ extras, today }) {
  return (
    <section className="desk-section" aria-labelledby="extra-tests">
      <div className="desk-section-head"><h2 id="extra-tests">Tests added by the nurse</h2></div>
      <ul className="desk-steps desk-card">
        {[...extras].sort((a, b) => (a.date < b.date ? -1 : 1)).map((item) => {
          const state = item.status || (item.date < today ? 'pending' : item.date === today ? 'due_now' : 'upcoming');
          return (
            <li className={`is-${state}`} key={item.id}>
              <ItemIcon state={state} />
              <span className="desk-step-label">{item.label}</span>
              <span className="desk-step-date">{item.status === 'done' && item.doneOn ? `Done ${shortDate(item.doneOn)}` : shortDate(item.date)}</span>
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
    <section className="desk-section" aria-labelledby="history">
      <div className="desk-section-head"><h2 id="history">Visit history</h2></div>
      {entries.length ? (
        <ol className="desk-history">
          {entries.map((row) => (row.kind === 'visit' ? (
            <li className="is-visit" key={row.key}>
              <strong>{dayDate(row.date)}</strong>
              <span>Came. Saved by {row.visit.nurse}{row.visit.nextDate ? `, next visit ${shortDate(row.visit.nextDate)}` : ''}.</span>
              {row.visit.note ? <p>“{row.visit.note}”</p> : null}
            </li>
          ) : (
            <li className="is-missed" key={row.key}>
              <strong>{dayDate(row.date)}</strong>
              <span>{row.entry.status === 'late' ? `Didn’t come. Came on ${shortDate(row.entry.cameOn)}.` : 'Didn’t come.'}{dueFor(row.entry.reasons)}</span>
            </li>
          )))}
        </ol>
      ) : <p className="desk-section-detail">No visits saved yet.</p>}
    </section>
  );
}
