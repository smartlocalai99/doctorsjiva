import { getNurseSchedule } from '@/lib/server/doctor-desk';
import { nurseRoute } from '@/lib/server/nurse-api';

// Next visit date and pregnancy / IUI / baby for every patient at the
// nurse's hospital, for sorting and labelling her patient lists.
export default nurseRoute(['GET'], async (request, response, nurse) => {
  return response.status(200).json(await getNurseSchedule(nurse, { fresh: request.query.fresh === '1' }));
});
