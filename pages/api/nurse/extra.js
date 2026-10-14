import { callCare, dateOrNull, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';

// Extra tests and scans from the case sheet: add one, or remove one added by mistake.
export default nurseRoute(['POST'], async (request, response, nurse) => {
  const body = request.body || {};

  if (body.action === 'add') {
    const view = await callCare('care_nurse_add_extra_item', {
      p_nurse_id: nurse.id,
      p_patient_id: uuidOrNull(body.patientId),
      p_label: text(body.label, 80),
      p_due_date: dateOrNull(body.dueDate),
      p_done: body.done === true,
      p_plan_id: uuidOrNull(body.planId),
    });
    return response.status(200).json(view);
  }

  if (body.action === 'remove') {
    const view = await callCare('care_nurse_remove_extra_item', {
      p_nurse_id: nurse.id,
      p_item_id: uuidOrNull(body.itemId),
    });
    return response.status(200).json(view);
  }

  return response.status(400).json({ error: 'Unknown action.' });
});
