import { callCare, nurseRoute, uuidOrNull } from '@/lib/server/nurse-api';
import { forgetDirectory } from '@/lib/server/nurse-directory';

// Takes a patient off this hospital's list and stops this hospital's care
// plans for them. Nothing is deleted: adding the mobile number again
// brings the patient back.
export default nurseRoute(['POST'], async (request, response, nurse) => {
  const patientId = uuidOrNull(request.body?.patientId);
  if (!patientId) return response.status(400).json({ error: 'Patient not found.' });
  const result = await callCare('care_nurse_remove_patient', { p_nurse_id: nurse.id, p_patient_id: patientId });
  forgetDirectory(nurse.hospitalId);
  return response.status(200).json(result);
});
