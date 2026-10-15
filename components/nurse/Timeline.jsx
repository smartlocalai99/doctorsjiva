import { CalendarDays, Check, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { addDays, addMonths, daysBetween, formatDate, itemState, parentRecordText, WHO_LABEL } from '@/lib/nurse-schedule';

const SHORT = { day: 'numeric', month: 'short' };
const LONG = { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' };
const STATE_PILL = { done: 'Done', due_now: 'Now', next: 'Next visit', optional: 'If doctor says', pending: 'Missed', upcoming: 'Later' };

function windowText(card) {
  if (card.kind !== 'visit') return '';
  const { plan, fromDate, toDate } = card;
  if (plan.type === 'pregnancy') {
    const from = Math.round(daysBetween(plan.startDate, fromDate) / 7);
    const to = Math.round((daysBetween(plan.startDate, toDate) + 1) / 7) - 1;
    return from === to ? `Week ${from}` : `Week ${from}–${to}`;
  }
  return fromDate === toDate ? formatDate(fromDate, SHORT) : `${formatDate(fromDate, SHORT)} – ${formatDate(toDate, SHORT)}`;
}

// Opens the phone's date picker; the real input covers the whole pill.
function DateControl({ hint, label, max, min, onChange, readOnly = false, staged, value }) {
  if (readOnly) {
    return value ? (
      <div className="nurse-tl-date">
        <span className="nurse-tl-date-pill nurse-tl-date-fixed">
          <CalendarDays aria-hidden="true" size={18} />
          <span>{formatDate(value, LONG)}</span>
        </span>
      </div>
    ) : null;
  }
  return (
    <div className="nurse-tl-date">
      <label className={`nurse-tl-date-pill${value ? '' : ' nurse-tl-date-empty'}`}>
        <CalendarDays aria-hidden="true" size={18} />
        <span>{value ? formatDate(value, LONG) : 'Set date'}</span>
        <input
          aria-label={label}
          max={max}
          min={min}
          type="date"
          value={value || ''}
          onChange={(event) => onChange(event.target.value || null)}
          onClick={(event) => {
            try {
              event.currentTarget.showPicker();
            } catch {
              // Older browsers open the picker on tap anyway.
            }
          }}
        />
      </label>
      {hint ? <small>{hint}</small> : null}
      {staged ? <em className="nurse-check-staged">Not saved yet</em> : null}
    </div>
  );
}

function ItemRow({ doneDate, item, label, note, onDoneDate, onToggle, parent, recorded, staged, state, today, who }) {
  const status = item.status;
  return (
    <li className={`nurse-tl-item nurse-check-${state}`}>
      <div className="nurse-tl-item-copy">
        <strong>
          {label}
          {who ? <span className={`nurse-who nurse-who-${who}`}>{WHO_LABEL[who]}</span> : null}
        </strong>
        {note ? <span className="nurse-tl-note">{note}</span> : null}
        {staged ? <em className="nurse-check-staged">Not saved yet</em> : recorded ? <em className="nurse-check-recorded">{recorded}</em> : null}
        {parent && !staged && !item.status ? <em className="nurse-check-parent">{parent}</em> : null}
        {status === 'done' && onDoneDate ? (
          <label className="nurse-done-date">
            Done on
            <input aria-label={`Done on for ${label}`} type="date" max={today} value={doneDate || today}
              onChange={(event) => { if (event.target.value) onDoneDate(event.target.value); }} />
          </label>
        ) : null}
      </div>
      <div className="nurse-tl-item-actions" role="group" aria-label={`Status of ${label}`}>
        <button aria-pressed={status === 'done'} className="nurse-choice nurse-choice-done" type="button" onClick={() => onToggle(status === 'done' ? null : 'done')}>
          <Check aria-hidden="true" size={16} strokeWidth={3} /> Done
        </button>
        <button aria-pressed={status === 'not_needed'} className="nurse-choice nurse-choice-skip" type="button" onClick={() => onToggle(status === 'not_needed' ? null : 'not_needed')}>
          Not needed
        </button>
      </div>
    </li>
  );
}

function recordedText(status, doneOn, by) {
  if (!status) return '';
  return `${status === 'done' ? `Done ${formatDate(doneOn, SHORT)}` : 'Not needed'}${by ? ` · ${by}` : ''}`;
}

function TimelineCard({ card, changes, doneDates, isNext, multiPlan, onDoneDate, onRemoveExtra, onToggleCycle, onToggleExtra, onToggleItem, removing, today }) {
  const state = isNext ? 'next' : card.state;
  const tag =
    card.kind === 'extra' ? 'From case sheet'
      : card.kind === 'cycle' ? 'OI-TI / IUI'
        : multiPlan || card.plan.type === 'child' ? card.plan.personName : 'Pregnancy';

  return (
    <article className={`nurse-tl-card nurse-tl-${state}`} aria-label={`${card.title}, ${STATE_PILL[state] || ''}`}>
      <header className="nurse-tl-head">
        <span className="nurse-tl-pill">{STATE_PILL[state]}</span>
        <span className="nurse-tl-tag">{tag}</span>
      </header>
      <h3 className="nurse-tl-title">{card.title}</h3>
      {card.kind === 'visit' ? <p className="nurse-tl-sub">{windowText(card)}</p> : null}
      {card.kind === 'extra' ? <p className="nurse-tl-sub">Added by {card.item.addedBy}</p> : null}
      {card.kind === 'cycle' ? <p className="nurse-tl-sub">Cycle day {card.day}</p> : null}

      <ul className="nurse-tl-items">
        {card.kind === 'cycle'
          ? card.steps.map((step) => (
              <ItemRow
                item={step}
                key={step.id}
                label={step.labelEn}
                note={step.noteEn}
                onToggle={(next) => onToggleCycle(card.cycle.id, { ...step, status: step.savedStatus }, next)}
                recorded={recordedText(step.savedStatus, step.doneOn, step.nurseName)}
                staged={Boolean(changes[`cyc:${card.cycle.id}:${step.id}`])}
                state={step.status === 'done' ? 'done' : step.status === 'not_needed' ? 'not_needed' : card.state === 'pending' ? 'pending' : 'due_now'}
                who={step.who}
              />
            ))
          : card.kind === 'visit'
          ? card.visit.items.map((original) => {
              const staged = changes[`${card.plan.id}:${original.id}`];
              const status = staged === 'clear' ? null : staged ?? original.status;
              return (
                <ItemRow
                  item={{ ...original, status }}
                  doneDate={doneDates[`${card.plan.id}:${original.id}`] || original.doneOn || today}
                  key={original.id}
                  label={original.conditional ? `${original.labelEn} (if doctor says)` : original.labelEn}
                  onToggle={(next) => onToggleItem(card.plan.id, original, next)}
                  onDoneDate={(date) => onDoneDate(card.plan.id, original, date)}
                  parent={parentRecordText(original.parentRecord)}
                  recorded={recordedText(original.status, original.doneOn, original.nurseName)}
                  staged={Boolean(staged) || Boolean(doneDates[`${card.plan.id}:${original.id}`])}
                  today={today}
                  state={itemState({ ...original, status }, today)}
                />
              );
            })
          : (
            <ItemRow
              item={{ ...card.item, status: changes[`extra:${card.item.id}`] === 'clear' ? null : changes[`extra:${card.item.id}`] ?? card.item.status }}
              label="This test"
              onToggle={(next) => onToggleExtra(card.item, next)}
              recorded={recordedText(card.item.status, card.item.doneOn, card.item.statusBy)}
              staged={Boolean(changes[`extra:${card.item.id}`])}
              state={card.state}
            />
          )}
      </ul>

      {card.kind === 'extra' && !card.item.status && !changes[`extra:${card.item.id}`] ? (
        <button className="nurse-tl-remove" disabled={removing} type="button" onClick={() => onRemoveExtra(card.item)}>
          <Trash2 aria-hidden="true" size={15} /> Remove (added by mistake)
        </button>
      ) : null}
    </article>
  );
}

function QuickDates({ nextDate, onNextDate, today }) {
  return (
    <div className="nurse-tl-quick" role="group" aria-label="Quick dates">
      <button aria-pressed={nextDate === addDays(today, 7)} type="button" onClick={() => onNextDate(addDays(today, 7))}>+1 week</button>
      <button aria-pressed={nextDate === addDays(today, 14)} type="button" onClick={() => onNextDate(addDays(today, 14))}>+2 weeks</button>
      <button aria-pressed={nextDate === addMonths(today, 1)} type="button" onClick={() => onNextDate(addMonths(today, 1))}>+1 month</button>
    </div>
  );
}

// For a patient with no schedule: just the next visit date.
export function NextVisitCard({ nextDate, onNextDate, today }) {
  return (
    <section className="nurse-card" aria-labelledby="next-heading">
      <h2 className="nurse-card-title" id="next-heading">Next visit</h2>
      <p className="nurse-muted">The patient sees this date in the DrJiva app and gets a reminder.</p>
      <DateControl label="Next visit date" max={addDays(today, 400)} min={today} onChange={onNextDate} value={nextDate} />
      <QuickDates nextDate={nextDate} onNextDate={onNextDate} today={today} />
    </section>
  );
}

// Visits, scans and tests side by side; the next visit sits in the middle.
export function Timeline({
  cards,
  changes,
  dates,
  doneDates = {},
  multiPlan,
  nextDate,
  nextKey,
  onCycleDate,
  onDate,
  onDoneDate,
  onNextDate,
  onRemoveExtra,
  onToggleCycle,
  onToggleExtra,
  onToggleItem,
  removingId,
  today,
}) {
  const scrollRef = useRef(null);
  const focusKey = nextKey || cards.find((card) => card.state !== 'done')?.key || cards[cards.length - 1]?.key;

  useEffect(() => {
    const strip = scrollRef.current;
    const target = strip?.querySelector(`[data-card="${CSS.escape(focusKey || '')}"]`);
    if (!strip || !target) return;
    strip.scrollLeft = target.offsetLeft - (strip.clientWidth - target.clientWidth) / 2;
  }, [focusKey]);

  if (!cards.length) return null;

  return (
    <div className="nurse-tl" ref={scrollRef}>
      {cards.map((card) => {
        const isNext = card.key === nextKey;
        const value = isNext ? nextDate : card.date;
        const staged = isNext
          ? false
          : card.kind === 'cycle'
            ? card.steps.some((step) => `cycdate:${card.cycle.id}:${step.id}` in dates)
            : card.key in dates;
        // A finished visit, step or test keeps its date.
        const saved =
          card.kind === 'extra' ? card.item.status
            : card.kind === 'cycle' ? card.steps.every((step) => step.savedStatus)
              : card.visit.items.every((item) => item.status || item.conditional) && card.visit.items.some((item) => item.status);
        return (
          <div className="nurse-tl-col" data-card={card.key} key={card.key}>
            <TimelineCard
              card={card}
              changes={changes}
              doneDates={doneDates}
              isNext={isNext}
              multiPlan={multiPlan}
              onRemoveExtra={onRemoveExtra}
              onDoneDate={onDoneDate}
              onToggleCycle={onToggleCycle}
              onToggleExtra={onToggleExtra}
              onToggleItem={onToggleItem}
              removing={removingId === card.item?.id}
              today={today}
            />
            <DateControl
              hint={!value && card.kind === 'visit' ? `Due ${formatDate(card.fromDate, SHORT)} – ${formatDate(card.toDate, SHORT)}` : ''}
              label={`Date for ${card.title}`}
              max={addDays(today, card.kind === 'extra' ? 400 : card.kind === 'cycle' ? 120 : 2000)}
              min={isNext ? today : addDays(today, -60)}
              onChange={(date) => (isNext ? onNextDate(date) : card.kind === 'cycle' ? onCycleDate(card, date) : onDate(card.key, date))}
              readOnly={!isNext && Boolean(saved)}
              staged={staged}
              value={value}
            />
            {isNext ? <QuickDates nextDate={nextDate} onNextDate={onNextDate} today={today} /> : null}
          </div>
        );
      })}
    </div>
  );
}
