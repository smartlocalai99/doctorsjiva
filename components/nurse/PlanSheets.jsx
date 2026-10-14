import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { nurseRequest } from '@/contexts/NurseContext';
import { addDays, childAge, daysBetween, formatDate, pregnancyText } from '@/lib/nurse-schedule';

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
    <NurseSheet title="Pregnancy confirmed" onClose={onClose}>
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
          <button aria-checked={mode === 'lmp'} role="radio" type="button" onClick={() => { setMode('lmp'); setDate(''); }}>Last period date</button>
          <button aria-checked={mode === 'edd'} role="radio" type="button" onClick={() => { setMode('edd'); setDate(''); }}>Expected delivery date</button>
        </div>
        <label className="nurse-field">
          <span>{mode === 'lmp' ? 'First day of her last period' : 'Expected delivery date'}</span>
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
          <p className="nurse-preview">{pregnancyText(week)} today · Expected delivery {formatDate(edd)}</p>
        ) : null}
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy || !date || motherName.trim().length < 2} type="submit">
          {busy ? 'Starting…' : 'Start pregnancy'}
        </button>
      </form>
    </NurseSheet>
  );
}

// From the search screen, once the doctor has confirmed a pregnancy. Her
// mobile number is the key: the patient is added (or found) and her
// schedule starts in one go.
export function NewPregnancySheet({ doctors, onClose, onStarted, today }) {
  const gynecologists = doctors.filter((item) => item.department === 'gynecology');
  const doctorOptions = gynecologists.length ? gynecologists : doctors;
  const [mobile, setMobile] = useState('');
  const [motherName, setMotherName] = useState('');
  const [doctorKey, setDoctorKey] = useState(doctorOptions[0]?.id || '');
  const [otherDoctor, setOtherDoctor] = useState('');
  const [mode, setMode] = useState('lmp');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState(null);

  const lmp = mode === 'lmp' ? date : date ? addDays(date, -280) : '';
  const edd = mode === 'edd' ? date : date ? addDays(date, 280) : '';
  const week = lmp ? Math.floor(daysBetween(lmp, today) / 7) : null;
  const ready = mobile.length === 10 && motherName.trim().length >= 2 && date && (doctorKey !== 'other' || otherDoctor.trim());

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setExistingId(null);
    let patientId = null;
    try {
      const view = await nurseRequest('/api/nurse/patient', { body: { mobile, name: motherName }, method: 'POST' });
      const patient = view.patient;
      patientId = patient.id;
      await nurseRequest('/api/nurse/plan', {
        body: {
          action: 'start_pregnancy',
          careDoctorId: doctorKey && doctorKey !== 'other' ? doctorKey : null,
          doctorName: doctorKey === 'other' ? otherDoctor : null,
          edd: mode === 'edd' ? date : null,
          lmp: mode === 'lmp' ? date : null,
          motherName,
          patientId,
        },
        method: 'POST',
      });
      onStarted(patient);
    } catch (submitError) {
      setError(submitError.message);
      if (submitError.code === 'pregnancy_exists') setExistingId(patientId);
      setBusy(false);
    }
  };

  return (
    <NurseSheet title="New pregnancy" onClose={onClose}>
      <form className="nurse-form" onSubmit={submit}>
        <label className="nurse-field">
          <span>Her mobile number</span>
          <div className="nurse-input-wrap">
            <span className="nurse-input-prefix">+91</span>
            <input
              autoComplete="off"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile"
              required
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          <small>The number she opens DrJiva with.</small>
        </label>
        <label className="nurse-field">
          <span>Mother&apos;s name</span>
          <div className="nurse-input-wrap">
            <input autoComplete="off" maxLength={80} required value={motherName} onChange={(event) => setMotherName(event.target.value)} />
          </div>
        </label>
        <label className="nurse-field">
          <span>Doctor who confirmed</span>
          <div className="nurse-input-wrap nurse-select-wrap">
            <select value={doctorKey} onChange={(event) => setDoctorKey(event.target.value)}>
              {doctorOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
              <option value="other">Other doctor…</option>
            </select>
          </div>
        </label>
        {doctorKey === 'other' ? (
          <label className="nurse-field">
            <span>Doctor&apos;s name</span>
            <div className="nurse-input-wrap">
              <input maxLength={80} placeholder="Name from the case sheet" value={otherDoctor} onChange={(event) => setOtherDoctor(event.target.value)} />
            </div>
          </label>
        ) : null}
        <div className="nurse-segment" role="radiogroup" aria-label="Date known">
          <button aria-checked={mode === 'lmp'} role="radio" type="button" onClick={() => { setMode('lmp'); setDate(''); }}>Last period date</button>
          <button aria-checked={mode === 'edd'} role="radio" type="button" onClick={() => { setMode('edd'); setDate(''); }}>Expected delivery date</button>
        </div>
        <label className="nurse-field">
          <span>{mode === 'lmp' ? 'First day of her last period' : 'Expected delivery date'}</span>
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
        {date ? <p className="nurse-preview">{pregnancyText(week)} today · Expected delivery {formatDate(edd)}</p> : null}
        <SheetError message={error} />
        {existingId ? (
          <a className="nurse-link-button" href={`/nurse/patient/${existingId}`}>Open her page</a>
        ) : null}
        <button className="primary-button nurse-big-button" disabled={busy || !ready} type="submit">
          {busy ? 'Starting…' : 'Start pregnancy'}
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
    <NurseSheet title={isPregnancy ? 'Pregnancy finished' : `Stop ${plan.personName}'s vaccines`} onClose={onClose}>
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
          <p className="nurse-muted">The vaccine dates will stop showing in the patient&apos;s app.</p>
        )}
        <label className="nurse-field">
          <span>Date</span>
          <div className="nurse-input-wrap">
            <input max={today} min={addDays(today, -365)} required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </label>
        <SheetError message={error} />
        <button className="primary-button nurse-big-button" disabled={busy || !outcome || !date} type="submit">
          {busy ? 'Saving…' : isPregnancy ? 'Save' : 'Stop vaccines'}
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
    <NurseSheet title="Change delivery date" onClose={onClose}>
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
          <span>Expected delivery date (from the scan)</span>
          <div className="nurse-input-wrap">
            <input max={addDays(today, 300)} min={addDays(today, -28)} required type="date" value={edd} onChange={(event) => setEdd(event.target.value)} />
          </div>
        </label>
        {edd ? <p className="nurse-preview">{pregnancyText(week)} today · Expected delivery {formatDate(edd)}</p> : null}
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
