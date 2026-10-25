import { notifyPlanStarted, requestOrigin } from '@/lib/server/doctor-push';
import { callCare, dateOrNull, nurseRoute, text, uuidOrNull } from '@/lib/server/nurse-api';
import { forgetDirectory } from '@/lib/server/nurse-directory';

// Tells the plan's doctor about a new pregnancy, cycle or baby.
function notifyDoctor(request, nurse, body, view) {
  const patientId = view?.patient?.id || uuidOrNull(body.patientId);
  if (!patientId) return undefined;
  return notifyPlanStarted({
    action: body.action,
    careDoctorId: uuidOrNull(body.careDoctorId),
    hospitalId: nurse.hospitalId,
    nurseName: nurse.name,
    origin: requestOrigin(request),
    patientId,
  });
}

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
    await notifyDoctor(request, nurse, body, view);
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
    await notifyDoctor(request, nurse, body, view);
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

  // OI-TI / IUI cycles.
  if (body.action === 'start_cycle') {
    const view = await callCare('care_nurse_start_cycle', {
      ...base,
      p_patient_id: uuidOrNull(body.patientId),
      p_protocol: 'oi_ti_iui',
      p_person_name: text(body.personName, 80),
      p_partner_name: text(body.partnerName, 80),
      p_anchor: dateOrNull(body.anchor),
      p_care_doctor_id: uuidOrNull(body.careDoctorId),
      p_doctor_name: text(body.doctorName, 80),
    });
    forgetDirectory(nurse.hospitalId);
    await notifyDoctor(request, nurse, body, view);
    return response.status(200).json(view);
  }

  if (body.action === 'update_cycle') {
    const view = await callCare('care_nurse_update_cycle', {
      ...base,
      p_cycle_id: uuidOrNull(body.cycleId),
      p_anchor: dateOrNull(body.anchor),
      p_person_name: text(body.personName, 80),
      p_partner_name: body.partnerName === undefined ? null : text(body.partnerName, 80) ?? '',
    });
    return response.status(200).json(view);
  }

  if (body.action === 'close_cycle') {
    const view = await callCare('care_nurse_close_cycle', {
      ...base,
      p_cycle_id: uuidOrNull(body.cycleId),
      p_outcome: ['positive', 'negative', 'stopped'].includes(body.outcome) ? body.outcome : null,
      p_date: dateOrNull(body.date),
    });
    return response.status(200).json(view);
  }

  return response.status(400).json({ error: 'Unknown action.' });
});
