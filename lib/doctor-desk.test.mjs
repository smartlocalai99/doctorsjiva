import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppointments, cleanDoctorName, cycleView, matchCareDoctor, missedRecently, planPrepare, planView } from './doctor-desk.js';

const today = '2026-10-24';
const followup = (id, visitDate, nextDate, createdAt = `${visitDate}T10:00:00+05:30`) => ({
  care_doctor_id: 'd1', created_at: createdAt, id, next_date: nextDate, note: null, nurse_name: 'Anitha', patient_id: 'p1', plan_id: null, visit_date: visitDate,
});
const appointments = (followups, extra = {}) => buildAppointments({ cycles: [], extras: [], followups, plans: [], today, ...extra });
const on = (list, date) => list.find((entry) => entry.date === date);

test('a next visit date today is expected until the nurse saves a visit', () => {
  assert.equal(on(appointments([followup('a', '2026-10-10', today)]), today).status, 'expected');
  const seen = appointments([followup('a', '2026-10-10', today), followup('b', today, '2026-11-07')]);
  assert.equal(seen.find((entry) => entry.date === today).status, 'seen');
  assert.equal(seen.find((entry) => entry.date === '2026-11-07').status, 'upcoming');
});

test('a past next visit date with no visit is missed, and late once she comes', () => {
  assert.equal(on(appointments([followup('a', '2026-10-01', '2026-10-20')]), '2026-10-20').status, 'missed');
  const late = appointments([followup('a', '2026-10-01', '2026-10-20'), followup('b', '2026-10-22', '2026-11-05')]);
  const missedDay = late.find((entry) => entry.date === '2026-10-20');
  assert.equal(missedDay.status, 'late');
  assert.equal(missedDay.cameOn, '2026-10-22');
});

test('coming early replaces the old next visit date', () => {
  const list = appointments([followup('a', '2026-10-01', '2026-10-30'), followup('b', '2026-10-20', '2026-11-10')]);
  assert.deepEqual(list.map((entry) => entry.date), ['2026-10-01', '2026-10-20', '2026-11-10']);
});

test('a visit on a day nothing was booked still shows as seen', () => {
  const list = appointments([followup('a', '2026-10-10', '2026-11-04'), followup('b', today, '2026-12-25')]);
  const walkIn = on(list, today);
  assert.equal(walkIn.status, 'seen');
  assert.deepEqual(walkIn.reasons, ['Visit']);
  assert.equal(walkIn.seenBy.nurse, 'Anitha');
  assert.equal(on(list, '2026-11-04'), undefined);
});

test('a booked day that was kept shows what was booked, not "Visit"', () => {
  const list = appointments([followup('a', '2026-10-01', '2026-10-20'), followup('b', '2026-10-20', '2026-11-05')]);
  assert.deepEqual(on(list, '2026-10-20').reasons, ['Follow-up visit']);
});

test('missed list keeps the latest missed day per patient and any new booking', () => {
  const list = appointments([followup('a', '2026-10-01', '2026-10-20')], {
    extras: [{ due_date: '2026-10-28', label: 'Thyroid profile', patient_id: 'p1', status: null }],
  });
  const [missed] = missedRecently(list, today);
  assert.equal(missed.date, '2026-10-20');
  assert.equal(missed.rebookedFor, '2026-10-28');
});

test('done tests count as seen even without a saved visit', () => {
  const list = appointments([], { extras: [{ due_date: '2026-10-20', label: 'CBP', patient_id: 'p1', status: 'done' }] });
  assert.equal(list[0].status, 'seen');
});

const schedule = {
  items: [
    { id: 'nt', is_active: true, label_en: 'NT scan', sort_order: 1, visit_id: 'w12' },
    { id: 'td2', is_active: true, label_en: 'TD vaccine – 2nd dose', sort_order: 2, visit_id: 'w12' },
    { id: 'tiffa', is_active: true, label_en: 'TIFFA scan', sort_order: 1, visit_id: 'w20' },
  ],
  visits: [
    { due_from: 11, due_to: 13, due_unit: 'week', hospital_id: 'h1', id: 'w12', plan_type: 'pregnancy', sort_order: 1, title_en: 'NT scan' },
    { due_from: 20, due_to: 23, due_unit: 'week', hospital_id: 'h1', id: 'w20', plan_type: 'pregnancy', sort_order: 2, title_en: 'TIFFA scan' },
    { due_from: 20, due_to: 23, due_unit: 'week', hospital_id: null, id: 'std', plan_type: 'pregnancy', sort_order: 1, title_en: 'Standard' },
  ],
};
// 12 weeks pregnant today: start date 84 days ago.
const plan = { care_doctor_id: 'd1', edd_date: '2027-04-04', hospital_id: 'h1', id: 'plan1', patient_id: 'p1', plan_type: 'pregnancy', status: 'active' };

test('plan view uses the hospital schedule and the 11-13 week window', () => {
  const view = planView(plan, schedule, [{ item_id: 'nt', plan_id: 'plan1', status: 'done', done_on: today }], []);
  assert.deepEqual(view.visits.map((visit) => visit.id), ['w12', 'w20']);
  assert.equal(view.startDate, '2026-06-28');
  assert.equal(view.visits[0].fromDate, '2026-09-13');
  assert.equal(view.visits[0].toDate, '2026-10-03');
  assert.deepEqual(planPrepare(view, '2026-09-20').map((item) => item.label), ['TD vaccine – 2nd dose']);
  assert.deepEqual(planPrepare(view, '2026-10-24'), [{ label: 'TD vaccine – 2nd dose', overdue: true }]);
});

test('IUI step follows the trigger date the nurse moved', () => {
  const steps = [
    { code: 'trigger', day: 13, id: 's1', label_en: 'Trigger injection', protocol_code: 'oi', sort_order: 1 },
    { code: 'iui', day: 14, id: 's2', label_en: 'IUI', linked_offset_days: 1, linked_step_code: 'trigger', protocol_code: 'oi', sort_order: 2 },
  ];
  const cycle = { anchor_date: '2026-10-01', id: 'c1', patient_id: 'p1', protocol_code: 'oi' };
  const view = cycleView(cycle, steps, [{ cycle_id: 'c1', planned_date: '2026-10-15', step_id: 's1' }]);
  assert.deepEqual(view.steps.map((step) => step.date), ['2026-10-15', '2026-10-16']);
});

test('doctor names match the nurse desk doctor by alias', () => {
  assert.equal(cleanDoctorName('DR.MOUNIKA  REDDY MS OBG'), 'mounika reddy');
  const doctors = [{ display_name: 'Dr. Mounika', id: 'd1' }, { display_name: 'Dr. Sudarshan Reddy', id: 'd2' }];
  assert.equal(matchCareDoctor(doctors, [{ alias: 'Mounika Reddy', doctor_id: 'd1' }], 'Dr. Mounika')?.id, 'd1');
  assert.equal(matchCareDoctor(doctors, [], 'Dr. Ritish Reddy'), null);
});
