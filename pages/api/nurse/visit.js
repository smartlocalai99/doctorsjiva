import { callCare, dateOrNull, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';

const STATUSES = new Set(['done', 'not_needed', 'clear']);

// "Save": checklist ticks + next follow-up date + note, in one go.
export default nurseRoute(['POST'], async (request, response, nurse) => {
  const body = request.body || {};
  const patientId = uuidOrNull(body.patientId);
  if (!patientId) return response.status(400).json({ error: 'Patient not found.' });

  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  const cleanItems = items
    .map((item) => ({ planId: uuidOrNull(item?.planId), itemId: uuidOrNull(item?.itemId), status: item?.status }))
    .filter((item) => item.planId && item.itemId && STATUSES.has(item.status));
  if (cleanItems.length !== items.length) {
    return response.status(400).json({ error: 'The checklist could not be read. Refresh the page and try again.' });
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
  return response.status(200).json(view);
});
