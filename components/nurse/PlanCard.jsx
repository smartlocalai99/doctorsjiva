import { Check, ChevronDown, EyeOff } from 'lucide-react';
import { useState } from 'react';

import {
  checklistGroups,
  childAge,
  formatDate,
  itemState,
  pregnancyWeek,
  trimester,
  visitState,
} from '@/lib/nurse-schedule';

const SHORT = { day: 'numeric', month: 'short' };
const STATE_LABEL = {
  done: 'Done',
  due_now: 'Due now',
  not_needed: 'Not needed',
  optional: 'Only if advised',
  pending: 'Pending',
  upcoming: 'Upcoming',
};

export function effectiveStatus(changes, planId, item) {
  const staged = changes[`${planId}:${item.id}`];
  if (staged === 'clear') return null;
  return staged ?? item.status;
}

function windowText(item) {
  return item.fromDate === item.toDate
    ? formatDate(item.fromDate, SHORT)
    : `${formatDate(item.fromDate, SHORT)} – ${formatDate(item.toDate, SHORT)}`;
}

function ChecklistRow({ changes, item, onToggle, plan, showVisit, today, visit }) {
  const staged = changes[`${plan.id}:${item.id}`];
  const status = effectiveStatus(changes, plan.id, item);
  const state = itemState({ ...item, status }, today);
  const choose = (choice) => onToggle(plan.id, item, status === choice ? null : choice);

  return (
    <li className={`nurse-check nurse-check-${state}`}>
      <div className="nurse-check-copy">
        <strong>{item.labelEn}</strong>
        <span>
          {showVisit ? `${visit.titleEn} · ` : ''}
          {windowText(item)}
          {item.conditional ? ' · only if advised' : ''}
        </span>
        {staged ? <em className="nurse-check-staged">Not saved yet</em> : null}
        {!staged && item.status ? (
          <em className="nurse-check-recorded">
            {item.status === 'done' ? 'Done' : 'Not needed'} {formatDate(item.doneOn, SHORT)}
            {item.nurseName ? ` · ${item.nurseName}` : ''}
          </em>
        ) : null}
      </div>
      <div className="nurse-check-actions" role="group" aria-label={`Status of ${item.labelEn}`}>
        <button aria-pressed={status === 'done'} className="nurse-choice nurse-choice-done" type="button" onClick={() => choose('done')}>
          <Check aria-hidden="true" size={18} strokeWidth={3} /> Done
        </button>
        <button aria-pressed={status === 'not_needed'} className="nurse-choice nurse-choice-skip" type="button" onClick={() => choose('not_needed')}>
          Not needed
        </button>
      </div>
    </li>
  );
}

export function PlanCard({ changes, everyVisit, onAction, onToggle, plan, today }) {
  const [showAll, setShowAll] = useState(false);
  // Grouped by what is SAVED, so a row the nurse just tapped stays in
  // place (marked "Not saved yet") until she presses Save.
  const { dueNow, pending } = checklistGroups(plan, today);
  const findItem = (entry) => entry.item;
  const isPregnancy = plan.type === 'pregnancy';
  const week = isPregnancy ? pregnancyWeek(plan, today) : null;
  const line = everyVisit?.[plan.type]?.en;

  return (
    <article className={`nurse-plan nurse-plan-${plan.type}`}>
      <header className="nurse-plan-head">
        <div>
          <h2>{isPregnancy ? `Pregnancy · ${plan.personName}` : plan.personName}</h2>
          {isPregnancy ? (
            <>
              <p>Week {Math.max(0, week)} of 40 · Due {formatDate(plan.eddDate)}</p>
              <p>Trimester {trimester(week)}</p>
            </>
          ) : (
            <p>{childAge(plan.birthDate, today)} · Born {formatDate(plan.birthDate)}{plan.gender ? ` · ${plan.gender === 'female' ? 'Girl' : 'Boy'}` : ''}</p>
          )}
        </div>
      </header>
      {isPregnancy ? (
        <div className="nurse-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, (week / 40) * 100))}%` }} /></div>
      ) : null}
      {plan.hiddenByPatient ? (
        <p className="nurse-plan-note"><EyeOff aria-hidden="true" size={16} /> The patient hid this schedule in their app.</p>
      ) : null}
      {line ? <p className="nurse-every-visit">{line}</p> : null}

      <h3 className="nurse-plan-subhead">Due now</h3>
      {dueNow.length ? (
        <ul className="nurse-checklist">
          {dueNow.map((entry) => (
            <ChecklistRow changes={changes} item={findItem(entry)} key={entry.item.id} onToggle={onToggle} plan={plan} showVisit today={today} visit={entry.visit} />
          ))}
        </ul>
      ) : <p className="nurse-muted">Nothing is due this week.</p>}

      {pending.length ? (
        <>
          <h3 className="nurse-plan-subhead nurse-plan-subhead-pending">Pending from earlier</h3>
          <ul className="nurse-checklist">
            {pending.map((entry) => (
              <ChecklistRow changes={changes} item={findItem(entry)} key={entry.item.id} onToggle={onToggle} plan={plan} showVisit today={today} visit={entry.visit} />
            ))}
          </ul>
        </>
      ) : null}

      <button aria-expanded={showAll} className="nurse-disclosure" type="button" onClick={() => setShowAll((value) => !value)}>
        {showAll ? 'Hide full schedule' : 'Show full schedule'}
        <ChevronDown aria-hidden="true" className={showAll ? 'rotate-180' : ''} size={18} />
      </button>
      {showAll ? (
        <div className="nurse-schedule">
          {plan.visits.map((visit) => {
            const state = visitState(
              { ...visit, items: visit.items.map((item) => ({ ...item, status: effectiveStatus(changes, plan.id, item) })) },
              today,
            );
            return (
              <section className={`nurse-visit nurse-visit-${state}`} key={visit.id}>
                <h4>
                  <span>{visit.titleEn}</span>
                  <small>{windowText(visit)} · {STATE_LABEL[state]}</small>
                </h4>
                <ul className="nurse-checklist">
                  {visit.items.map((item) => (
                    <ChecklistRow changes={changes} item={item} key={item.id} onToggle={onToggle} plan={plan} today={today} visit={visit} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}

      <footer className="nurse-plan-actions">
        {isPregnancy ? (
          <>
            <button className="secondary-button" type="button" onClick={() => onAction('correct', plan)}>Correct due date</button>
            <button className="secondary-button" type="button" onClick={() => onAction('close', plan)}>Close schedule</button>
          </>
        ) : (
          <button className="secondary-button" type="button" onClick={() => onAction('close', plan)}>Stop schedule</button>
        )}
      </footer>
    </article>
  );
}
