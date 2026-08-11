import { clearDoctorSession } from '@/lib/server/doctor-session';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  clearDoctorSession(response);
  return response.status(200).json({ ok: true });
}
