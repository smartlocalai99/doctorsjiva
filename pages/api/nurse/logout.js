import { clearNurseSession } from '@/lib/server/nurse-session';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  clearNurseSession(response);
  return response.status(200).json({ ok: true });
}
