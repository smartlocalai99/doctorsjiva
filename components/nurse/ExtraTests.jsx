import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { nurseRequest } from '@/contexts/NurseContext';
import { addDays, formatDate } from '@/lib/nurse-schedule';

// Shown as suggestions while typing; any other name can be typed too.
const COMMON_TESTS = [
  'CBP (complete blood picture)', 'Hb%', 'Blood group and Rh', 'TSH (thyroid)', 'FBS (fasting sugar)',
  'PPBS (sugar after food)', 'HbA1c', 'OGTT (sugar test)', 'Urine routine', 'Urine culture', 'HIV', 'HBsAg',
  'VDRL', 'HCV', 'Serum ferritin', 'Vitamin D', 'Vitamin B12', 'Serum calcium', 'LFT (liver test)',
  'RFT (kidney test)', 'Lipid profile', 'CRP', 'Dengue test', 'Malaria test', 'Typhoid (Widal)', 'X-ray',
  'ECG', 'Ultrasound scan', 'NT scan', 'Anomaly scan (TIFFA)', 'Growth scan', 'Doppler scan', 'NST',
  'Fetal echo', 'Double marker', 'Quadruple marker', 'Iron injection', 'Td injection', 'Anti-D injection',
];

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
