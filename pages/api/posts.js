import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });
  if (request.method === 'POST') return publishPost(request, response, session.doctor.phone_number);
  if (request.method === 'DELETE') return deletePost(request, response, session.doctor.phone_number);
  response.setHeader('Allow', 'POST, DELETE');
  return response.status(405).json({ error: 'Method not allowed.' });
}

async function publishPost(request, response, phoneNumber) {
  const { caption, hashtags, id, mediaPath, mediaType, safetyNote, sourceUrl, title } = request.body || {};
  const ownerPrefix = `${phoneNumber.replace(/\D/g, '')}/posts/${id}/`;
  if (!UUID_PATTERN.test(id || '') || typeof mediaPath !== 'string' || !mediaPath.startsWith(ownerPrefix)) return response.status(400).json({ error: 'The uploaded media does not match this doctor account.' });
  if (!['image', 'video'].includes(mediaType)) return response.status(400).json({ error: 'Choose an image or video.' });
  if (!title?.trim() || title.trim().length > 90) return response.status(400).json({ error: 'Add a title under 90 characters.' });
  if (!caption?.trim() || caption.trim().length > 1200) return response.status(400).json({ error: 'Add a caption under 1,200 characters.' });

  try {
    const admin = getSupabaseAdmin();
    const mediaUrl = admin.storage.from('health-feed').getPublicUrl(mediaPath).data.publicUrl;
    const row = {
      id,
      doctor_id: null,
      doctor_phone: phoneNumber,
      title: title.trim(),
      caption: caption.trim(),
      hashtags: normalizeHashtags(hashtags),
      media_type: mediaType,
      media_path: mediaPath,
      media_url: mediaUrl,
      status: 'published',
      safety_note: safetyNote?.trim() || null,
      source_url: sourceUrl?.trim() || null,
      published_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from('health_posts').insert(row).select().single();
    if (error) throw error;
    return response.status(201).json({ post: data });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to publish the post.' });
  }
}

async function deletePost(request, response, phoneNumber) {
  const { id } = request.body || {};
  if (!UUID_PATTERN.test(id || '')) return response.status(400).json({ error: 'Invalid post.' });

  const admin = getSupabaseAdmin();
  try {
    const { data: post, error: lookupError } = await admin
      .from('health_posts')
      .select('id, media_path, status')
      .eq('id', id)
      .eq('doctor_phone', phoneNumber)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!post) return response.status(404).json({ error: 'Post not found.' });

    if (post.status !== 'archived') {
      const { error: hideError } = await admin
        .from('health_posts')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('doctor_phone', phoneNumber);
      if (hideError) throw hideError;
    }

    if (post.media_path) {
      const { error: storageError } = await admin.storage.from('health-feed').remove([post.media_path]);
      if (storageError) {
        if (post.status !== 'archived') {
          await admin.from('health_posts').update({ status: post.status }).eq('id', id).eq('doctor_phone', phoneNumber);
        }
        throw storageError;
      }
    }

    const { data: deleted, error: deleteError } = await admin
      .from('health_posts')
      .delete()
      .eq('id', id)
      .eq('doctor_phone', phoneNumber)
      .select('id')
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!deleted) return response.status(404).json({ error: 'Post not found.' });
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to delete the post and its media.' });
  }
}

function normalizeHashtags(value) {
  const tags = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/);
  return [...new Set(tags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 10);
}
