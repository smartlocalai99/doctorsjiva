import { doctorRoute } from '@/lib/server/doctor-api';
import { getDoctorDesk } from '@/lib/server/doctor-desk';

// Today, the calendar and the patient list in one read.
export default doctorRoute(async (request, response, doctor) => {
  return response.status(200).json(await getDoctorDesk(doctor));
});
