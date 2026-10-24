// The doctor's desk: who is coming on which day, what to have ready, and
// who did not come. Pure functions (no network) so the server and the
// tests share them. Dates are 'YYYY-MM-DD' strings in India time.
//
// A "visit" is a follow-up the nurse saved (care_followups): the patient
// was at the hospital that day. An "appointment" is a day a patient is
// expected: the next visit date the nurse set, a booked schedule visit, a
// test from the case sheet, or an OI-TI / IUI step.

import { addDays, addMonths, daysBetween, itemState, pregnancyMonth, trimester, visitState } from './nurse-schedule.js';

export function indiaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

// Same cleaning as care_clean_doctor_name in the database.
const TITLES = /\b(dr|doctor|prof|mbbs|md|ms|dgo|dnb|obg|obgy|og|dch|mch|dm|frcog|mrcog|frcs|mrcp|fogsi|ped|peds|paed|paeds|gyn|gyne|gynae|gynaec|gynec|consultant)\b/g;

export function cleanDoctorName(name) {
  const cleaned = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(TITLES, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

// The nurse-desk doctor (care_doctors) for a signed-in doctor, by name and
// aliases, the way care_match_doctor matches bill names. Longest match wins.
export function matchCareDoctor(careDoctors, aliases, doctorName) {
  const name = cleanDoctorName(doctorName);
  if (!name) return null;
  let best = null;
  for (const doctor of careDoctors) {
    const names = [doctor.display_name, ...aliases.filter((alias) => alias.doctor_id === doctor.id).map((alias) => alias.alias)]
      .map(cleanDoctorName)
      .filter(Boolean);
    for (const candidate of names) {
      if (` ${name} `.includes(` ${candidate} `) && (!best || candidate.length > best.length)) best = { doctor, length: candidate.length };
    }
  }
  return best?.doctor || null;
}

// care_window: "weeks 11-13" runs from 11w0d to the last day of week 13.
function shift(start, unit, amount) {
  if (unit === 'week') return addDays(start, amount * 7);
  return addMonths(start, unit === 'year' ? amount * 12 : amount);
}

function windowOf(start, unit, from, to) {
  return { fromDate: shift(start, unit, from), toDate: addDays(shift(start, unit, to + 1), -1) };
}

export function planStartDate(plan) {
  return plan.plan_type === 'pregnancy' ? addDays(plan.edd_date, -280) : plan.birth_date;
}

// care_plan_view in JavaScript: the plan's visits and checklist with their
// due windows, what the nurse ticked and the dates she booked.
export function planView(plan, schedule, planItems, visitDates) {
  const startDate = planStartDate(plan);
  const ofType = schedule.visits.filter((visit) => visit.plan_type === plan.plan_type && visit.is_active !== false);
  const ownSchedule = ofType.some((visit) => visit.hospital_id === plan.hospital_id);
  const visits = ofType
    .filter((visit) => (ownSchedule ? visit.hospital_id === plan.hospital_id : !visit.hospital_id))
    .sort((a, b) => a.sort_order - b.sort_order);
  const ticks = new Map(planItems.filter((row) => row.plan_id === plan.id).map((row) => [row.item_id, row]));
  const booked = new Map(visitDates.filter((row) => row.plan_id === plan.id).map((row) => [row.visit_id, row.planned_date]));

  return {
    birthDate: plan.birth_date,
    doctorId: plan.care_doctor_id,
    eddDate: plan.edd_date,
    gender: plan.child_gender,
    id: plan.id,
    lmpDate: plan.lmp_date,
    patientId: plan.patient_id,
    personName: plan.person_name,
    startDate,
    status: plan.status,
    type: plan.plan_type,
    visits: visits.map((visit) => {
      const range = windowOf(startDate, visit.due_unit, visit.due_from, visit.due_to);
      const items = schedule.items
        .filter((item) => item.visit_id === visit.id && item.is_active !== false)
        .filter((item) => !item.only_for_gender || !plan.child_gender || item.only_for_gender === plan.child_gender)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => {
          const own = item.due_unit ? windowOf(startDate, item.due_unit, item.due_from, item.due_to) : range;
          const plus = item.due_plus_days || 0;
          const tick = ticks.get(item.id);
          return {
            conditional: Boolean(item.is_conditional || (item.only_for_gender && !plan.child_gender)),
            doneOn: tick?.done_on || null,
            fromDate: addDays(own.fromDate, plus),
            id: item.id,
            labelEn: item.label_en,
            optional: Boolean(item.is_optional),
            status: tick?.status || null,
            toDate: addDays(own.toDate, plus),
          };
        });
      return { ...range, id: visit.id, items, plannedDate: booked.get(visit.id) || null, titleEn: visit.title_en };
    }),
  };
}

// care_cycle_view step dates: the date the nurse set, else (IUI) the
// linked step's date + offset, else Day 1 + (day - 1).
export function cycleView(cycle, protocolSteps, records, protocolTitle = 'OI-TI / IUI') {
  const byStep = new Map(records.filter((row) => row.cycle_id === cycle.id).map((row) => [row.step_id, row]));
  const base = protocolSteps
    .filter((step) => step.protocol_code === cycle.protocol_code && step.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step) => {
      const record = byStep.get(step.id);
      return { ...step, baseDate: addDays(cycle.anchor_date, step.day - 1), record };
    });
  const byCode = new Map(base.map((step) => [step.code, step]));
  return {
    anchorDate: cycle.anchor_date,
    doctorId: cycle.care_doctor_id,
    id: cycle.id,
    partnerName: cycle.partner_name,
    patientId: cycle.patient_id,
    personName: cycle.person_name,
    status: cycle.status,
    title: protocolTitle,
    steps: base.map((step) => {
      const linked = step.linked_step_code ? byCode.get(step.linked_step_code) : null;
      const date = step.record?.planned_date
        || (linked ? addDays(linked.record?.planned_date || linked.baseDate, step.linked_offset_days || 0) : null)
        || step.baseDate;
      return {
        date,
        day: step.day,
        doneOn: step.record?.done_on || null,
        id: step.id,
        labelEn: step.label_en,
        status: step.record?.status || null,
        who: step.who,
      };
    }),
  };
}

export function cycleDayOn(cycle, date) {
  return daysBetween(cycle.anchorDate, date) + 1;
}

export function pregnancyOn(plan, date) {
  const week = Math.max(0, Math.floor(daysBetween(plan.startDate, date) / 7));
  return { month: pregnancyMonth(week), trimester: trimester(week), week };
}

const closed = (status) => status === 'done' || status === 'not_needed';

// What the nurse and doctor need ready when this plan's patient comes on
// `date`: checklist items due that day, then earlier ones still not done.
export function planPrepare(plan, date) {
  const due = [];
  const overdue = [];
  for (const visit of plan.visits) {
    for (const item of visit.items) {
      if (closed(item.status) || item.optional) continue;
      const state = itemState(item, date);
      if (state === 'due_now' || (visit.plannedDate === date && state !== 'optional')) due.push({ label: item.labelEn });
      else if (state === 'pending') overdue.push({ label: item.labelEn, overdue: true });
    }
  }
  return [...due, ...overdue];
}

// The next schedule visit (by window) still open after `date`.
export function nextOpenVisit(plan, date) {
  return plan.visits.find((visit) => visit.toDate >= date && visitState(visit, date) !== 'done') || null;
}

// Every day each patient is expected, with its status:
// seen      the nurse saved a visit that day
// expected  today, not seen yet
// upcoming  a later day
// late      missed the day but came afterwards (cameOn)
// missed    did not come and has not come since
export function buildAppointments({ cycles, extras, followups, plans, today }) {
  const visitsByPatient = new Map();
  for (const followup of followups) {
    const list = visitsByPatient.get(followup.patient_id) || [];
    list.push(followup);
    visitsByPatient.set(followup.patient_id, list);
  }
  for (const list of visitsByPatient.values()) list.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  const byKey = new Map();
  const add = (patientId, date, reason) => {
    if (!patientId || !date) return;
    const key = `${patientId}:${date}`;
    const entry = byKey.get(key) || { date, key, patientId, reasons: [] };
    entry.reasons.push(reason);
    byKey.set(key, entry);
  };

  // Next visit dates the nurse set. A later visit before that date
  // (she came early, or the date was changed) replaces it. Every day the
  // nurse saved a visit is listed too, so a walk-in shows as seen.
  for (const [patientId, list] of visitsByPatient) {
    list.forEach((followup, index) => {
      add(patientId, followup.visit_date, { kind: 'came', label: 'Visit' });
      if (!followup.next_date) return;
      const replaced = list.slice(index + 1).some((later) => later.visit_date < followup.next_date);
      if (!replaced) add(patientId, followup.next_date, { kind: 'followup', label: 'Follow-up visit', note: followup.note || null });
    });
  }
  for (const plan of plans) {
    for (const visit of plan.visits) {
      if (visit.plannedDate && visitState(visit, visit.plannedDate) !== 'done') {
        add(plan.patientId, visit.plannedDate, { kind: 'visit', label: visit.titleEn, planId: plan.id });
      }
    }
  }
  for (const item of extras) {
    if (item.status === 'not_needed') continue;
    add(item.patient_id, item.due_date, { done: item.status === 'done', kind: 'extra', label: item.label });
  }
  for (const cycle of cycles) {
    for (const step of cycle.steps) {
      if (step.status === 'not_needed') continue;
      add(cycle.patientId, step.date, { cycleId: cycle.id, done: step.status === 'done', kind: 'cycle', label: step.labelEn });
    }
  }

  const plansByPatient = groupBy(plans, (plan) => plan.patientId);
  const cyclesByPatient = groupBy(cycles, (cycle) => cycle.patientId);

  return [...byKey.values()].map((entry) => {
    const visits = visitsByPatient.get(entry.patientId) || [];
    const seen = visits.find((visit) => visit.visit_date === entry.date);
    const later = visits.find((visit) => visit.visit_date > entry.date);
    const tasks = entry.reasons.filter((reason) => reason.kind === 'extra' || reason.kind === 'cycle');
    const allDone = tasks.length > 0 && tasks.length === entry.reasons.length && tasks.every((reason) => reason.done);
    let status;
    if (seen || allDone) status = 'seen';
    else if (entry.date > today) status = 'upcoming';
    else if (entry.date === today) status = 'expected';
    else status = later ? 'late' : 'missed';

    const prepare = [];
    for (const plan of plansByPatient.get(entry.patientId) || []) prepare.push(...planPrepare(plan, entry.date));
    for (const reason of entry.reasons) {
      if ((reason.kind === 'extra' || reason.kind === 'cycle') && !reason.done) prepare.push({ label: reason.label });
    }
    const pregnancy = (plansByPatient.get(entry.patientId) || []).find((plan) => plan.type === 'pregnancy');
    const cycle = (cyclesByPatient.get(entry.patientId) || [])[0];
    const note = entry.reasons.find((reason) => reason.note)?.note || null;
    // Show what was booked; "Follow-up visit" or "Visit" only when nothing else was.
    const booked = entry.reasons.filter((reason) => reason.kind !== 'came');
    const named = booked.filter((reason) => reason.kind !== 'followup');

    return {
      cameOn: status === 'late' ? later.visit_date : null,
      cycleDay: cycle ? cycleDayOn(cycle, entry.date) : null,
      date: entry.date,
      key: entry.key,
      note,
      patientId: entry.patientId,
      pregnancy: pregnancy ? pregnancyOn(pregnancy, entry.date) : null,
      prepare: uniqueLabels(prepare),
      reasons: uniqueLabels(named.length ? named : booked.length ? booked : entry.reasons).map((reason) => reason.label),
      seenBy: seen ? { nurse: seen.nurse_name, at: seen.created_at } : null,
      status,
    };
  }).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

function uniqueLabels(list) {
  const seen = new Set();
  return list.filter((entry) => {
    const key = entry.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupBy(list, keyOf) {
  const map = new Map();
  for (const entry of list) {
    const key = keyOf(entry);
    map.set(key, [...(map.get(key) || []), entry]);
  }
  return map;
}

// Missed visits worth a call: the latest missed day per patient in the
// last `days` days, with any day she is booked for next.
export function missedRecently(appointments, today, days = 30) {
  const since = addDays(today, -days);
  const latest = new Map();
  for (const entry of appointments) {
    if (entry.status !== 'missed' || entry.date < since) continue;
    const current = latest.get(entry.patientId);
    if (!current || entry.date > current.date) latest.set(entry.patientId, entry);
  }
  return [...latest.values()]
    .map((entry) => ({
      ...entry,
      rebookedFor: appointments.find((other) => other.patientId === entry.patientId && other.date >= today && other.status !== 'seen')?.date || null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// One line per patient for the patient list.
export function patientSummary(patient, { appointments, cycles, plans, today, visits }) {
  const pregnancy = plans.find((plan) => plan.type === 'pregnancy');
  const child = plans.find((plan) => plan.type === 'child');
  const cycle = cycles[0];
  const mine = appointments.filter((entry) => entry.patientId === patient.id);
  const next = mine.find((entry) => entry.date >= today && entry.status !== 'seen');
  const missed = [...mine].reverse().find((entry) => entry.status === 'missed') || null;
  const lastVisit = [...visits].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] || null;
  return {
    child: child ? { birthDate: child.birthDate, name: child.personName } : null,
    cycle: cycle ? { day: cycleDayOn(cycle, today), title: cycle.title } : null,
    hospitalPatientId: patient.hospitalPatientId || '',
    id: patient.id,
    lastVisit: lastVisit ? { date: lastVisit.visit_date, nurse: lastVisit.nurse_name, note: lastVisit.note || null } : null,
    missed: missed ? { date: missed.date } : null,
    mobile: String(patient.mobile || '').replace(/^\+91/, ''),
    name: patient.name || pregnancy?.personName || cycle?.personName || 'Patient',
    next: next ? { date: next.date, status: next.status } : null,
    pregnancy: pregnancy ? { ...pregnancyOn(pregnancy, today), eddDate: pregnancy.eddDate } : null,
  };
}
