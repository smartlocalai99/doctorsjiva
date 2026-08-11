import { getDoctorSession } from '@/lib/server/doctor-session';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  const session = getDoctorSession(request);
  return response.status(200).json(session);
}
