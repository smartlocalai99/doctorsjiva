import { getDoctorSession } from './doctor-session';

// Wraps a doctor API route: GET only, no caching, a signed doctor cookie.
export function doctorRoute(handler) {
  return async function route(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'Method not allowed.' });
    }
    const session = getDoctorSession(request);
    if (!session?.doctor?.phone_number) return response.status(401).json({ error: 'Please log in again.' });
    try {
      return await handler(request, response, session.doctor);
    } catch (error) {
      console.error('[doctor-api]', error);
      return response.status(500).json({ error: 'Could not load your patients. Try again in a minute.' });
    }
  };
}
