import { callCare, dateOrNull, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';

const STATUSES = new Set(['done', 'not_needed', 'clear']);

// "Save visit": ticks, extra-test ticks, dates set on the timeline,
// the next visit date and the note.
export default nurseRoute(['POST'], async (request, response, nurse) => {
  const body = request.body || {};
  const patientId = uuidOrNull(body.patientId);
  if (!patientId) return response.status(400).json({ error: 'Patient not found.' });

  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  const cleanItems = items
    .map((item) => ({ planId: uuidOrNull(item?.planId), itemId: uuidOrNull(item?.itemId), status: item?.status }))
    .filter((item) => item.planId && item.itemId && STATUSES.has(item.status));
  const extras = Array.isArray(body.extraItems) ? body.extraItems.slice(0, 100) : [];
  const cleanExtras = extras
    .map((item) => ({ id: uuidOrNull(item?.id), status: item?.status }))
    .filter((item) => item.id && STATUSES.has(item.status));
  const visitDates = (Array.isArray(body.visitDates) ? body.visitDates.slice(0, 60) : [])
    .map((entry) => ({ planId: uuidOrNull(entry?.planId), visitId: uuidOrNull(entry?.visitId), date: dateOrNull(entry?.date) }));
  const extraDates = (Array.isArray(body.extraDates) ? body.extraDates.slice(0, 40) : [])
    .map((entry) => ({ id: uuidOrNull(entry?.id), date: dateOrNull(entry?.date) }));
  if (
    cleanItems.length !== items.length ||
    cleanExtras.length !== extras.length ||
    visitDates.some((entry) => !entry.planId || !entry.visitId) ||
    extraDates.some((entry) => !entry.id || !entry.date)
  ) {
    return response.status(400).json({ error: 'The checklist could not be read. Refresh the page and try again.' });
  }

  if (visitDates.length || extraDates.length) {
    await callCare('care_nurse_set_dates', { p_nurse_id: nurse.id, p_patient_id: patientId, p_visits: visitDates, p_extras: extraDates });
  }
  if (cleanExtras.length) {
    await callCare('care_nurse_set_extra_items', { p_nurse_id: nurse.id, p_patient_id: patientId, p_items: cleanExtras });
  }

  const view = await callCare('care_nurse_save_visit', {
    p_nurse_id: nurse.id,
    p_patient_id: patientId,
    p_items: cleanItems,
    p_next_date: dateOrNull(body.nextDate),
    p_note: text(body.note, 300),
    p_care_doctor_id: uuidOrNull(body.careDoctorId),
    p_doctor_name: text(body.doctorName, 80),
    p_plan_id: uuidOrNull(body.planId),
  });

  // Extra tests and dates change only when touched; then send them too.
  if (cleanExtras.length || visitDates.length || extraDates.length) {
    return response.status(200).json(await callCare('care_nurse_patient_v2', { p_nurse_id: nurse.id, p_patient_id: patientId }));
  }
  return response.status(200).json(view);
});
