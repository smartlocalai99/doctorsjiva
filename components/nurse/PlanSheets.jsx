import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { nurseRequest } from '@/contexts/NurseContext';
import { addDays, childAge, daysBetween, formatDate } from '@/lib/nurse-schedule';

function SheetError({ message }) {
  return message ? <p className="error-banner" role="alert">{message}</p> : null;
}

function useSubmit(onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (body) => {
    setBusy(true);
    setError('');
    try {
      const view = await nurseRequest('/api/nurse/plan', { body, method: 'POST' });
      onDone(view);
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  };
  return { busy, error, run };
}

export function StartPregnancySheet({ doctor, onClose, onDone, patient, today }) {
  const [motherName, setMotherName] = useState(patient.name || '');
  const [mode, setMode] = useState('lmp');
  const [date, setDate] = useState('');
  const { busy, error, run } = useSubmit(onDone);

  const lmp = mode === 'lmp' ? date : date ? addDays(date, -280) : '';
  const edd = mode === 'edd' ? date : date ? addDays(date, 280) : '';
  const week = lmp ? Math.floor(daysBetween(lmp, today) / 7) : null;

  return (
    <NurseSheet title="Start pregnancy schedule" onClose={onClose}>
      <form
        className="nurse-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run({
            action: 'start_pregnancy',
            careDoctorId: doctor.careDoctorId,
            doctorName: doctor.careDoctorId ? null : doctor.name,
            edd: mode === 'edd' ? date : null,
            lmp: mode === 'lmp' ? date : null,
            motherName,
            patientId: patient.id,
          });
        }}
      >
        <label className="nurse-field">
          <span>Mother&apos;s name</span>
          <div className="nurse-input-wrap"><input maxLength={80} required value={motherName} onChange={(event) => setMotherName(event.target.value)} /></div>
          <small>The mobile may be the husband&apos;s. Check the name with her.</small>
        </label>
        <div className="nurse-segment" role="radiogroup" aria-label="Date known">
          <button aria-checked={mode === 'lmp'} role="radio" type="button" onClick={() => { setMode('lmp'); setDate(''); }}>LMP date</button>
          <button aria-checked={mode === 'edd'} role="radio" type="button" onClick={() => { setMode('edd'); setDate(''); }}>Due date (EDD)</button>
        </div>
        <label className="nurse-field">
          <span>{mode === 'lmp' ? 'First day of last period (LMP)' : 'Expected due date (EDD)'}</span>
          <div className="nurse-input-wrap">
            <input
              max={mode === 'lmp' ? today : addDays(today, 300)}
              min={mode === 'lmp' ? addDays(today, -300) : addDays(today, -28)}
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </label>
        {date ? (
          <p className="nurse-preview">Week {Math.max(0, week)} today · Due {formatDate(edd)}</p>
        ) : null}
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy || !date || motherName.trim().length < 2} type="submit">
          {busy ? 'Starting…' : 'Start schedule'}
        </button>
      </form>
    </NurseSheet>
  );
}

export function AddChildSheet({ doctor, onClose, onDone, patient, today }) {
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState(null);
  const { busy, error, run } = useSubmit(onDone);

  return (
    <NurseSheet title="Add child" onClose={onClose}>
      <form
        className="nurse-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run({
            action: 'add_child',
            birthDate,
            careDoctorId: doctor.careDoctorId,
            childName,
            doctorName: doctor.careDoctorId ? null : doctor.name,
            gender,
            patientId: patient.id,
          });
        }}
      >
        <label className="nurse-field">
          <span>Child&apos;s name</span>
          <div className="nurse-input-wrap"><input maxLength={80} required value={childName} onChange={(event) => setChildName(event.target.value)} /></div>
        </label>
        <label className="nurse-field">
          <span>Birth date</span>
          <div className="nurse-input-wrap">
            <input max={today} min={addDays(today, -6574)} required type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </div>
        </label>
        {birthDate ? <p className="nurse-preview">{childAge(birthDate, today)}</p> : null}
        <div className="nurse-field">
          <span>Gender <em>optional</em></span>
          <div className="nurse-segment" role="radiogroup" aria-label="Gender">
            <button aria-checked={gender === 'female'} role="radio" type="button" onClick={() => setGender('female')}>Girl</button>
            <button aria-checked={gender === 'male'} role="radio" type="button" onClick={() => setGender('male')}>Boy</button>
            <button aria-checked={gender === null} role="radio" type="button" onClick={() => setGender(null)}>Not set</button>
          </div>
        </div>
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy || !childName.trim() || !birthDate} type="submit">
          {busy ? 'Adding…' : 'Add child schedule'}
        </button>
      </form>
    </NurseSheet>
  );
}

export function ClosePlanSheet({ onClose, onDone, plan, today }) {
  const isPregnancy = plan.type === 'pregnancy';
  const [outcome, setOutcome] = useState(isPregnancy ? null : 'ended');
  const [date, setDate] = useState(today);
  const { busy, error, run } = useSubmit(onDone);

  return (
    <NurseSheet title={isPregnancy ? 'Close pregnancy schedule' : `Stop ${plan.personName}'s schedule`} onClose={onClose}>
      <form
        className="nurse-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run({ action: 'close', date, outcome, planId: plan.id });
        }}
      >
        {isPregnancy ? (
          <div className="nurse-field">
            <span>What happened?</span>
            <div className="nurse-segment" role="radiogroup" aria-label="Outcome">
              <button aria-checked={outcome === 'delivered'} role="radio" type="button" onClick={() => setOutcome('delivered')}>Delivered</button>
              <button aria-checked={outcome === 'ended'} role="radio" type="button" onClick={() => setOutcome('ended')}>Pregnancy ended</button>
            </div>
          </div>
        ) : (
          <p className="nurse-muted">The vaccine schedule will stop showing in the patient&apos;s app.</p>
        )}
        <label className="nurse-field">
          <span>Date</span>
          <div className="nurse-input-wrap">
            <input max={today} min={addDays(today, -365)} required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </label>
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy || !outcome || !date} type="submit">
          {busy ? 'Saving…' : isPregnancy ? 'Close schedule' : 'Stop schedule'}
        </button>
      </form>
    </NurseSheet>
  );
}

export function CorrectDueDateSheet({ onClose, onDone, plan, today }) {
  const [motherName, setMotherName] = useState(plan.personName);
  const [edd, setEdd] = useState(plan.eddDate);
  const { busy, error, run } = useSubmit(onDone);
  const week = edd ? Math.floor(daysBetween(addDays(edd, -280), today) / 7) : null;

  return (
    <NurseSheet title="Correct due date" onClose={onClose}>
      <form
        className="nurse-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run({ action: 'update_pregnancy', edd, motherName, planId: plan.id });
        }}
      >
        <label className="nurse-field">
          <span>Mother&apos;s name</span>
          <div className="nurse-input-wrap"><input maxLength={80} required value={motherName} onChange={(event) => setMotherName(event.target.value)} /></div>
        </label>
        <label className="nurse-field">
          <span>Due date from the scan (EDD)</span>
          <div className="nurse-input-wrap">
            <input max={addDays(today, 300)} min={addDays(today, -28)} required type="date" value={edd} onChange={(event) => setEdd(event.target.value)} />
          </div>
        </label>
        {edd ? <p className="nurse-preview">Week {Math.max(0, week)} today · Due {formatDate(edd)}</p> : null}
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy || !edd || motherName.trim().length < 2} type="submit">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </NurseSheet>
  );
}

export function HospitalIdSheet({ onClose, onDone, patient }) {
  const [value, setValue] = useState(patient.hospitalPatientId || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <NurseSheet title="Hospital ID" onClose={onClose}>
      <form
        className="nurse-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            onDone(await nurseRequest('/api/nurse/hospital-id', { body: { hospitalPatientId: value, patientId: patient.id }, method: 'POST' }));
          } catch (saveError) {
            setError(saveError.message);
            setBusy(false);
          }
        }}
      >
        <label className="nurse-field">
          <span>UHID / MRN</span>
          <div className="nurse-input-wrap"><input autoComplete="off" maxLength={40} value={value} onChange={(event) => setValue(event.target.value)} /></div>
          <small>Next time you can search with this ID.</small>
        </label>
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save ID'}</button>
      </form>
    </NurseSheet>
  );
}
