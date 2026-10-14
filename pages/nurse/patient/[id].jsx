import { Baby, CheckCircle2, ClipboardPlus, HeartPulse, Search, Sprout } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { CycleSummary, DoctorSheet, PatientHeader, PlanSummary } from '@/components/nurse/PatientTop';
import { NextVisitCard, Timeline } from '@/components/nurse/Timeline';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import { buildTimeline, formatDate, withParentRecords } from '@/lib/nurse-schedule';

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

// The next visit the patient already has (if still ahead).
function savedNextDate(view) {
  const last = view.lastFollowup?.nextDate;
  return last && last >= view.today ? last : '';
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

  const dirty = Object.keys(changes).length > 0 || Object.keys(dates).length > 0 || note.trim().length > 0;
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
  const cycles = view.cycles || [];
  const department = doctor.department && doctor.department !== 'general' ? doctor.department : deskDoctor?.department || 'general';
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
    : nextCard?.date && nextCard.date >= today ? nextCard.date : savedNextDate(view);
  const changeCount = Object.keys(changes).length + Object.keys(dates).length;
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
      const items = entries
        .filter(([key]) => !key.startsWith('extra:') && !key.startsWith('cyc:'))
        .map(([key, status]) => {
          const [planId, itemId] = key.split(':');
          return { itemId, planId, status };
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
      if (nextCard?.kind === 'visit' && nextValue && nextValue !== nextCard.date) {
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
      if (nextCard?.kind === 'cycle' && nextValue && nextValue !== nextCard.date) {
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
      <button className="primary-button nurse-big-button" disabled={saving} type="button" onClick={() => void save()}>
        {saving ? 'Saving…' : changeCount ? `Save visit · ${changeCount} ${changeCount === 1 ? 'change' : 'changes'}` : 'Save visit'}
      </button>
    </div>
  );

  return (
    <NurseFrame backHref="/nurse" footer={footer}>
      <Head><title>{`${patient.name || 'Patient'} · DRJIVA Nurse`}</title></Head>

      {notice ? (
        <div className="success-banner nurse-saved" ref={savedRef} role="status" tabIndex={-1}>
          <span><CheckCircle2 aria-hidden="true" size={18} /> {notice}</span>
          <Link href="/nurse">Next patient</Link>
        </div>
      ) : null}

      <PatientHeader doctor={doctor} onEditDoctor={() => setSheet({ type: 'doctor' })} onEditId={() => setSheet({ type: 'hospitalId' })} patient={patient} />
      {view.lastFollowup ? (
        <p className="nurse-muted nurse-last-update">
          Last updated {formatDate(view.lastFollowup.visitDate)} by {view.lastFollowup.nurseName}
        </p>
      ) : null}

      {/* What this doctor's desk can start for her. */}
      {department === 'gynecology' && (!hasPregnancy || !cycles.length) ? (
        <div className="nurse-start-row">
          {!hasPregnancy ? (
            <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'pregnancy' })}>
              <HeartPulse aria-hidden="true" size={20} /> Pregnancy confirmed
            </button>
          ) : null}
          {!cycles.length && !hasPregnancy ? (
            <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'cycle' })}>
              <Sprout aria-hidden="true" size={20} /> Start OI-TI / IUI cycle
            </button>
          ) : null}
        </div>
      ) : null}
      {department === 'pediatrics' ? (
        <div className="nurse-start-row">
          <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'child' })}>
            <Baby aria-hidden="true" size={20} /> Add child
          </button>
        </div>
      ) : null}
      {department === 'general' && !hasPregnancy ? (
        <div className="nurse-start-row">
          <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'pregnancy' })}>
            <HeartPulse aria-hidden="true" size={20} /> Pregnancy confirmed
          </button>
        </div>
      ) : null}

      {shownCycles.map((cycle) => (
        <CycleSummary cycle={cycle} key={cycle.id} onAction={(type, target) => setSheet({ cycle: target, type })} today={today} />
      ))}

      {shownPlans.map((plan) => (
        <PlanSummary everyVisit={view.everyVisit} key={plan.id} onAction={(type, target) => setSheet({ plan: target, type })} patientName={patient.name} plan={plan} today={today} />
      ))}

      {cards.length ? (
        <section className="nurse-section" aria-labelledby="timeline-heading">
          <div className="nurse-list-head">
            <h2 className="nurse-card-title" id="timeline-heading">Visits, scans and tests</h2>
            <span className="nurse-muted">Swipe sideways</span>
          </div>
          <Timeline
            cards={cards}
            changes={changes}
            dates={dates}
            multiPlan={shownPlans.length > 1}
            nextDate={nextValue}
            nextKey={nextKey}
            onCycleDate={setCycleCardDate}
            onDate={setCardDate}
            onNextDate={changeNextDate}
            onRemoveExtra={(item) => void removeExtra(item)}
            onToggleCycle={toggleCycle}
            onToggleExtra={toggleExtra}
            onToggleItem={toggleItem}
            removingId={removingId}
            today={today}
          />
        </section>
      ) : null}

      {!nextCard ? <NextVisitCard nextDate={nextValue} onNextDate={changeNextDate} today={today} /> : null}

      <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'extra' })}>
        <ClipboardPlus aria-hidden="true" size={20} /> Add test or scan from the case sheet
      </button>

      <section className="nurse-card" aria-labelledby="note-heading">
        <label className="nurse-field">
          <span id="note-heading">Note for the patient <em>optional</em></span>
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
        <StartPregnancySheet doctor={doctor} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'cycle' ? (
        <StartCycleSheet doctor={doctor} onClose={() => setSheet(null)} onDone={onPlanChanged} patient={patient} today={today} />
      ) : null}
      {sheet?.type === 'cycleDayOne' ? (
        <ChangeDayOneSheet cycle={sheet.cycle} onClose={() => setSheet(null)} onDone={onPlanChanged} today={today} />
      ) : null}
      {sheet?.type === 'cycleClose' ? (
        <CloseCycleSheet cycle={sheet.cycle} onClose={() => setSheet(null)} onDone={onPlanChanged} today={today} />
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
