import { getNurseDesk } from '@/lib/server/doctor-desk';
import { nurseRoute, uuidOrNull } from '@/lib/server/nurse-api';

// Who is coming today and who didn't come, for the doctor the nurse is
// working with. ?fresh=1 skips the server's 15-second copy.
export default nurseRoute(['GET'], async (request, response, nurse) => {
  const doctorId = uuidOrNull(request.query.doctorId);
  if (!doctorId) return response.status(400).json({ error: 'Choose the doctor you are working with today.' });
  return response.status(200).json(await getNurseDesk(nurse, doctorId, { fresh: request.query.fresh === '1' }));
});
