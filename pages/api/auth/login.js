import { createDoctorSession } from '@/lib/server/doctor-session';
import { verifyDoctorLogin } from '@/lib/server/doctor-login';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const doctor = await verifyDoctorLogin(request.body?.phone, request.body?.code);
    if (!doctor) return response.status(401).json({ error: 'The mobile number or login code is incorrect.' });
    createDoctorSession(response, doctor);
    return response.status(200).json({ doctor });
  } catch {
    return response.status(500).json({ error: 'Login is unavailable. Check the server configuration and try again.' });
  }
}
