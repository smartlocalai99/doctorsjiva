import {
  buildAppointments,
  cycleView,
  indiaToday,
  matchCareDoctor,
  missedRecently,
  patientSummary,
  planView,
} from '@/lib/doctor-desk';
import { addDays } from '@/lib/nurse-schedule';
import { sampleDeskRows } from './doctor-desk-sample';
import { getSupabaseAdmin } from './supabase-admin';

// Reads what the nurses recorded for one doctor's patients (care_* tables,
// shared with the nurse desk and the patient app) with the server key.
// Kept in this server's memory for 15 seconds so moving between Today,
// Calendar and a patient costs one load, while a nurse's save still shows
// up within the doctor app's 20-second refresh.
const TTL_MS = 15 * 1000;
const PAGE = 1000;
const CHUNK = 150;
const cache = new Map();

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

async function rows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function one(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || null;
}

// Supabase returns at most 1000 rows per request.
async function allRows(makeQuery) {
  const result = [];
  for (let from = 0; ; from += PAGE) {
    const page = await rows(makeQuery().range(from, from + PAGE - 1));
    result.push(...page);
    if (page.length < PAGE) return result;
  }
}

async function inChunks(ids, makeQuery) {
  const result = [];
  for (let index = 0; index < ids.length; index += CHUNK) {
    result.push(...await allRows(() => makeQuery(ids.slice(index, index + CHUNK))));
  }
  return result;
}

function hospitalKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z]+/g, ' ').replace(/\bhospitals?\b/g, ' ').trim().split(/\s+/)[0] || '';
}

// Signed-in doctor -> hospital and nurse-desk doctor (care_doctors).
async function resolveDoctor(db, sessionDoctor) {
  const doctor = await one(db.from('doctors').select('display_name, hospital_name, hospital_id').eq('phone_number', sessionDoctor.phone_number).maybeSingle());
  const name = doctor?.display_name || sessionDoctor.display_name;
  let hospital = null;
  if (doctor?.hospital_id) {
    hospital = await one(db.from('hospitals').select('id, name').eq('id', doctor.hospital_id).maybeSingle());
  }
  if (!hospital) {
    const key = hospitalKey(doctor?.hospital_name || sessionDoctor.hospital_name);
    const hospitals = key ? await rows(db.from('hospitals').select('id, name')) : [];
    hospital = hospitals.find((entry) => hospitalKey(entry.name) === key) || null;
  }
  if (!hospital) return { careDoctor: null, hospital: null, name };

  const careDoctors = await rows(db.from('care_doctors').select('id, display_name, department').eq('hospital_id', hospital.id).eq('is_active', true));
  const aliases = careDoctors.length
    ? await rows(db.from('care_doctor_aliases').select('doctor_id, alias').in('doctor_id', careDoctors.map((entry) => entry.id)))
    : [];
  return { careDoctor: matchCareDoctor(careDoctors, aliases, name), hospital, name };
}

async function loadRows(sessionDoctor, today) {
  if (!configured()) return sampleDeskRows(today);
  const db = getSupabaseAdmin();
  const who = await resolveDoctor(db, sessionDoctor);
  if (!who.careDoctor) return { ...who, empty: true };
  const hospitalId = who.hospital.id;
  const doctorId = who.careDoctor.id;

  const [plans, cycles, followups, hidden, schedule, steps, protocols] = await Promise.all([
    allRows(() => db.from('care_plans')
      .select('id, patient_id, plan_type, status, person_name, lmp_date, edd_date, birth_date, child_gender, hospital_id, care_doctor_id, created_at')
      .eq('hospital_id', hospitalId).eq('care_doctor_id', doctorId).eq('status', 'active').order('created_at')),
    allRows(() => db.from('care_cycles')
      .select('id, patient_id, protocol_code, person_name, partner_name, anchor_date, care_doctor_id, status, created_at')
      .eq('hospital_id', hospitalId).eq('care_doctor_id', doctorId).eq('status', 'active').order('created_at')),
    allRows(() => db.from('care_followups')
      .select('id, patient_id, plan_id, care_doctor_id, nurse_name, visit_date, next_date, note, created_at')
      .eq('hospital_id', hospitalId).gte('visit_date', addDays(today, -400)).order('created_at')),
    allRows(() => db.from('care_hospital_hidden_patients').select('patient_id').eq('hospital_id', hospitalId).order('patient_id')),
    Promise.all([
      allRows(() => db.from('care_schedule_visits').select('id, plan_type, hospital_id, title_en, due_unit, due_from, due_to, sort_order, is_active').order('id')),
      allRows(() => db.from('care_schedule_items').select('id, visit_id, label_en, is_conditional, is_optional, only_for_gender, due_unit, due_from, due_to, due_plus_days, sort_order, is_active').order('id')),
    ]).then(([visits, items]) => ({ items, visits })),
    allRows(() => db.from('care_cycle_protocol_steps').select('id, protocol_code, code, day, label_en, who, linked_step_code, linked_offset_days, sort_order, is_active').order('id')),
    allRows(() => db.from('care_cycle_protocols').select('code, title_en').order('code')),
  ]);

  const planIds = plans.map((plan) => plan.id);
  const [planItems, visitDates, stepRecords] = await Promise.all([
    inChunks(planIds, (ids) => db.from('care_plan_items').select('plan_id, item_id, status, done_on').in('plan_id', ids).order('plan_id')),
    inChunks(planIds, (ids) => db.from('care_plan_visit_dates').select('plan_id, visit_id, planned_date').in('plan_id', ids).order('plan_id')),
    inChunks(cycles.map((cycle) => cycle.id), (ids) => db.from('care_cycle_step_records').select('cycle_id, step_id, planned_date, status, done_on').in('cycle_id', ids).order('cycle_id')),
  ]);

  const hiddenIds = new Set(hidden.map((row) => row.patient_id));
  const planIdSet = new Set(planIds);
  const patientIds = [...new Set([
    ...plans.map((plan) => plan.patient_id),
    ...cycles.map((cycle) => cycle.patient_id),
    ...followups.filter((row) => row.care_doctor_id === doctorId || planIdSet.has(row.plan_id)).map((row) => row.patient_id),
  ])].filter((id) => !hiddenIds.has(id));

  const [patients, hospitalIds, extras] = await Promise.all([
    inChunks(patientIds, (ids) => db.from('patients').select('id, name, mobile').in('id', ids).order('id')),
    inChunks(patientIds, (ids) => db.from('care_hospital_patients').select('patient_id, hospital_patient_id').eq('hospital_id', hospitalId).in('patient_id', ids).order('patient_id')),
    inChunks(patientIds, (ids) => db.from('care_extra_items').select('id, patient_id, plan_id, label, due_date, status, done_on').eq('hospital_id', hospitalId).in('patient_id', ids).order('id')),
  ]);

  return {
    ...who,
    cycles,
    extras,
    followups,
    hospitalIds,
    patients,
    planItems,
    plans,
    protocols,
    schedule,
    stepRecords,
    steps,
    visitDates,
  };
}

// Raw rows -> plans with windows, cycles with step dates, appointments.
function compute(raw, today) {
  const doctor = {
    department: raw.careDoctor?.department || null,
    hospitalName: raw.hospital?.name || '',
    linked: Boolean(raw.careDoctor),
    name: raw.name,
  };
  if (raw.empty || !raw.careDoctor) return { appointments: [], doctor, missed: [], patients: [], today, views: new Map() };

  const doctorId = raw.careDoctor.id;
  const plans = raw.plans.map((plan) => planView(plan, raw.schedule, raw.planItems, raw.visitDates));
  const titles = new Map(raw.protocols.map((protocol) => [protocol.code, protocol.title_en]));
  const cycles = raw.cycles.map((cycle) => cycleView(cycle, raw.steps, raw.stepRecords, titles.get(cycle.protocol_code)));
  const planIds = new Set(plans.map((plan) => plan.id));
  const ids = new Set(raw.patients.map((patient) => patient.id));
  // Visits with this doctor (or not tied to any doctor) count as "came".
  const visits = raw.followups.filter((row) => ids.has(row.patient_id)
    && (row.care_doctor_id === doctorId || planIds.has(row.plan_id) || (!row.care_doctor_id && !row.plan_id)));
  const extras = raw.extras.filter((row) => !row.plan_id || planIds.has(row.plan_id));
  const appointments = buildAppointments({ cycles, extras, followups: visits, plans, today });
  const hospitalIds = new Map(raw.hospitalIds.map((row) => [row.patient_id, row.hospital_patient_id]));

  const views = new Map();
  const patients = raw.patients.map((row) => {
    const patient = { ...row, hospitalPatientId: hospitalIds.get(row.id) || '' };
    const mine = {
      appointments: appointments.filter((entry) => entry.patientId === row.id),
      cycles: cycles.filter((cycle) => cycle.patientId === row.id),
      extras: extras.filter((item) => item.patient_id === row.id),
      plans: plans.filter((plan) => plan.patientId === row.id),
      visits: visits.filter((visit) => visit.patient_id === row.id),
    };
    const summary = patientSummary(patient, { ...mine, today });
    views.set(row.id, { ...mine, summary });
    return summary;
  });

  return { appointments, doctor, missed: missedRecently(appointments, today), patients, today, views };
}

async function load(sessionDoctor, fresh = false) {
  const today = indiaToday();
  const key = `${sessionDoctor.phone_number}:${today}`;
  const hit = cache.get(key);
  if (hit && !fresh && Date.now() - hit.at < TTL_MS) return hit.desk;
  const desk = compute(await loadRows(sessionDoctor, today), today);
  cache.set(key, { at: Date.now(), desk });
  return desk;
}

// Today, the calendar and the patient list: appointments from four months
// back to a year ahead.
export async function getDoctorDesk(sessionDoctor, { fresh = false } = {}) {
  const desk = await load(sessionDoctor, fresh);
  const from = addDays(desk.today, -120);
  return {
    appointments: desk.appointments.filter((entry) => entry.date >= from),
    doctor: desk.doctor,
    missed: desk.missed,
    patients: desk.patients,
    today: desk.today,
  };
}

// One patient's full picture; null when she is not this doctor's patient.
export async function getDoctorPatient(sessionDoctor, patientId) {
  const desk = await load(sessionDoctor);
  const view = desk.views.get(patientId);
  if (!view) return null;
  return {
    appointments: view.appointments,
    cycles: view.cycles,
    doctor: desk.doctor,
    extras: view.extras.map((item) => ({ date: item.due_date, doneOn: item.done_on, id: item.id, label: item.label, status: item.status })),
    patient: view.summary,
    plans: view.plans,
    today: desk.today,
    visits: [...view.visits]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((visit) => ({ at: visit.created_at, date: visit.visit_date, id: visit.id, nextDate: visit.next_date, note: visit.note, nurse: visit.nurse_name })),
  };
}
