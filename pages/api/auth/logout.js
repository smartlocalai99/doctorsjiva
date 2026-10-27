import { forgetPhone } from '@/lib/server/doctor-push';
import { clearDoctorSession } from '@/lib/server/doctor-session';

// Ends the login, and with the phone's notification endpoint, stops its
// notifications too (see contexts/AuthContext).
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  clearDoctorSession(response);
  try {
    await forgetPhone(request.body?.endpoint);
  } catch (error) {
    console.error('[logout]', error);
  }
  return response.status(200).json({ ok: true });
}
