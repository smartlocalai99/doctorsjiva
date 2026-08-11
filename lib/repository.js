import { supabase } from './supabase';

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

export async function loadWorkspace() {
  return requestJson('/api/workspace', { cache: 'no-store' });
}

export async function loadPostComments(postId) {
  const result = await requestJson(`/api/comments?postId=${encodeURIComponent(postId)}`, { cache: 'no-store' });
  return result.comments || [];
}

async function uploadFile(file, purpose) {
  if (!supabase) throw new Error('The shared Supabase backend is not configured.');
  const signed = await requestJson('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, fileSize: file.size, purpose }),
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed;
}

async function removeUpload(upload) {
  if (!upload) return;
  await requestJson('/api/uploads', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: upload.bucket, path: upload.path }),
  }).catch(() => undefined);
}

export async function savePost(input) {
  if (!input.file) throw new Error('Choose an image or video.');
  let upload;
  try {
    upload = await uploadFile(input.file, 'post');
    const result = await requestJson('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: upload.id,
        title: input.title,
        caption: input.caption,
        hashtags: input.hashtags,
        safetyNote: input.safety_note,
        sourceUrl: input.source_url,
        mediaType: input.media_type,
        mediaPath: upload.path,
      }),
    });
    return result.post;
  } catch (error) {
    await removeUpload(upload);
    throw error;
  }
}

export async function deletePost(postId) {
  await requestJson('/api/posts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: postId }),
  });
}

export async function saveProfile(input) {
  let upload;
  try {
    if (input.avatar_file) upload = await uploadFile(input.avatar_file, 'avatar');
    const result = await requestJson('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, avatar_file: undefined, avatar_path: upload?.path || input.avatar_path }),
    });
    return result.profile;
  } catch (error) {
    await removeUpload(upload);
    throw error;
  }
}
