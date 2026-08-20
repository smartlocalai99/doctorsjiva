import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });
  if (request.method === 'GET') return listReports(request, response);
  if (request.method === 'POST') return resolveReport(request, response);
  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ error: 'Method not allowed.' });
}

async function listReports(request, response) {
  try {
    const admin = getSupabaseAdmin();
    const { data: reports, error } = await admin
      .from('content_reports')
      .select('id, target_type, post_id, comment_id, reason, description, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;

    const postIds = [...new Set((reports || []).map((report) => report.post_id))];
    const commentIds = [...new Set((reports || []).map((report) => report.comment_id).filter(Boolean))];

    const [postsResult, commentsResult] = await Promise.all([
      postIds.length
        ? admin.from('health_posts').select('id, title, media_url, media_type').in('id', postIds)
        : { data: [] },
      commentIds.length
        ? admin.from('health_post_comments').select('id, author_name, body').in('id', commentIds)
        : { data: [] },
    ]);

    const postsById = new Map((postsResult.data || []).map((post) => [post.id, post]));
    const commentsById = new Map((commentsResult.data || []).map((comment) => [comment.id, comment]));

    const enriched = (reports || []).map((report) => ({
      ...report,
      comment: report.comment_id ? commentsById.get(report.comment_id) || null : null,
      post: postsById.get(report.post_id) || null,
    }));

    return response.status(200).json({ reports: enriched });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to load reports.' });
  }
}

async function resolveReport(request, response) {
  const { action, reportId } = request.body || {};
  if (!UUID_PATTERN.test(reportId || '')) return response.status(400).json({ error: 'Invalid report.' });
  if (!['dismiss', 'remove_content'].includes(action)) return response.status(400).json({ error: 'Invalid action.' });

  try {
    const admin = getSupabaseAdmin();
    const { data: report, error: reportError } = await admin
      .from('content_reports')
      .select('id, target_type, post_id, comment_id')
      .eq('id', reportId)
      .single();
    if (reportError) throw reportError;

    if (action === 'remove_content') {
      if (report.target_type === 'comment' && report.comment_id) {
        await admin.from('health_post_comments').delete().eq('id', report.comment_id);
      } else {
        // health_posts.status only allows 'published' | 'archived' — archiving
        // pulls it out of fetchHealthFeed's `.eq('status', 'published')` filter.
        await admin.from('health_posts').update({ status: 'archived' }).eq('id', report.post_id);
      }
    }

    const { error: updateError } = await admin
      .from('content_reports')
      .update({
        resolved_at: new Date().toISOString(),
        status: action === 'remove_content' ? 'actioned' : 'dismissed',
      })
      .eq('id', reportId);
    if (updateError) throw updateError;

    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to resolve this report.' });
  }
}
