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
    if (request.query.analytics === '1') {
      const postsResult = await admin.from('health_posts').select('id').eq('doctor_phone', session.doctor.phone_number);
      if (postsResult.error) throw postsResult.error;
      const postIds = (postsResult.data || []).map((post) => post.id);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [viewsResult, likesResult] = postIds.length ? await Promise.all([
        admin.from('health_post_views').select('created_at').in('post_id', postIds).gte('created_at', since),
        admin.from('health_post_likes').select('created_at').in('post_id', postIds).gte('created_at', since),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      if (viewsResult.error) throw viewsResult.error;
      if (likesResult.error) throw likesResult.error;
      return response.status(200).json({ analytics: { likes: likesResult.data || [], views: viewsResult.data || [] } });
    }
    const [profileResult, postsResult] = await Promise.all([
      admin.from('doctors').select('id, phone_number, display_name, specialty, qualifications, hospital_name, experience_years, city, bio, avatar_url, avatar_path, follower_count').eq('phone_number', session.doctor.phone_number).single(),
      admin.from('health_posts').select('id, title, caption, media_url, media_type, status, published_at, updated_at, created_at, views_count, likes_count, comments_count, saves_count').eq('doctor_phone', session.doctor.phone_number).order('created_at', { ascending: false }),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (postsResult.error) throw postsResult.error;
    return response.status(200).json({ profile: profileResult.data, posts: postsResult.data || [] });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to load the doctor workspace.' });
  }
}
