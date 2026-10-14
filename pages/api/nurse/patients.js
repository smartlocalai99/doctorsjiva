import { nurseRoute } from '@/lib/server/nurse-api';
import { getDirectory } from '@/lib/server/nurse-directory';

// The nurse's hospital patient list (newest first). Read once per session;
// search suggestions are made in the browser from it.
export default nurseRoute(['GET'], async (request, response, nurse) => {
  const { at, rows } = await getDirectory(nurse, { fresh: request.query.fresh === '1' });
  return response.status(200).json({ loadedAt: at, patients: rows });
});
