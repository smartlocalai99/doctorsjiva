import { getDoctorSession } from './doctor-session';

// Wraps a doctor API route: no caching, a signed doctor cookie, and
// JSON-only writes (blocks cross-site form posts). GET only by default.
export function doctorRoute(handler, { methods = ['GET'] } = {}) {
  return async function route(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (!methods.includes(request.method)) {
      response.setHeader('Allow', methods.join(', '));
      return response.status(405).json({ error: 'Method not allowed.' });
    }
    if (request.method !== 'GET' && !String(request.headers['content-type'] || '').includes('application/json')) {
      return response.status(415).json({ error: 'Send JSON.' });
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
