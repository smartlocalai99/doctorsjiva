import { Baby, CheckCircle2, ClipboardPlus, HeartPulse, Search } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AddExtraSheet } from '@/components/nurse/ExtraTests';
import { NurseFrame, NurseLoading } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import {
  AddChildSheet,
  ClosePlanSheet,
  CorrectDueDateSheet,
  HospitalIdSheet,
  StartPregnancySheet,
} from '@/components/nurse/PlanSheets';
import { DoctorSheet, PatientHeader, PlanSummary } from '@/components/nurse/PatientTop';
import { NextVisitCard, Timeline } from '@/components/nurse/Timeline';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import { buildTimeline, formatDate } from '@/lib/nurse-schedule';

export default function NursePatientPage() {
  const { status } = useNurse();
  if (status === 'loading' || status === 'error') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  return <PatientScreen />;
}

function initialDoctor(view, hospitalDoctors) {
  const current = view.doctor;
  if (!current) return { careDoctorId: null, department: 'general', key: '', name: '' };
  if (current.careDoctorId && hospitalDoctors.some((doctor) => doctor.id === current.careDoctorId)) {
    return { careDoctorId: current.careDoctorId, department: current.department, key: current.careDoctorId, name: current.name };
  }
  return { careDoctorId: null, department: current.department || 'general', key: 'other', name: current.name };
}

// Next visit date to start with: the date already planned for the next
// visit, else the next visit the patient already has.
function initialNextDate(view) {
  const { cards, nextKey } = buildTimeline(view, {}, {}, view.today);
  const planned = cards.find((card) => card.key === nextKey)?.date;
  if (planned && planned >= view.today) return planned;
  const last = view.lastFollowup?.nextDate;
  return last && last >= view.today ? last : '';
}

// Plan / ID actions answer with the basic page (no extra tests or dates).
function mergeView(current, next) {
  return {
    ...next,
    extraItems: next.extraItems ?? current?.extraItems ?? [],
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
  const { profile } = useNurse();
  const hospitalDoctors = useMemo(() => profile?.doctors || [], [profile]);
  const patientId = typeof router.query.id === 'string' ? router.query.id : null;

  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [doctor, setDoctor] = useState({ careDoctorId: null, department: 'general', key: '', name: '' });
  const [changes, setChanges] = useState({});
  const [dates, setDates] = useState({});
  const [nextDate, setNextDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [sheet, setSheet] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const savedRef = useRef(null);

  const applyFreshView = useCallback((loaded) => {
    setView(loaded);
    setDoctor(initialDoctor(loaded, hospitalDoctors));
    setNextDate(initialNextDate(loaded));
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

  const dirty = Object.keys(changes).length > 0 || Object.keys(dates).length > 0 || note.trim().length > 0;
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
  const { cards, nextKey } = buildTimeline(view, changes, dates, today);
  const nextCard = cards.find((card) => card.key === nextKey) || null;
  const changeCount = Object.keys(changes).length + Object.keys(dates).length;
  // Arrived from "New pregnancy" on the search screen.
  const notice = savedNotice || (router.query.started === 'pregnancy' && hasPregnancy
    ? 'Pregnancy started. Her DrJiva app now shows the baby’s week.'
    : '');

  const touch = () => setSavedNotice('');
  const toggleItem = (planId, item, next) => {
    touch();
    setChanges((current) => toggle(current, `${planId}:${item.id}`, item.status, next));
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
        .filter(([key]) => !key.startsWith('extra:'))
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
      if (nextCard?.kind === 'visit' && nextDate && nextDate !== nextCard.date) {
        visitDates.push({ date: nextDate, planId: nextCard.plan.id, visitId: nextCard.visit.id });
      }
      const extraDates = Object.entries(dates)
        .filter(([key, date]) => key.startsWith('extra:') && date)
        .map(([key, date]) => ({ date, id: key.slice('extra:'.length) }));
      const saved = await nurseRequest('/api/nurse/visit', {
        body: {
          careDoctorId: doctor.careDoctorId,
          doctorName: doctor.careDoctorId ? null : doctor.name,
          extraDates,
          extraItems,
          items,
          nextDate: nextDate || null,
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

      {!hasPregnancy || doctor.department === 'pediatrics' ? (
        <div className="nurse-start-row">
          {!hasPregnancy ? (
            <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'pregnancy' })}>
              <HeartPulse aria-hidden="true" size={20} /> Pregnancy confirmed
            </button>
          ) : null}
          {doctor.department === 'pediatrics' ? (
            <button className="nurse-action-button" type="button" onClick={() => setSheet({ type: 'child' })}>
              <Baby aria-hidden="true" size={20} /> Add child
            </button>
          ) : null}
        </div>
      ) : null}

      {view.plans.map((plan) => (
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
            multiPlan={view.plans.length > 1}
            nextDate={nextDate}
            nextKey={nextKey}
            onDate={setCardDate}
            onNextDate={changeNextDate}
            onRemoveExtra={(item) => void removeExtra(item)}
            onToggleExtra={toggleExtra}
            onToggleItem={toggleItem}
            removingId={removingId}
            today={today}
          />
        </section>
      ) : null}

      {!nextCard ? <NextVisitCard nextDate={nextDate} onNextDate={changeNextDate} today={today} /> : null}

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
          nextDate={nextDate}
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
