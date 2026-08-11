import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });

  const postId = String(request.query.postId || '');
  if (!UUID_PATTERN.test(postId)) return response.status(400).json({ error: 'Choose a valid post.' });

  try {
    const admin = getSupabaseAdmin();
    const { data: post, error: postError } = await admin
      .from('health_posts')
      .select('id')
      .eq('id', postId)
      .eq('doctor_phone', session.doctor.phone_number)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) return response.status(404).json({ error: 'Post not found.' });

    const { data, error } = await admin
      .from('health_post_comments')
      .select('id,author_name,body,created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return response.status(200).json({ comments: data || [] });
  } catch (error) {
    console.error('Unable to load doctor post comments.', error);
    return response.status(503).json({ error: 'Unable to load comments. Please try again.' });
  }
}
