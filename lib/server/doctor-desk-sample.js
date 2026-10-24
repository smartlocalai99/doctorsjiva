import { addDays } from '@/lib/nurse-schedule';

// Local preview only: used when Supabase is not configured (like the test
// doctor in lib/test-doctor.js). Dhruva's pregnancy schedule and a few
// patients placed around today, so every desk state shows up.
const HOSPITAL = { id: 'h-dhruva', name: 'Dhruva Hospitals' };
const DOCTOR = { department: 'gynecology', display_name: 'Dr. Mounika', id: 'd-mounika' };

const VISITS = [
  ['w06', 'First tests', 6, 7, [['Blood sugar test'], ['CBC blood test'], ['TD vaccine – 1st dose']]],
  ['w08', 'Dating scan', 8, 10, [['Dating scan']]],
  ['w12', 'NT scan', 11, 13, [['NT scan'], ['Double marker test'], ['TD vaccine – 2nd dose']]],
  ['w14', 'Week 14 check-up', 14, 19, [['Doctor check-up']]],
  ['w20', 'TIFFA scan', 20, 23, [['TIFFA scan (baby’s organs and growth)']]],
  ['w24', 'Sugar test (OGTT)', 24, 27, [['OGTT sugar test']]],
  ['w28', 'Week 28 check-up', 28, 31, [['Doctor check-up'], ['ICT test (only if her blood group is negative)', true]]],
  ['w32', 'Growth scan', 32, 33, [['CBP blood test'], ['Hemoglobin test'], ['Growth scan and Doppler']]],
  ['w34', 'Week 34 check-up', 34, 35, [['Basic checks (BP, weight)']]],
  ['w36', 'Week 36 check-up', 36, 36, [['CBP blood test'], ['Basic checks (BP, weight)']]],
  ['w37', 'Week 37 check-up', 37, 37, [['Weekly doctor check-up']]],
  ['w38', 'Week 38 check-up', 38, 38, [['Weekly doctor check-up']]],
  ['w39', 'Week 39 check-up', 39, 39, [['Weekly doctor check-up']]],
  ['w40', 'Week 40 check-up', 40, 40, [['Weekly doctor check-up']]],
];

const STEPS = [
  ['oi_baseline_scan', 2, 'Baseline scan', 'wife'],
  ['oi_blood_test', 2, 'Blood test', 'wife'],
  ['oi_semen_analysis', 2, 'Semen analysis', 'husband'],
  ['oi_injection_d5', 5, 'Injection', 'wife'],
  ['oi_injection_d7', 7, 'Injection', 'wife'],
  ['oi_follicle_d9', 9, 'Follicle scan', 'wife'],
  ['oi_follicle_d11', 11, 'Follicle scan', 'wife'],
  ['oi_trigger', 13, 'Trigger injection', 'wife'],
  ['oi_iui', 14, 'IUI / Timed intercourse', 'couple', 'oi_trigger', 1],
  ['oi_urine_pregnancy_test', 31, 'Urine pregnancy test', 'wife'],
];

function schedule() {
  const visits = [];
  const items = [];
  VISITS.forEach(([code, title, from, to, list], index) => {
    visits.push({ due_from: from, due_to: to, due_unit: 'week', hospital_id: HOSPITAL.id, id: `v-${code}`, is_active: true, plan_type: 'pregnancy', sort_order: index, title_en: title });
    list.forEach(([label, conditional], position) => items.push({
      id: `i-${code}-${position}`, is_active: true, is_conditional: Boolean(conditional), label_en: label, sort_order: position, visit_id: `v-${code}`,
    }));
  });
  return { items, visits };
}

export function sampleDeskRows(today) {
  const at = (date, time) => `${date}T${time}:00+05:30`;
  // Due date so that she is `weeks` pregnant today.
  const edd = (weeks, days = 3) => addDays(today, 280 - weeks * 7 - days);
  const people = [
    { id: 'p1', name: 'Lakshmi Prasanna', mobile: '+919849012345', hid: 'DH-2291', weeks: 24, visits: [[-14, 0]] },
    { id: 'p2', name: 'Sravani Kurapati', mobile: '+919701122334', hid: 'DH-2307', weeks: 12, visits: [[-28, 0], [0, 28, '10:42', 'NT scan done, report normal. Double marker sent.']], ticks: ['i-w12-0'] },
    { id: 'p3', name: 'Haritha Reddy', mobile: '+919000456789', hid: 'DH-2154', weeks: 21, visits: [[-30, -2, '11:05', 'Bring previous scan reports.']] },
    { id: 'p5', name: 'Swathi Yadav', mobile: '+919441267890', hid: 'DH-1988', weeks: 32, visits: [[-21, 3]] },
    { id: 'p6', name: 'Madhavi Latha', mobile: '+918886543210', hid: 'DH-1870', weeks: 36, visits: [[-12, -5], [-3, 4, '12:10', 'Came 2 days late. BP 130/84, recheck next visit.']] },
    { id: 'p7', name: 'Anusha Gaddam', mobile: '+919603344556', hid: 'DH-2340', weeks: 8, visits: [[-14, 0, '09:30', 'First visit. Folic acid started.']] },
    { id: 'p9', name: 'Keerthi Bandi', mobile: '+919392211445', hid: 'DH-2010', weeks: 28, visits: [[-30, -9]], booked: ['v-w28', 2] },
    { id: 'p10', name: 'Pavani Chowdary', mobile: '+919010987654', hid: 'DH-1765', weeks: 38, visits: [[-7, 0], [0, 7, '11:20', 'Weekly check, all well.']] },
    { id: 'p11', name: 'Ramya Sri', mobile: '+917702233445', hid: 'DH-2402', weeks: 16, visits: [[-10, 6]] },
    { id: 'p12', name: 'Jyothi Naidu', mobile: '+919848811223', hid: 'DH-2235', weeks: 30, visits: [[-20, 11]] },
    { id: 'p13', name: 'Sowmya Kumari', mobile: '+918019922110', hid: 'DH-2101', weeks: 18, visits: [[-25, -11]] },
  ];

  const plans = [];
  const followups = [];
  const planItems = [];
  const visitDates = [];
  for (const person of people) {
    plans.push({
      birth_date: null, care_doctor_id: DOCTOR.id, child_gender: null, created_at: at(addDays(today, -60), '10:00'),
      edd_date: edd(person.weeks), hospital_id: HOSPITAL.id, id: `plan-${person.id}`, lmp_date: null,
      patient_id: person.id, person_name: person.name, plan_type: 'pregnancy', status: 'active',
    });
    person.visits.forEach(([visitDay, nextDay, time = '10:15', note = null], index) => {
      const visitDate = addDays(today, visitDay);
      followups.push({
        care_doctor_id: DOCTOR.id, created_at: at(visitDate, time), id: `f-${person.id}-${index}`, next_date: addDays(today, nextDay),
        note, nurse_name: 'Anitha', patient_id: person.id, plan_id: `plan-${person.id}`, visit_date: visitDate,
      });
    });
    for (const item of person.ticks || []) planItems.push({ done_on: today, item_id: item, plan_id: `plan-${person.id}`, status: 'done' });
    if (person.booked) visitDates.push({ plan_id: `plan-${person.id}`, planned_date: addDays(today, person.booked[1]), visit_id: person.booked[0] });
  }
  // Early pregnancies: the first tests are done.
  for (const id of ['p1', 'p3', 'p5', 'p6', 'p9', 'p10', 'p11', 'p12', 'p13']) {
    for (const code of ['w06-0', 'w06-1', 'w06-2', 'w08-0', 'w12-0', 'w12-1', 'w12-2', 'w14-0']) planItems.push({ done_on: addDays(today, -90), item_id: `i-${code}`, plan_id: `plan-${id}`, status: 'done' });
  }
  for (const id of ['p5', 'p6', 'p9', 'p10', 'p12']) {
    for (const code of ['w20-0', 'w24-0']) planItems.push({ done_on: addDays(today, -40), item_id: `i-${code}`, plan_id: `plan-${id}`, status: 'done' });
  }
  for (const id of ['p6', 'p10']) {
    for (const code of ['w28-0', 'w32-0', 'w32-1', 'w32-2', 'w34-0']) planItems.push({ done_on: addDays(today, -14), item_id: `i-${code}`, plan_id: `plan-${id}`, status: 'done' });
  }
  planItems.push({ done_on: addDays(today, -7), item_id: 'i-w36-0', plan_id: 'plan-p10', status: 'done' }, { done_on: addDays(today, -7), item_id: 'i-w36-1', plan_id: 'plan-p10', status: 'done' }, { done_on: addDays(today, -7), item_id: 'i-w37-0', plan_id: 'plan-p10', status: 'done' });

  const cycleAnchor = addDays(today, -10);
  followups.push({ care_doctor_id: DOCTOR.id, created_at: at(addDays(cycleAnchor, 1), '10:00'), id: 'f-p4-0', next_date: addDays(cycleAnchor, 8), note: 'Baseline scan normal.', nurse_name: 'Anitha', patient_id: 'p4', plan_id: null, visit_date: addDays(cycleAnchor, 1) });
  followups.push({ care_doctor_id: DOCTOR.id, created_at: at(addDays(cycleAnchor, 8), '10:20'), id: 'f-p4-1', next_date: null, note: 'Follicle 14 mm.', nurse_name: 'Anitha', patient_id: 'p4', plan_id: null, visit_date: addDays(cycleAnchor, 8) });

  return {
    careDoctor: DOCTOR,
    cycles: [{ anchor_date: cycleAnchor, care_doctor_id: DOCTOR.id, created_at: at(cycleAnchor, '09:00'), id: 'c-p4', partner_name: 'Ravi Teja', patient_id: 'p4', person_name: 'Bhavana Teja', protocol_code: 'oi_ti_iui', status: 'active' }],
    extras: [{ done_on: null, due_date: addDays(today, 1), id: 'x-p8', label: 'Thyroid profile (TSH)', patient_id: 'p8', plan_id: null, status: null }],
    followups: [
      ...followups,
      { care_doctor_id: DOCTOR.id, created_at: at(addDays(today, -6), '10:00'), id: 'f-p8-0', next_date: addDays(today, 1), note: 'PCOS review with thyroid report.', nurse_name: 'Anitha', patient_id: 'p8', plan_id: null, visit_date: addDays(today, -6) },
    ],
    hospital: HOSPITAL,
    hospitalIds: [...people.map((person) => ({ hospital_patient_id: person.hid, patient_id: person.id })), { hospital_patient_id: 'DH-2377', patient_id: 'p4' }, { hospital_patient_id: 'DH-2399', patient_id: 'p8' }],
    name: DOCTOR.display_name,
    patients: [
      ...people.map((person) => ({ id: person.id, mobile: person.mobile, name: person.name })),
      { id: 'p4', mobile: '+919550011223', name: 'Bhavana Teja' },
      { id: 'p8', mobile: '+919866700112', name: 'Divya Sree' },
    ],
    planItems,
    plans,
    protocols: [{ code: 'oi_ti_iui', title_en: 'OI-TI / IUI' }],
    schedule: schedule(),
    stepRecords: [
      { cycle_id: 'c-p4', done_on: addDays(cycleAnchor, 1), planned_date: null, status: 'done', step_id: 's-oi_baseline_scan' },
      { cycle_id: 'c-p4', done_on: addDays(cycleAnchor, 1), planned_date: null, status: 'done', step_id: 's-oi_blood_test' },
      { cycle_id: 'c-p4', done_on: addDays(cycleAnchor, 1), planned_date: null, status: 'done', step_id: 's-oi_semen_analysis' },
      { cycle_id: 'c-p4', done_on: addDays(cycleAnchor, 4), planned_date: null, status: 'done', step_id: 's-oi_injection_d5' },
      { cycle_id: 'c-p4', done_on: addDays(cycleAnchor, 6), planned_date: null, status: 'done', step_id: 's-oi_injection_d7' },
      { cycle_id: 'c-p4', done_on: addDays(cycleAnchor, 8), planned_date: null, status: 'done', step_id: 's-oi_follicle_d9' },
    ],
    steps: STEPS.map(([code, day, label, who, linked = null, offset = null], index) => ({
      code, day, id: `s-${code}`, is_active: true, label_en: label, linked_offset_days: offset, linked_step_code: linked, protocol_code: 'oi_ti_iui', sort_order: index, who,
    })),
    visitDates,
  };
}
