import { callCare, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';

export default nurseRoute(['POST'], async (request, response, nurse) => {
  const patientId = uuidOrNull(request.body?.patientId);
  if (!patientId) return response.status(400).json({ error: 'Patient not found.' });
  const view = await callCare('care_nurse_set_hospital_id', {
    p_nurse_id: nurse.id,
    p_patient_id: patientId,
    p_hospital_patient_id: text(request.body?.hospitalPatientId, 40),
  });
  return response.status(200).json(view);
});
