import { CalendarDays, Check, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

import { addDays, addMonths, daysBetween, formatDate, itemState, parentRecordText, WHO_LABEL } from '@/lib/nurse-schedule';

const SHORT = { day: 'numeric', month: 'short' };
const LONG = { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' };
const STATE_PILL = { done: 'Done', due_now: 'Due now', next: 'Next visit', optional: 'If doctor says', pending: 'Missed', upcoming: 'Later' };

function windowText(card) {
  if (card.kind !== 'visit') return '';
  const { plan, fromDate, toDate } = card;
  if (plan.type === 'pregnancy') {
    const from = Math.round(daysBetween(plan.startDate, fromDate) / 7);
    const to = Math.round((daysBetween(plan.startDate, toDate) + 1) / 7) - 1;
    return from === to ? `Week ${from}` : `Weeks ${from}–${to}`;
  }
  return fromDate === toDate ? formatDate(fromDate, SHORT) : `${formatDate(fromDate, SHORT)} – ${formatDate(toDate, SHORT)}`;
}

// A row with the date on the right, like an iOS date cell; the real date
// input covers the row and opens the phone's date picker.
function DateControl({ hint, label, max, min, onChange, readOnly = false, staged, title = 'Date', value }) {
  if (readOnly) {
    return value ? (
      <div className="nurse-date is-fixed">
        <CalendarDays aria-hidden="true" size={18} strokeWidth={2.2} />
        <span className="nurse-date-label">{title}</span>
        <span className="nurse-date-value">{formatDate(value, LONG)}</span>
      </div>
    ) : null;
  }
  return (
    <div className="nurse-date-block">
      <label className={`nurse-date ${value ? '' : 'is-empty'}`}>
        <CalendarDays aria-hidden="true" size={18} strokeWidth={2.2} />
        <span className="nurse-date-label">{title}</span>
        <span className="nurse-date-value">{value ? formatDate(value, LONG) : 'Set date'}</span>
        <ChevronRight aria-hidden="true" className="ios-chevron" size={17} strokeWidth={2.4} />
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
      {hint || staged ? (
        <p className="nurse-date-hint">
          {hint}
          {staged ? <em className="nurse-staged">Not saved yet</em> : null}
        </p>
      ) : null}
    </div>
  );
}

function ItemRow({ doneDate, item, label, note, onDoneDate, onToggle, parent, recorded, staged, state, today, who }) {
  const status = item.status;
  return (
    <li className={`nurse-item is-${state}`}>
      <div className="nurse-item-copy">
        <strong>
          {label}
          {who ? <span className={`nurse-who is-${who}`}>{WHO_LABEL[who]}</span> : null}
        </strong>
        {note ? <span className="nurse-item-note">{note}</span> : null}
        {staged ? <em className="nurse-staged">Not saved yet</em> : recorded ? <em className="nurse-recorded">{recorded}</em> : null}
        {parent && !staged && !item.status ? <em className="nurse-parent">{parent}</em> : null}
        {status === 'done' && onDoneDate ? (
          <label className="nurse-done-date">
            <span>Done on</span>
            <input aria-label={`Done on for ${label}`} type="date" max={today} value={doneDate || today}
              onChange={(event) => { if (event.target.value) onDoneDate(event.target.value); }} />
          </label>
        ) : null}
      </div>
      <div className="nurse-item-actions" role="group" aria-label={`Status of ${label}`}>
        <button aria-pressed={status === 'done'} className="nurse-choice is-done" type="button" onClick={() => onToggle(status === 'done' ? null : 'done')}>
          <Check aria-hidden="true" size={16} strokeWidth={3} /> Done
        </button>
        <button aria-pressed={status === 'not_needed'} className="nurse-choice is-skip" type="button" onClick={() => onToggle(status === 'not_needed' ? null : 'not_needed')}>
          Not needed
        </button>
      </div>
    </li>
  );
}

function recordedText(status, doneOn, by) {
  if (!status) return '';
  return `${status === 'done' ? `Done ${formatDate(doneOn, SHORT)}` : 'Not needed'}${by ? `, by ${by}` : ''}`;
}

function TimelineCard({ card, changes, children, doneDates, isNext, multiPlan, onDoneDate, onRemoveExtra, onToggleCycle, onToggleExtra, onToggleItem, removing, today }) {
  const state = isNext ? 'next' : card.state;
  const tag =
    card.kind === 'extra' ? 'From case sheet'
      : card.kind === 'cycle' ? 'OI-TI / IUI'
        : multiPlan || card.plan.type === 'child' ? card.plan.personName : 'Pregnancy';
  const sub = card.kind === 'visit' ? windowText(card)
    : card.kind === 'extra' ? `Added by ${card.item.addedBy}`
      : `Cycle day ${card.day}`;

  return (
    <article className={`nurse-card is-${state}`} aria-label={`${card.title}, ${STATE_PILL[state] || ''}`}>
      <header className="nurse-card-head">
        <span className="nurse-pill">{STATE_PILL[state]}</span>
        <span className="nurse-card-tag">{tag}</span>
      </header>
      <h3 className="nurse-card-title">{card.title}</h3>
      <p className="nurse-card-sub">{sub}</p>

      <ul className="nurse-items">
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

      {children}

      {card.kind === 'extra' && !card.item.status && !changes[`extra:${card.item.id}`] ? (
        <button className="nurse-card-remove" disabled={removing} type="button" onClick={() => onRemoveExtra(card.item)}>
          <Trash2 aria-hidden="true" size={15} /> Remove (added by mistake)
        </button>
      ) : null}
    </article>
  );
}

function QuickDates({ nextDate, onNextDate, today }) {
  return (
    <div className="ios-segmented nurse-quick" role="group" aria-label="Quick dates">
      <button aria-pressed={nextDate === addDays(today, 7)} type="button" onClick={() => onNextDate(addDays(today, 7))}>+1 week</button>
      <button aria-pressed={nextDate === addDays(today, 14)} type="button" onClick={() => onNextDate(addDays(today, 14))}>+2 weeks</button>
      <button aria-pressed={nextDate === addMonths(today, 1)} type="button" onClick={() => onNextDate(addMonths(today, 1))}>+1 month</button>
    </div>
  );
}

// For a patient with no schedule: just the next visit date.
export function NextVisitCard({ nextDate, onNextDate, today }) {
  return (
    <section className="ios-section" aria-labelledby="next-heading">
      <div className="ios-section-head"><h2 id="next-heading">Next visit</h2></div>
      <div className="nurse-card is-next">
        <DateControl label="Next visit date" max={addDays(today, 400)} min={today} onChange={onNextDate} title="Next visit" value={nextDate} />
        <QuickDates nextDate={nextDate} onNextDate={onNextDate} today={today} />
      </div>
      <p className="ios-section-foot">The patient sees this date in the DrJiva app and gets a reminder.</p>
    </section>
  );
}

// The visit as a work list, top to bottom: what she missed, what is due
// now, the next visit (its date is the one the patient is given), then
// later visits and finished ones folded away.
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
  if (!cards.length) return null;

  const renderCard = (card) => {
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
      <TimelineCard
        card={card}
        changes={changes}
        doneDates={doneDates}
        isNext={isNext}
        key={card.key}
        multiPlan={multiPlan}
        onDoneDate={onDoneDate}
        onRemoveExtra={onRemoveExtra}
        onToggleCycle={onToggleCycle}
        onToggleExtra={onToggleExtra}
        onToggleItem={onToggleItem}
        removing={removingId === card.item?.id}
        today={today}
      >
        <DateControl
          hint={!value && card.kind === 'visit' ? `Due ${formatDate(card.fromDate, SHORT)} – ${formatDate(card.toDate, SHORT)}` : ''}
          label={`Date for ${card.title}`}
          max={addDays(today, card.kind === 'extra' ? 400 : card.kind === 'cycle' ? 120 : 2000)}
          min={isNext ? today : addDays(today, -60)}
          onChange={(date) => (isNext ? onNextDate(date) : card.kind === 'cycle' ? onCycleDate(card, date) : onDate(card.key, date))}
          readOnly={!isNext && Boolean(saved)}
          staged={staged}
          title={isNext ? 'Next visit' : saved ? 'Date' : 'Visit date'}
          value={value}
        />
        {isNext ? <QuickDates nextDate={nextDate} onNextDate={onNextDate} today={today} /> : null}
      </TimelineCard>
    );
  };

  const next = cards.find((card) => card.key === nextKey);
  const rest = cards.filter((card) => card.key !== nextKey);
  const missed = rest.filter((card) => card.state === 'pending');
  const dueNow = rest.filter((card) => card.state === 'due_now');
  const later = rest.filter((card) => card.state === 'upcoming' || card.state === 'optional');
  const done = rest.filter((card) => card.state === 'done');

  return (
    <div className="nurse-work">
      {missed.length ? (
        <WorkGroup count={missed.length} id="work-missed" title="Missed" tone="missed" foot="Due earlier and not marked. Tick Done if she had it, Not needed if the doctor said so, or give a new date.">
          {missed.map(renderCard)}
        </WorkGroup>
      ) : null}
      {dueNow.length ? (
        <WorkGroup count={dueNow.length} id="work-now" title="Due now" tone="now">{dueNow.map(renderCard)}</WorkGroup>
      ) : null}
      {next ? (
        <WorkGroup id="work-next" title="Next visit" tone="next" foot="The date here is the one she sees in her DrJiva app, with a reminder.">
          {renderCard(next)}
        </WorkGroup>
      ) : null}
      {later.length ? (
        <details className="nurse-fold">
          <summary>
            <span>Later</span>
            <span className="ios-section-count">{later.length}</span>
            <ChevronDown aria-hidden="true" className="nurse-fold-chevron" size={20} strokeWidth={2.4} />
          </summary>
          <div className="nurse-work-cards">{later.map(renderCard)}</div>
        </details>
      ) : null}
      {done.length ? (
        <details className="nurse-fold">
          <summary>
            <span>Done</span>
            <span className="ios-section-count">{done.length}</span>
            <ChevronDown aria-hidden="true" className="nurse-fold-chevron" size={20} strokeWidth={2.4} />
          </summary>
          <div className="nurse-work-cards">{done.map(renderCard)}</div>
        </details>
      ) : null}
    </div>
  );
}

function WorkGroup({ children, count, foot, id, title, tone }) {
  return (
    <section className={`ios-section nurse-work-group is-${tone}`} aria-labelledby={id}>
      <div className="ios-section-head">
        <h2 id={id}>{title}</h2>
        {typeof count === 'number' ? <span className="ios-section-count">{count}</span> : null}
      </div>
      <div className="nurse-work-cards">{children}</div>
      {foot ? <p className="ios-section-foot">{foot}</p> : null}
    </section>
  );
}
