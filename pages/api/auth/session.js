import { getDoctorSession, renewDoctorSession } from '@/lib/server/doctor-session';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  const session = getDoctorSession(request);
  if (!session) return response.status(200).json(null);
  const { doctor, expiresAt } = renewDoctorSession(response, session);
  return response.status(200).json({ doctor, expiresAt });
}
