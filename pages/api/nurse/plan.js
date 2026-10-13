import { callCare, dateOrNull, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';

// Start / correct / close care plans.
export default nurseRoute(['POST'], async (request, response, nurse) => {
  const body = request.body || {};
  const base = { p_nurse_id: nurse.id };

  if (body.action === 'start_pregnancy') {
    const view = await callCare('care_nurse_start_pregnancy', {
      ...base,
      p_patient_id: uuidOrNull(body.patientId),
      p_mother_name: text(body.motherName, 80),
      p_lmp: dateOrNull(body.lmp),
      p_edd: dateOrNull(body.edd),
      p_care_doctor_id: uuidOrNull(body.careDoctorId),
      p_doctor_name: text(body.doctorName, 80),
    });
    return response.status(200).json(view);
  }

  if (body.action === 'update_pregnancy') {
    const view = await callCare('care_nurse_update_pregnancy', {
      ...base,
      p_plan_id: uuidOrNull(body.planId),
      p_mother_name: text(body.motherName, 80),
      p_edd: dateOrNull(body.edd),
    });
    return response.status(200).json(view);
  }

  if (body.action === 'add_child') {
    const gender = body.gender === 'female' || body.gender === 'male' ? body.gender : null;
    const view = await callCare('care_nurse_add_child', {
      ...base,
      p_patient_id: uuidOrNull(body.patientId),
      p_child_name: text(body.childName, 80),
      p_birth_date: dateOrNull(body.birthDate),
      p_gender: gender,
      p_care_doctor_id: uuidOrNull(body.careDoctorId),
      p_doctor_name: text(body.doctorName, 80),
    });
    return response.status(200).json(view);
  }

  if (body.action === 'close') {
    const view = await callCare('care_nurse_close_plan', {
      ...base,
      p_plan_id: uuidOrNull(body.planId),
      p_outcome: body.outcome === 'delivered' ? 'delivered' : 'ended',
      p_date: dateOrNull(body.date),
    });
    return response.status(200).json(view);
  }

  return response.status(400).json({ error: 'Unknown action.' });
});
