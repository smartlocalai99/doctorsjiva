import { Check, ClipboardPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { nurseRequest } from '@/contexts/NurseContext';
import { addDays, formatDate } from '@/lib/nurse-schedule';

const SHORT = { day: 'numeric', month: 'short' };

// Shown as suggestions while typing; any other name can be typed too.
const COMMON_TESTS = [
  'CBP (complete blood picture)', 'Hb%', 'Blood group and Rh', 'TSH (thyroid)', 'FBS (fasting sugar)',
  'PPBS (sugar after food)', 'HbA1c', 'OGTT (sugar test)', 'Urine routine', 'Urine culture', 'HIV', 'HBsAg',
  'VDRL', 'HCV', 'Serum ferritin', 'Vitamin D', 'Vitamin B12', 'Serum calcium', 'LFT (liver test)',
  'RFT (kidney test)', 'Lipid profile', 'CRP', 'Dengue test', 'Malaria test', 'Typhoid (Widal)', 'X-ray',
  'ECG', 'Ultrasound scan', 'NT scan', 'Anomaly scan (TIFFA)', 'Growth scan', 'Doppler scan', 'NST',
  'Fetal echo', 'Double marker', 'Quadruple marker', 'Iron injection', 'Td injection', 'Anti-D injection',
];

export const extraKey = (item) => `extra:${item.id}`;

export function extraStatus(changes, item) {
  const staged = changes[extraKey(item)];
  if (staged === 'clear') return null;
  return staged ?? item.status;
}

function ExtraRow({ changes, item, nextDate, onRemove, onToggle, removing }) {
  const staged = changes[extraKey(item)];
  const status = extraStatus(changes, item);
  const choose = (choice) => onToggle(item, status === choice ? null : choice);
  const state = status === 'done' ? 'done' : status === 'not_needed' ? 'not_needed' : 'due_now';
  const when = item.dueDate === nextDate ? `Next visit · ${formatDate(item.dueDate, SHORT)}` : `Due ${formatDate(item.dueDate, SHORT)}`;

  return (
    <li className={`nurse-check nurse-check-${state}`}>
      <div className="nurse-check-copy">
        <strong>{item.label}</strong>
        <span>{when} · added by {item.addedBy}</span>
        {staged ? <em className="nurse-check-staged">Not saved yet</em> : null}
        {!staged && item.status ? (
          <em className="nurse-check-recorded">
            {item.status === 'done' ? `Done ${formatDate(item.doneOn, SHORT)}` : 'Not needed'}
            {item.statusBy ? ` · ${item.statusBy}` : ''}
          </em>
        ) : null}
      </div>
      <div className="nurse-check-actions" role="group" aria-label={`Status of ${item.label}`}>
        <button aria-pressed={status === 'done'} className="nurse-choice nurse-choice-done" type="button" onClick={() => choose('done')}>
          <Check aria-hidden="true" size={18} strokeWidth={3} /> Done
        </button>
        <button aria-pressed={status === 'not_needed'} className="nurse-choice nurse-choice-skip" type="button" onClick={() => choose('not_needed')}>
          Not needed
        </button>
        {!item.status && !staged ? (
          <button
            aria-label={`Remove ${item.label}`}
            className="nurse-choice nurse-choice-remove"
            disabled={removing}
            type="button"
            onClick={() => onRemove(item)}
          >
            <Trash2 aria-hidden="true" size={17} />
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function ExtraTestsCard({ changes, items, nextDate, onAdd, onRemove, onToggle, removingId }) {
  // Grouped by what is saved, so a tapped row stays put until "Save visit".
  const open = items.filter((item) => !item.status).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const closed = items.filter((item) => item.status);

  return (
    <section className="nurse-card" aria-labelledby="extra-heading">
      <h2 className="nurse-card-title" id="extra-heading">Tests and scans from the case sheet</h2>
      {items.length ? null : (
        <p className="nurse-muted">Add any test or scan the doctor wrote that is not in the schedule. The patient sees it for the next visit.</p>
      )}
      {open.length ? (
        <ul className="nurse-checklist">
          {open.map((item) => (
            <ExtraRow changes={changes} item={item} key={item.id} nextDate={nextDate} onRemove={onRemove} onToggle={onToggle} removing={removingId === item.id} />
          ))}
        </ul>
      ) : null}
      {closed.length ? (
        <>
          <h3 className="nurse-plan-subhead">Done or not needed</h3>
          <ul className="nurse-checklist">
            {closed.map((item) => (
              <ExtraRow changes={changes} item={item} key={item.id} nextDate={nextDate} onRemove={onRemove} onToggle={onToggle} removing={false} />
            ))}
          </ul>
        </>
      ) : null}
      <button className="nurse-action-button" type="button" onClick={onAdd}>
        <ClipboardPlus aria-hidden="true" size={22} /> Add test or scan
      </button>
    </section>
  );
}

export function AddExtraSheet({ nextDate, onClose, onDone, patientId, today }) {
  const [label, setLabel] = useState('');
  const [when, setWhen] = useState(nextDate ? 'next' : 'today');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dueDate = when === 'next' ? nextDate : when === 'today' ? today : date;
  const ready = label.trim().length >= 2 && Boolean(dueDate);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const view = await nurseRequest('/api/nurse/extra', {
        body: { action: 'add', done: when === 'today', dueDate, label, patientId },
        method: 'POST',
      });
      onDone(view);
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  };

  return (
    <NurseSheet title="Add test or scan" onClose={onClose}>
      <form className="nurse-form" onSubmit={submit}>
        <label className="nurse-field">
          <span>Test or scan (from the case sheet)</span>
          <div className="nurse-input-wrap">
            <input
              autoComplete="off"
              list="nurse-common-tests"
              maxLength={80}
              placeholder="e.g. TSH (thyroid)"
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <datalist id="nurse-common-tests">
            {COMMON_TESTS.map((name) => <option key={name} value={name} />)}
          </datalist>
        </label>
        <div className="nurse-field">
          <span>When</span>
          <div className="nurse-segment" role="radiogroup" aria-label="When">
            <button aria-checked={when === 'next'} disabled={!nextDate} role="radio" type="button" onClick={() => setWhen('next')}>
              Next visit
            </button>
            <button aria-checked={when === 'today'} role="radio" type="button" onClick={() => setWhen('today')}>Done today</button>
            <button aria-checked={when === 'other'} role="radio" type="button" onClick={() => setWhen('other')}>Other date</button>
          </div>
          {!nextDate ? <small>Pick the next follow-up date on the page first to use “Next visit”.</small> : null}
        </div>
        {when === 'other' ? (
          <label className="nurse-field">
            <span>Date</span>
            <div className="nurse-input-wrap">
              <input max={addDays(today, 400)} min={today} required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </label>
        ) : null}
        {dueDate ? (
          <p className="nurse-preview">
            {when === 'today' ? `Saved as done today, ${formatDate(today)}` : `To do on ${formatDate(dueDate)}`}
          </p>
        ) : null}
        {error ? <p className="error-banner" role="alert">{error}</p> : null}
        <button className="primary-button nurse-big-button" disabled={busy || !ready} type="submit">
          {busy ? 'Adding…' : 'Add test'}
        </button>
      </form>
    </NurseSheet>
  );
}
