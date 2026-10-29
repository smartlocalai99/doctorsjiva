import { clearUsageSession } from '@/lib/server/usage-session';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).end();
  }
  clearUsageSession(response);
  return response.status(204).end();
}
