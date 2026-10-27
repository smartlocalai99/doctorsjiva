import { Check, Plus } from 'lucide-react';
import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { nurseRequest } from '@/contexts/NurseContext';
import { addDays, formatDate } from '@/lib/nurse-schedule';

// Tap to pick; any other name can be typed in "Other test".
const TEST_GROUPS = [
  {
    title: 'Blood and urine tests',
    tests: [
      'CBP (complete blood picture)', 'Hb%', 'Blood group and Rh', 'TSH (thyroid)', 'FBS (fasting sugar)',
      'PPBS (sugar after food)', 'HbA1c', 'OGTT (sugar test)', 'Urine routine', 'Urine culture', 'HIV', 'HBsAg',
      'VDRL', 'HCV', 'Serum ferritin', 'Vitamin D', 'Vitamin B12', 'Serum calcium', 'LFT (liver test)',
      'RFT (kidney test)', 'Lipid profile', 'CRP', 'Dengue test', 'Malaria test', 'Typhoid (Widal)',
      'Double marker', 'Quadruple marker',
    ],
  },
  {
    title: 'Scans and checks',
    tests: ['Ultrasound scan', 'NT scan', 'Anomaly scan (TIFFA)', 'Growth scan', 'Doppler scan', 'Fetal echo', 'NST', 'X-ray', 'ECG'],
  },
  {
    title: 'Injections',
    tests: ['Iron injection', 'Td injection', 'Anti-D injection'],
  },
];
const LISTED = new Set(TEST_GROUPS.flatMap((group) => group.tests.map((name) => name.toLowerCase())));
const MAX_TESTS = 30;

const tidy = (value) => value.replace(/\s+/g, ' ').trim();

export function AddExtraSheet({ nextDate, onClose, onDone, patientId, today }) {
  const [picked, setPicked] = useState([]);
  const [typed, setTyped] = useState([]);
  const [other, setOther] = useState('');
  const [when, setWhen] = useState(nextDate ? 'next' : 'today');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isPicked = (name) => picked.some((item) => item.toLowerCase() === name.toLowerCase());
  const toggle = (name) => {
    setPicked((current) => (
      isPicked(name)
        ? current.filter((item) => item.toLowerCase() !== name.toLowerCase())
        : current.length < MAX_TESTS ? [...current, name] : current
    ));
  };
  const addOther = () => {
    const name = tidy(other);
    if (name.length < 2) return;
    if (!LISTED.has(name.toLowerCase()) && !typed.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setTyped((current) => [...current, name]);
    }
    if (!isPicked(name)) toggle(name);
    setOther('');
  };

  const dueDate = when === 'next' ? nextDate : when === 'today' ? today : date;
  const count = picked.length;
  const ready = count > 0 && Boolean(dueDate);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const view = await nurseRequest('/api/nurse/extra', {
        body: { action: 'addMany', done: when === 'today', dueDate, labels: picked, patientId },
        method: 'POST',
      });
      onDone(view);
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  };

  const groups = typed.length ? [...TEST_GROUPS, { title: 'Typed by you', tests: typed }] : TEST_GROUPS;

  return (
    <NurseSheet title="Add tests or scans" onClose={onClose}>
      <form className="nurse-form" onSubmit={submit}>
        <p className="nurse-test-hint">Tap every test on the case sheet. Tap again to remove.</p>
        {groups.map((group) => (
          <fieldset className="nurse-test-group" key={group.title}>
            <legend>{group.title}</legend>
            <div className="nurse-test-chips">
              {group.tests.map((name) => {
                const on = isPicked(name);
                return (
                  <button aria-pressed={on} className="nurse-test-chip" key={name} type="button" onClick={() => toggle(name)}>
                    {on ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <label className="nurse-field">
          <span>Other test not in the list</span>
          <div className="nurse-test-other">
            <div className="nurse-input-wrap">
              <input
                autoComplete="off"
                maxLength={80}
                placeholder="e.g. AMH"
                value={other}
                onChange={(event) => setOther(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addOther();
                  }
                }}
              />
            </div>
            <button className="ios-button is-tinted" disabled={tidy(other).length < 2} type="button" onClick={addOther}>
              <Plus aria-hidden="true" size={18} />
              Add
            </button>
          </div>
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
        {dueDate && count ? (
          <p className="nurse-preview">
            {when === 'today' ? `Saved as done today, ${formatDate(today)}` : `To do on ${formatDate(dueDate)}`}
          </p>
        ) : null}
        {error ? <p className="ios-error" role="alert">{error}</p> : null}
        <div className="nurse-test-submit">
          <button className="ios-button is-filled is-large" disabled={busy || !ready} type="submit">
            {busy ? 'Adding…' : count === 0 ? 'Pick tests to add' : `Add ${count} ${count === 1 ? 'test' : 'tests'}`}
          </button>
        </div>
      </form>
    </NurseSheet>
  );
}
