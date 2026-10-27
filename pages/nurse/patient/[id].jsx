import { Baby, CheckCircle2, ChevronRight, FlaskConical, HeartPulse, Repeat } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BackButton, PageHeader } from '@/components/doctor/DeskParts';
import { AddExtraSheet } from '@/components/nurse/ExtraTests';
import { NurseFrame, NurseLoading } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import {
  AddChildSheet,
  ChangeDayOneSheet,
  CloseCycleSheet,
  ClosePlanSheet,
  CorrectDueDateSheet,
  HospitalIdSheet,
  StartCycleSheet,
  StartPregnancySheet,
} from '@/components/nurse/PlanSheets';
import { CycleSummary, DoctorRow, DoctorSheet, PatientAvatar, PatientHeader, PlanSummary } from '@/components/nurse/PatientTop';
import { NextVisitCard, Timeline } from '@/components/nurse/Timeline';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import { planDoctor } from '@/lib/nurse-directory';
import { buildTimeline, formatDate, suggestedNextDate, withParentRecords } from '@/lib/nurse-schedule';

export default function NursePatientPage() {
  const { status } = useNurse();
  if (status === 'loading' || status === 'error') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  return <PatientScreen />;
}

function initialDoctor(view, hospitalDoctors, deskDoctor) {
  const current = view.doctor;
  // No doctor known yet: the doctor the nurse is working with today.
  if (!current) {
    return deskDoctor
      ? { careDoctorId: deskDoctor.id, department: deskDoctor.department, key: deskDoctor.id, name: deskDoctor.name }
      : { careDoctorId: null, department: 'general', key: '', name: '' };
  }
  if (current.careDoctorId && hospitalDoctors.some((doctor) => doctor.id === current.careDoctorId)) {
    return { careDoctorId: current.careDoctorId, department: current.department, key: current.careDoctorId, name: current.name };
  }
  return { careDoctorId: null, department: current.department || 'general', key: 'other', name: current.name };
}

// Plan / ID actions answer with the basic page (no extra tests or dates).
function mergeView(current, next) {
  return {
    ...next,
    cycles: next.cycles ?? current?.cycles ?? [],
    extraItems: next.extraItems ?? current?.extraItems ?? [],
    vaccineRecords: next.vaccineRecords ?? current?.vaccineRecords ?? [],
    visitDates: next.visitDates ?? current?.visitDates ?? [],
  };
}

function toggle(map, key, savedStatus, next) {
  const updated = { ...map };
  const target = next ?? null;
  if (target === (savedStatus ?? null)) delete updated[key];
  else updated[key] = target === null ? 'clear' : target;
  return updated;
}

function PatientScreen() {
  const router = useRouter();
  const { deskDoctor, profile } = useNurse();
  const hospitalDoctors = useMemo(() => profile?.doctors || [], [profile]);
  const patientId = typeof router.query.id === 'string' ? router.query.id : null;

  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [doctor, setDoctor] = useState({ careDoctorId: null, department: 'general', key: '', name: '' });
  const [changes, setChanges] = useState({});
  const [dates, setDates] = useState({});
  const [doneDates, setDoneDates] = useState({});
  // The next visit date follows the Next card until the nurse sets one.
  const [nextDate, setNextDate] = useState('');
  const [nextTouched, setNextTouched] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [sheet, setSheet] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const savedRef = useRef(null);

  const applyFreshView = useCallback((loaded) => {
    setView(loaded);
    setDoctor(initialDoctor(loaded, hospitalDoctors, deskDoctor));
    setNextDate('');
    setNextTouched(false);
  }, [deskDoctor, hospitalDoctors]);

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

  const dirty = nextTouched || Object.keys(changes).length > 0 || Object.keys(dates).length > 0 || Object.keys(doneDates).length > 0 || note.trim().length > 0;
  useEffect(() => {
    // Tells the frame not to auto-reload for a newer deploy.
    window.__drjivaNurseDirty = dirty;
    return () => {
      window.__drjivaNurseDirty = false;
    };
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const back = <BackButton label="Today" onBack={() => (window.history.length > 1 ? router.back() : router.push('/nurse'))} />;

  if (loadError) {
    return (
      <NurseFrame detail>
        <PageHeader back={back} title="Patient" trailing={null} />
        <div className="ios-notice" role="alert">
          <p>{loadError}</p>
          <Link className="ios-button is-tinted" href="/nurse">Back to Today</Link>
        </div>
      </NurseFrame>
    );
  }
  if (!view) return <NurseLoading />;

  const today = view.today;
  const patient = view.patient;
  const hasPregnancy = view.plans.some((plan) => plan.type === 'pregnancy');
  const cycles = view.cycles || [];
  // The buttons follow the doctor the nurse works with today (Dr. Mounika:
  // pregnancy and IUI; Dr. Sudarshan: child), else the patient's doctor.
  const department =
    deskDoctor?.department && deskDoctor.department !== 'general'
      ? deskDoctor.department
      : doctor.department && doctor.department !== 'general' ? doctor.department : 'general';
  // A new pregnancy or IUI goes to the gynecologist, a child to the
  // pediatrician; the patient's own doctor only if there is none.
  const sheetDoctor = (kind) => {
    const match = planDoctor(hospitalDoctors, kind);
    return match ? { careDoctorId: match.id, department: match.department, key: match.id, name: match.name } : doctor;
  };
  // The desk doctor's own plans: Dr. Sudarshan (children) sees the child
  // plans, Dr. Mounika the pregnancy and cycles. Everything if that would
  // leave nothing.
  const deskDept = deskDoctor?.department;
  const ownPlans = view.plans.filter((plan) =>
    deskDept === 'pediatrics' ? plan.type === 'child' : deskDept === 'gynecology' ? plan.type !== 'child' : true,
  );
  const ownCycles = deskDept === 'pediatrics' ? [] : cycles;
  const showAll = !ownPlans.length && !ownCycles.length;
  const shownPlans = showAll ? view.plans : ownPlans;
  const shownCycles = showAll ? cycles : ownCycles;
  // Vaccines a parent recorded in the app show on their items.
  const { cards, nextKey } = buildTimeline(withParentRecords({ ...view, cycles: shownCycles, plans: shownPlans }), changes, dates, today);
  const nextCard = cards.find((card) => card.key === nextKey) || null;
  const nextValue = nextTouched
    ? nextDate
    : suggestedNextDate(cards, nextCard, today, view.lastFollowup?.nextDate);
  const changeCount = new Set([...Object.keys(changes), ...Object.keys(doneDates)]).size + Object.keys(dates).length;
  // Arrived from "New pregnancy" on the search screen.
  const STARTED = {
    child: 'Child added. The parent’s DrJiva app now shows the vaccine dates.',
    cycle: 'OI-TI / IUI cycle started. Her DrJiva app now shows each step and its date.',
    pregnancy: 'Pregnancy started. Her DrJiva app now shows the baby’s week.',
  };
  const notice = savedNotice || STARTED[router.query.started] || '';

  const touch = () => setSavedNotice('');
  const toggleItem = (planId, item, next) => {
    touch();
    setChanges((current) => toggle(current, `${planId}:${item.id}`, item.status, next));
  };
  const changeDoneDate = (planId, item, date) => {
    touch();
    setDoneDates((current) => ({ ...current, [`${planId}:${item.id}`]: date }));
  };
  const toggleCycle = (cycleId, step, next) => {
    touch();
    setChanges((current) => toggle(current, `cyc:${cycleId}:${step.id}`, step.status, next));
  };
  const setCycleCardDate = (card, date) => {
    touch();
    setDates((current) => {
      const updated = { ...current };
      for (const step of card.steps) updated[`cycdate:${card.cycle.id}:${step.id}`] = date;
      return updated;
    });
  };
  const toggleExtra = (item, next) => {
    touch();
    setChanges((current) => toggle(current, `extra:${item.id}`, item.status, next));
  };
  const setCardDate = (key, date) => {
    touch();
    setDates((current) => ({ ...current, [key]: date }));
  };
  const changeNextDate = (date) => {
    touch();
    setNextDate(date || '');
    setNextTouched(true);
  };

  const removeExtra = async (item) => {
    if (!window.confirm(`Remove “${item.label}”? Only do this if it was added by mistake.`)) return;
    setRemovingId(item.id);
    setSaveError('');
    try {
      const next = await nurseRequest('/api/nurse/extra', { body: { action: 'remove', itemId: item.id }, method: 'POST' });
      setView((current) => mergeView(current, next));
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setRemovingId(null);
    }
  };

  const onPlanChanged = (nextView) => {
    setSheet(null);
    setView((current) => mergeView(current, nextView));
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    setSavedNotice('');
    try {
      const entries = Object.entries(changes);
      const itemChanges = { ...Object.fromEntries(Object.keys(doneDates).map((key) => [key, 'done'])), ...changes };
      const items = Object.entries(itemChanges)
        .filter(([key]) => !key.startsWith('extra:') && !key.startsWith('cyc:'))
        .map(([key, status]) => {
          const [planId, itemId] = key.split(':');
          const doneOn = doneDates[key];
          return { itemId, planId, status, ...(status === 'done' && doneOn ? { doneOn } : {}) };
        });
      const extraItems = entries
        .filter(([key]) => key.startsWith('extra:'))
        .map(([key, status]) => ({ id: key.slice('extra:'.length), status }));
      const visitDates = Object.entries(dates)
        .filter(([key]) => key.startsWith('visit:'))
        .map(([key, date]) => {
          const [, planId, visitId] = key.split(':');
          return { date, planId, visitId };
        });
      // The next visit's card keeps the date the patient was given.
      // Only a date the nurse picked moves that visit; a suggested one belongs to the visit it came from.
      if (nextTouched && nextCard?.kind === 'visit' && nextValue && nextValue !== nextCard.date) {
        visitDates.push({ date: nextValue, planId: nextCard.plan.id, visitId: nextCard.visit.id });
      }
      const extraDates = Object.entries(dates)
        .filter(([key, date]) => key.startsWith('extra:') && date)
        .map(([key, date]) => ({ date, id: key.slice('extra:'.length) }));
      // OI-TI / IUI: ticks and dates per step, merged.
      const stepMap = new Map();
      const stepEntry = (cycleId, stepId) => {
        const key = `${cycleId}:${stepId}`;
        if (!stepMap.has(key)) stepMap.set(key, { cycleId, stepId });
        return stepMap.get(key);
      };
      for (const [key, status] of entries) {
        if (!key.startsWith('cyc:')) continue;
        const [, cycleId, stepId] = key.split(':');
        stepEntry(cycleId, stepId).status = status;
      }
      for (const [key, date] of Object.entries(dates)) {
        if (!key.startsWith('cycdate:')) continue;
        const [, cycleId, stepId] = key.split(':');
        stepEntry(cycleId, stepId).date = date;
      }
      if (nextTouched && nextCard?.kind === 'cycle' && nextValue && nextValue !== nextCard.date) {
        for (const step of nextCard.steps) stepEntry(nextCard.cycle.id, step.id).date = nextValue;
      }
      const cycleSteps = [...stepMap.values()];
      const saved = await nurseRequest('/api/nurse/visit', {
        body: {
          careDoctorId: doctor.careDoctorId,
          doctorName: doctor.careDoctorId ? null : doctor.name,
          cycleSteps,
          extraDates,
          extraItems,
          items,
          nextDate: nextValue || null,
          note,
          patientId: patient.id,
          planId: nextCard?.plan?.id || (view.plans.length === 1 ? view.plans[0].id : null),
          visitDates,
        },
        method: 'POST',
      });
      setView((current) => mergeView(current, saved));
      setChanges({});
      setDates({});
      setDoneDates({});
      setNote('');
      setNextDate('');
      setNextTouched(false);
      setSavedNotice(
        nextValue
          ? `Saved. ${patient.name || 'The patient'}'s app now shows the next visit on ${formatDate(nextValue)}.`
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
      <button className="ios-button is-filled is-large" disabled={saving} type="button" onClick={() => void save()}>
        {saving ? <span className="ios-spinner is-light" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.4} />}
        {saving ? 'Saving…' : 'Save visit'}
        {changeCount && !saving ? <span className="nurse-save-count">{changeCount} {changeCount === 1 ? 'change' : 'changes'}</span> : null}
      </button>
    </div>
  );
  const canStartPregnancy = (department === 'gynecology' || department === 'general') && !hasPregnancy;
  const canStartCycle = department === 'gynecology' && !cycles.length && !hasPregnancy;

  return (
    <NurseFrame detail footer={footer}>
      <Head><title>{`${patient.name || 'Patient'} · DrJiva Nurse`}</title></Head>

      <PageHeader above={<PatientAvatar name={patient.name} />} back={back} title={patient.name || 'Patient'} trailing={null} />
      <PatientHeader onEditId={() => setSheet({ type: 'hospitalId' })} patient={patient} />

      {notice ? (
        <div className="nurse-saved" ref={savedRef} role="status" tabIndex={-1}>
          <CheckCircle2 aria-hidden="true" size={22} strokeWidth={2.4} />
          <p>{notice}</p>
          <Link className="ios-button is-small nurse-saved-next" href="/nurse">Next patient</Link>
        </div>
      ) : null}

      <DoctorRow doctor={doctor} lastFollowup={view.lastFollowup} onEdit={() => setSheet({ type: 'doctor' })} />

      {/* What this doctor's desk can start for her. */}
      {canStartPregnancy || canStartCycle || department === 'pediatrics' ? (
        <section className="ios-section" aria-label="Start a schedule">
          <ul className="ios-group">
            {canStartPregnancy ? (
              <StartRow icon={HeartPulse} label="Pregnancy confirmed" onClick={() => setSheet({ type: 'pregnancy' })} tone="pink" />
            ) : null}
            {canStartCycle ? (
              <StartRow icon={Repeat} label="Start OI-TI / IUI cycle" onClick={() => setSheet({ type: 'cycle' })} tone="purple" />
            ) : null}
            {department === 'pediatrics' ? (
              <StartRow icon={Baby} label="Add child (vaccines)" onClick={() => setSheet({ type: 'child' })} tone="teal" />
            ) : null}
          </ul>
        </section>
      ) : null}

      {shownCycles.map((cycle) => (
        <CycleSummary cycle={cycle} key={cycle.id} onAction={(type, target) => setSheet({ cycle: target, type })} today={today} />
      ))}

      {shownPlans.map((plan) => (
        <PlanSummary everyVisit={view.everyVisit} key={plan.id} onAction={(type, target) => setSheet({ plan: target, type })} patientName={patient.name} plan={plan} today={today} />
      ))}

      {cards.length ? (
        <Timeline
          cards={cards}
          changes={changes}
          dates={dates}
          doneDates={doneDates}
          multiPlan={shownPlans.length > 1}
          nextDate={nextValue}
          nextKey={nextKey}
          onCycleDate={setCycleCardDate}
          onDate={setCardDate}
          onDoneDate={changeDoneDate}
          onNextDate={changeNextDate}
          onRemoveExtra={(item) => void removeExtra(item)}
          onToggleCycle={toggleCycle}
          onToggleExtra={toggleExtra}
          onToggleItem={toggleItem}
          removingId={removingId}
          today={today}
        />
      ) : null}

      {!nextCard ? <NextVisitCard nextDate={nextValue} onNextDate={changeNextDate} today={today} /> : null}

      <section className="ios-section" aria-label="Case sheet">
        <ul className="ios-group">
          <StartRow icon={FlaskConical} label="Add tests or scans from the case sheet" onClick={() => setSheet({ type: 'extra' })} tone="blue" />
        </ul>
      </section>

      <section className="ios-section" aria-labelledby="note-heading">
        <div className="ios-section-head"><h2 id="note-heading">Note for the patient</h2></div>
        <label className="nurse-note">
          <span className="sr-only">Note for the patient, optional</span>
          <textarea
            maxLength={300}
            placeholder="Optional, e.g. Come fasting for the sugar test"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <p className="ios-section-foot">She sees this in the DrJiva app. {note.length}/300</p>
      </section>

      {sheet?.type === 'doctor' ? (
        <DoctorSheet
          doctor={doctor}
          doctors={hospitalDoctors}
          onClose={() => setSheet(null)}
          onSave={(picked) => {
            touch();
            setDoctor(picked);
            setSheet(null);
          }}
        />
      ) : null}
      {sheet?.type === 'pregnancy' ? (
        <StartPregnancySheet doctor={sheetDoctor('pregnancy')} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'cycle' ? (
        <StartCycleSheet doctor={sheetDoctor('cycle')} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'cycleDayOne' ? (
        <ChangeDayOneSheet cycle={sheet.cycle} onClose={() => setSheet(null)} onDone={onPlanChanged} today={today} />
      ) : null}
      {sheet?.type === 'cycleClose' ? (
        <CloseCycleSheet cycle={sheet.cycle} onClose={() => setSheet(null)} onDone={onPlanChanged} today={today} />
      ) : null}
      {sheet?.type === 'child' ? (
        <AddChildSheet doctor={sheetDoctor('child')} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'close' ? (
        <ClosePlanSheet onClose={() => setSheet(null)} onDone={onPlanChanged} plan={sheet.plan} today={today} />
      ) : null}
      {sheet?.type === 'correct' ? (
        <CorrectDueDateSheet onClose={() => setSheet(null)} onDone={onPlanChanged} plan={sheet.plan} today={today} />
      ) : null}
      {sheet?.type === 'extra' ? (
        <AddExtraSheet
          nextDate={nextValue}
          onClose={() => setSheet(null)}
          onDone={(nextView) => {
            setSheet(null);
            setView((current) => mergeView(current, nextView));
          }}
          patientId={patient.id}
          today={today}
        />
      ) : null}
      {sheet?.type === 'hospitalId' ? (
        <HospitalIdSheet onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} />
      ) : null}
    </NurseFrame>
  );
}

// A tappable row with a coloured icon, like a Settings cell.
function StartRow({ icon: Icon, label, onClick, tone }) {
  return (
    <li className="ios-cell">
      <button className="ios-cell-link is-setting" type="button" onClick={onClick}>
        <span className={`ios-icon is-${tone}`} aria-hidden="true"><Icon size={17} strokeWidth={2.4} /></span>
        <span className="ios-cell-body"><span className="ios-cell-title">{label}</span></span>
        <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
      </button>
    </li>
  );
}
