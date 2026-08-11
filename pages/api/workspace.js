import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });

  try {
    const admin = getSupabaseAdmin();
    const [profileResult, postsResult] = await Promise.all([
      admin.from('doctors').select('*').eq('phone_number', session.doctor.phone_number).single(),
      admin.from('health_posts').select('*').eq('doctor_phone', session.doctor.phone_number).order('created_at', { ascending: false }),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (postsResult.error) throw postsResult.error;
    return response.status(200).json({ profile: profileResult.data, posts: postsResult.data || [] });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to load the doctor workspace.' });
  }
}
