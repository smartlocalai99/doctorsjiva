import { Baby, CheckCircle2, HeartPulse, Pencil, Search } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { NurseFrame, NurseLoading } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { PlanCard } from '@/components/nurse/PlanCard';
import {
  AddChildSheet,
  ClosePlanSheet,
  CorrectDueDateSheet,
  HospitalIdSheet,
  StartPregnancySheet,
} from '@/components/nurse/PlanSheets';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import {
  addDays,
  addMonths,
  DEPARTMENT_LABEL,
  formatDate,
  formatMobile,
  nextScheduledVisit,
} from '@/lib/nurse-schedule';

export default function NursePatientPage() {
  const { status } = useNurse();
  if (status === 'loading' || status === 'error') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  return <PatientScreen />;
}

// The schedule's next visit across this patient's plans.
function suggestNextVisit(view) {
  let best = null;
  for (const plan of view.plans) {
    const visit = nextScheduledVisit(plan, view.today);
    if (visit && (!best || visit.fromDate < best.date)) best = { date: visit.fromDate, planId: plan.id, title: visit.titleEn };
  }
  return best;
}

function initialDoctor(view, hospitalDoctors) {
  const current = view.doctor;
  if (!current) return { careDoctorId: null, department: 'general', key: '', name: '' };
  if (current.careDoctorId && hospitalDoctors.some((doctor) => doctor.id === current.careDoctorId)) {
    return { careDoctorId: current.careDoctorId, department: current.department, key: current.careDoctorId, name: current.name };
  }
  return { careDoctorId: null, department: current.department || 'general', key: 'other', name: current.name };
}

function PatientScreen() {
  const router = useRouter();
  const { profile } = useNurse();
  const hospitalDoctors = useMemo(() => profile?.doctors || [], [profile]);
  const patientId = typeof router.query.id === 'string' ? router.query.id : null;

  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [doctor, setDoctor] = useState({ careDoctorId: null, department: 'general', key: '', name: '' });
  const [changes, setChanges] = useState({});
  const [nextDate, setNextDate] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [sheet, setSheet] = useState(null);
  const savedRef = useRef(null);

  const applyFreshView = useCallback((nextView) => {
    setView(nextView);
    setDoctor(initialDoctor(nextView, hospitalDoctors));
    const next = suggestNextVisit(nextView);
    setSuggestion(next);
    setNextDate(next?.date || '');
  }, [hospitalDoctors]);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    nurseRequest(`/api/nurse/patient?id=${encodeURIComponent(patientId)}`)
      .then((loaded) => {
        if (active) applyFreshView(loaded);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, [applyFreshView, patientId]);

  const dirty = Object.keys(changes).length > 0 || note.trim().length > 0;
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loadError) {
    return (
      <NurseFrame backHref="/nurse">
        <section className="nurse-section">
          <p className="error-banner" role="alert">{loadError}</p>
          <Link className="primary-button nurse-big-button" href="/nurse"><Search aria-hidden="true" size={20} /> Back to search</Link>
        </section>
      </NurseFrame>
    );
  }
  if (!view) return <NurseLoading />;

  const today = view.today;
  const patient = view.patient;
  const hasPregnancy = view.plans.some((plan) => plan.type === 'pregnancy');
  const department = doctor.department || 'general';
  const changeCount = Object.keys(changes).length;

  // Staging a tick. Choosing what is already saved removes the staged change.
  const toggleItem = (planId, item, next) => {
    const key = `${planId}:${item.id}`;
    setSavedNotice('');
    setChanges((current) => {
      const updated = { ...current };
      const target = next ?? null;
      if (target === (item.status ?? null)) delete updated[key];
      else updated[key] = target === null ? 'clear' : target;
      return updated;
    });
  };

  const chooseDoctor = (key) => {
    setSavedNotice('');
    if (key === 'other') {
      setDoctor({ careDoctorId: null, department: 'general', key: 'other', name: '' });
      return;
    }
    if (key === '') {
      setDoctor({ careDoctorId: null, department: 'general', key: '', name: '' });
      return;
    }
    const picked = hospitalDoctors.find((item) => item.id === key);
    if (picked) setDoctor({ careDoctorId: picked.id, department: picked.department, key: picked.id, name: picked.name });
  };

  const onPlanChanged = (nextView) => {
    setSheet(null);
    setView(nextView);
    const next = suggestNextVisit(nextView);
    setSuggestion(next);
    if (next && !nextDate) setNextDate(next.date);
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    setSavedNotice('');
    try {
      const items = Object.entries(changes).map(([key, status]) => {
        const [planId, itemId] = key.split(':');
        return { itemId, planId, status };
      });
      const planId = suggestion?.planId || (view.plans.length === 1 ? view.plans[0].id : null);
      const saved = await nurseRequest('/api/nurse/visit', {
        body: {
          careDoctorId: doctor.careDoctorId,
          doctorName: doctor.careDoctorId ? null : doctor.name,
          items,
          nextDate: nextDate || null,
          note,
          patientId: patient.id,
          planId,
        },
        method: 'POST',
      });
      setView(saved);
      setChanges({});
      setNote('');
      setSavedNotice(
        nextDate
          ? `Saved. ${patient.name || 'The patient'}'s app now shows the next visit on ${formatDate(nextDate)}.`
          : `Saved. ${patient.name || 'The patient'}'s app is updated.`,
      );
      window.scrollTo({ behavior: 'smooth', top: 0 });
      requestAnimationFrame(() => savedRef.current?.focus({ preventScroll: true }));
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="nurse-save-bar">
      {saveError ? <p className="nurse-save-error" role="alert">{saveError}</p> : null}
      <button className="primary-button nurse-big-button" disabled={saving || (doctor.key === 'other' && !doctor.name.trim())} type="button" onClick={() => void save()}>
        {saving ? 'Saving…' : changeCount ? `Save visit · ${changeCount} ${changeCount === 1 ? 'tick' : 'ticks'}` : 'Save visit'}
      </button>
    </div>
  );

  return (
    <NurseFrame backHref="/nurse" footer={footer}>
      <Head><title>{`${patient.name || 'Patient'} · DRJIVA Nurse`}</title></Head>

      {savedNotice ? (
        <div className="success-banner nurse-saved" ref={savedRef} role="status" tabIndex={-1}>
          <span><CheckCircle2 aria-hidden="true" size={18} /> {savedNotice}</span>
          <Link href="/nurse">Next patient</Link>
        </div>
      ) : null}

      <section className="nurse-patient-head" aria-labelledby="patient-name">
        <h1 className="nurse-title" id="patient-name">{patient.name || 'Patient'}</h1>
        <p className="nurse-patient-meta">
          <span>+91 {formatMobile(patient.mobile)}</span>
          <button className="nurse-link-button" type="button" onClick={() => setSheet({ type: 'hospitalId' })}>
            {patient.hospitalPatientId ? `ID ${patient.hospitalPatientId}` : 'Add hospital ID'} <Pencil aria-hidden="true" size={14} />
          </button>
        </p>
        {view.lastFollowup ? (
          <p className="nurse-muted">
            Last update {formatDate(view.lastFollowup.visitDate)} by {view.lastFollowup.nurseName}
            {view.lastFollowup.nextDate ? ` · next visit ${formatDate(view.lastFollowup.nextDate)}` : ''}
          </p>
        ) : <p className="nurse-muted">No follow-up saved yet at this hospital.</p>}
      </section>

      <section className="nurse-card" aria-labelledby="doctor-heading">
        <h2 className="nurse-card-title" id="doctor-heading">Doctor</h2>
        <label className="nurse-field">
          <span className="sr-only">Doctor seen today</span>
          <div className="nurse-input-wrap nurse-select-wrap">
            <select value={doctor.key} onChange={(event) => chooseDoctor(event.target.value)}>
              <option value="">Not chosen</option>
              {hospitalDoctors.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {DEPARTMENT_LABEL[item.department]}</option>
              ))}
              <option value="other">Other doctor…</option>
            </select>
          </div>
        </label>
        {doctor.key === 'other' ? (
          <label className="nurse-field">
            <span>Doctor&apos;s name</span>
            <div className="nurse-input-wrap">
              <input
                maxLength={80}
                placeholder="Name from the case sheet"
                value={doctor.name}
                onChange={(event) => setDoctor({ careDoctorId: null, department: 'general', key: 'other', name: event.target.value })}
              />
            </div>
          </label>
        ) : null}
        {view.doctor?.source === 'bill' && doctor.name === view.doctor.name ? (
          <p className="nurse-muted">Filled in from the last pharmacy bill.</p>
        ) : null}

        {department === 'gynecology' && !hasPregnancy ? (
          <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'pregnancy' })}>
            <HeartPulse aria-hidden="true" size={22} /> Pregnancy confirmed – start schedule
          </button>
        ) : null}
        {department === 'pediatrics' ? (
          <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'child' })}>
            <Baby aria-hidden="true" size={22} /> Add child
          </button>
        ) : null}
      </section>

      {view.plans.map((plan) => (
        <PlanCard
          changes={changes}
          everyVisit={view.everyVisit}
          key={plan.id}
          onAction={(type, target) => setSheet({ plan: target, type })}
          onToggle={toggleItem}
          plan={plan}
          today={today}
        />
      ))}

      <section className="nurse-card" aria-labelledby="next-heading">
        <h2 className="nurse-card-title" id="next-heading">Next follow-up</h2>
        <label className="nurse-field">
          <span className="sr-only">Next visit date</span>
          <div className="nurse-input-wrap">
            <input min={today} max={addDays(today, 400)} type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
          </div>
        </label>
        <div className="nurse-quick-dates" role="group" aria-label="Quick dates">
          <button aria-pressed={nextDate === addDays(today, 7)} type="button" onClick={() => setNextDate(addDays(today, 7))}>+1 week</button>
          <button aria-pressed={nextDate === addDays(today, 14)} type="button" onClick={() => setNextDate(addDays(today, 14))}>+2 weeks</button>
          <button aria-pressed={nextDate === addMonths(today, 1)} type="button" onClick={() => setNextDate(addMonths(today, 1))}>+1 month</button>
        </div>
        {suggestion ? (
          <p className="nurse-muted">Schedule&apos;s next visit: {suggestion.title}, from {formatDate(suggestion.date)}. Use the date on the case sheet.</p>
        ) : null}
        {nextDate ? (
          <button className="nurse-link-button" type="button" onClick={() => setNextDate('')}>No next visit</button>
        ) : null}
        <label className="nurse-field">
          <span>Note for the patient <em>optional</em></span>
          <textarea
            className="nurse-textarea"
            maxLength={300}
            placeholder="e.g. Come fasting for sugar test"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <small>{note.length}/300 · The patient sees this in the DrJiva app.</small>
        </label>
      </section>

      {sheet?.type === 'pregnancy' ? (
        <StartPregnancySheet doctor={doctor} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'child' ? (
        <AddChildSheet doctor={doctor} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'close' ? (
        <ClosePlanSheet onClose={() => setSheet(null)} onDone={onPlanChanged} plan={sheet.plan} today={today} />
      ) : null}
      {sheet?.type === 'correct' ? (
        <CorrectDueDateSheet onClose={() => setSheet(null)} onDone={onPlanChanged} plan={sheet.plan} today={today} />
      ) : null}
      {sheet?.type === 'hospitalId' ? (
        <HospitalIdSheet onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} />
      ) : null}
    </NurseFrame>
  );
}
