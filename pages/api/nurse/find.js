import { callCare, nurseRoute, text } from '@/lib/server/nurse-api';

// Exact match only: a 10-digit mobile or this hospital's patient ID.
export default nurseRoute(['POST'], async (request, response, nurse) => {
  const query = text(request.body?.query, 40);
  if (!query) return response.status(400).json({ error: 'Type a mobile number or hospital ID.' });
  const result = await callCare('care_nurse_find', { p_nurse_id: nurse.id, p_query: query });
  return response.status(200).json(result);
});
