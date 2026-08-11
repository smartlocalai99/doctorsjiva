import { randomUUID } from 'node:crypto';

import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });

  if (request.method === 'POST') return createUpload(request, response, session.doctor.phone_number);
  if (request.method === 'DELETE') return removeUpload(request, response, session.doctor.phone_number);
  response.setHeader('Allow', 'POST, DELETE');
  return response.status(405).json({ error: 'Method not allowed.' });
}

async function createUpload(request, response, phoneNumber) {
  const { contentType, fileSize, purpose } = request.body || {};
  const extension = MIME_EXTENSIONS[contentType];
  const isAvatar = purpose === 'avatar';
  const maxSize = isAvatar ? 5 * 1024 * 1024 : contentType?.startsWith('video/') ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!extension || !['post', 'avatar'].includes(purpose)) return response.status(400).json({ error: 'Choose a supported image or video.' });
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSize) return response.status(400).json({ error: `The selected file must be below ${Math.round(maxSize / 1024 / 1024)} MB.` });

  try {
    const admin = getSupabaseAdmin();
    const owner = phoneNumber.replace(/\D/g, '');
    const id = randomUUID();
    const bucket = isAvatar ? 'doctor-avatars' : 'health-feed';
    const path = `${owner}/${isAvatar ? 'avatars' : `posts/${id}`}/${Date.now()}.${extension}`;
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;
    return response.status(200).json({ bucket, id, path, token: data.token });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to prepare the upload.' });
  }
}

async function removeUpload(request, response, phoneNumber) {
  const { bucket, path } = request.body || {};
  const ownerPrefix = `${phoneNumber.replace(/\D/g, '')}/`;
  if (!['health-feed', 'doctor-avatars'].includes(bucket) || typeof path !== 'string' || !path.startsWith(ownerPrefix)) {
    return response.status(400).json({ error: 'Invalid upload path.' });
  }
  try {
    const { error } = await getSupabaseAdmin().storage.from(bucket).remove([path]);
    if (error) throw error;
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to remove the upload.' });
  }
}
