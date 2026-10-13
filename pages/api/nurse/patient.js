import { callCare, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';

export default nurseRoute(['GET', 'POST'], async (request, response, nurse) => {
  if (request.method === 'GET') {
    const id = uuidOrNull(request.query.id);
    if (!id) return response.status(400).json({ error: 'Patient not found.' });
    const view = await callCare('care_nurse_patient', { p_nurse_id: nurse.id, p_patient_id: id });
    return response.status(200).json(view);
  }

  // "Add patient": mobile + name (+ optional hospital ID).
  const view = await callCare('care_nurse_add_patient', {
    p_nurse_id: nurse.id,
    p_mobile: text(request.body?.mobile, 20),
    p_name: text(request.body?.name, 80),
    p_hospital_patient_id: text(request.body?.hospitalPatientId, 40),
  });
  return response.status(201).json(view);
});
