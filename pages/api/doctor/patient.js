import { doctorRoute } from '@/lib/server/doctor-api';
import { getDoctorPatient } from '@/lib/server/doctor-desk';

export default doctorRoute(async (request, response, doctor) => {
  const view = await getDoctorPatient(doctor, String(request.query.id || ''));
  if (!view) return response.status(404).json({ error: 'This patient is not on your list.' });
  return response.status(200).json(view);
});
