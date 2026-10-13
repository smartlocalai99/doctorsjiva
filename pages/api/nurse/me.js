import { callCare, nurseRoute } from '@/lib/server/nurse-api';

// Re-checks the nurse is still active on every page load.
export default nurseRoute(['GET'], async (request, response, nurse) => {
  const profile = await callCare('care_nurse_profile', { p_nurse_id: nurse.id });
  return response.status(200).json(profile);
});
