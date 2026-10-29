import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { usageSample } from '@/lib/server/usage-sample';
import { getUsageSession } from '@/lib/server/usage-session';

const PERIODS = new Set([1, 7, 30]);

// Everything on the usage page, for today, 7 or 30 days.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  const session = configured ? getUsageSession(request) : { admin: { name: 'Preview', phone: '' } };
  if (!session) return response.status(401).json({ error: 'Please log in again.' });
  const days = PERIODS.has(Number(request.query.days)) ? Number(request.query.days) : 7;
  // Local preview without Supabase: sample numbers (like the sample doctor).
  if (!configured) return response.status(200).json({ ...usageSample(days), admin: session.admin });
  try {
    const { data, error } = await getSupabaseAdmin().rpc('usage_dashboard', { p_days: days });
    if (error) throw error;
    return response.status(200).json({ ...data, admin: session.admin });
  } catch (error) {
    console.error('[usage-data]', error);
    return response.status(500).json({ error: 'Could not load the numbers. Try again in a minute.' });
  }
}
