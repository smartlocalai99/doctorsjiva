import { demoPosts, demoProfile, DEMO_DOCTOR_ID } from './demo-data';
import { getLocalMediaUrl, saveLocalMedia } from './local-media';
import { isSupabaseConfigured, supabase } from './supabase';

const POSTS_KEY = 'drjiva-doctor-posts-v1';
const PROFILE_KEY = 'drjiva-doctor-profile-v1';
const FEED_BUCKET = 'health-feed';
const AVATAR_BUCKET = 'doctor-avatars';

function parseLocal(key, fallback) {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function hydrateLocalMedia(records) {
  return Promise.all(
    records.map(async (record) => ({
      ...record,
      media_url: record.media_key
        ? await getLocalMediaUrl(record.media_key)
        : record.media_url,
    })),
  );
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Your session has expired. Sign in again.');
  return data.user;
}

async function ensureDoctorProfile(user) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const metadata = user.user_metadata ?? {};
  const row = {
    id: user.id,
    display_name: metadata.full_name ?? metadata.name ?? user.email?.split('@')[0] ?? 'Doctor',
    username: `doctor_${user.id.replaceAll('-', '').slice(0, 12)}`,
    specialty: '',
    qualifications: '',
    registration_number: '',
    bio: '',
    avatar_url: metadata.avatar_url ?? metadata.picture ?? '',
  };
  const { data: profile, error: insertError } = await supabase
    .from('doctor_profiles')
    .insert(row)
    .select()
    .single();
  if (insertError) throw insertError;
  return profile;
}

export async function loadWorkspace() {
  if (!isSupabaseConfigured) {
    const posts = parseLocal(POSTS_KEY, demoPosts);
    const profile = parseLocal(PROFILE_KEY, demoProfile);
    const [hydratedPosts, avatarUrl] = await Promise.all([
      hydrateLocalMedia(posts),
      profile.avatar_key ? getLocalMediaUrl(profile.avatar_key) : Promise.resolve(profile.avatar_url),
    ]);
    return { profile: { ...profile, avatar_url: avatarUrl }, posts: hydratedPosts };
  }

  const user = await getAuthenticatedUser();
  const profile = await ensureDoctorProfile(user);
  const { data: posts, error } = await supabase
    .from('health_posts')
    .select('*')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { profile, posts: posts ?? [] };
}

function normalizeHashtags(value) {
  const tags = Array.isArray(value) ? value : value.split(/[\s,]+/);
  return [...new Set(tags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 10);
}

async function uploadFile(bucket, folder, file) {
  const extension = file.name?.split('.').pop()?.toLowerCase() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
  const path = `${folder}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export async function savePost(input) {
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const hashtags = normalizeHashtags(input.hashtags);

  if (!input.title.trim() || !input.caption.trim()) {
    throw new Error('Add both a title and caption.');
  }
  if (!input.file && !input.media_url) {
    throw new Error('Choose an image or video.');
  }

  if (!isSupabaseConfigured) {
    const existing = parseLocal(POSTS_KEY, demoPosts);
    const mediaKey = input.file ? `post-${id}-${Date.now()}` : input.media_key;
    if (input.file) await saveLocalMedia(mediaKey, input.file);
    const post = {
      ...input,
      id,
      doctor_id: DEMO_DOCTOR_ID,
      title: input.title.trim(),
      caption: input.caption.trim(),
      hashtags,
      media_key: mediaKey,
      media_url: mediaKey ? await getLocalMediaUrl(mediaKey) : input.media_url,
      status: input.status,
      views_count: input.views_count ?? 0,
      likes_count: input.likes_count ?? 0,
      comments_count: input.comments_count ?? 0,
      published_at: input.status === 'published' ? input.published_at ?? now : null,
      created_at: input.created_at ?? now,
      updated_at: now,
    };
    const persistedPost = { ...post, file: undefined, media_url: '' };
    const next = input.id
      ? existing.map((item) => (item.id === input.id ? persistedPost : item))
      : [persistedPost, ...existing];
    localStorage.setItem(POSTS_KEY, JSON.stringify(next));
    return { ...post, file: undefined };
  }

  const user = await getAuthenticatedUser();
  await ensureDoctorProfile(user);
  let mediaPath = input.media_path ?? null;
  let mediaUrl = input.media_url ?? '';
  if (input.file) {
    const uploaded = await uploadFile(FEED_BUCKET, `${user.id}/${id}`, input.file);
    mediaPath = uploaded.path;
    mediaUrl = uploaded.url;
  }

  const row = {
    id,
    doctor_id: user.id,
    title: input.title.trim(),
    caption: input.caption.trim(),
    hashtags,
    media_type: input.media_type,
    media_path: mediaPath,
    media_url: mediaUrl,
    status: input.status,
    safety_note: input.safety_note?.trim() || null,
    source_url: input.source_url?.trim() || null,
    published_at: input.status === 'published' ? input.published_at ?? now : null,
    updated_at: now,
  };
  const query = input.id
    ? supabase.from('health_posts').update(row).eq('id', id).eq('doctor_id', user.id)
    : supabase.from('health_posts').insert(row);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function archivePost(postId) {
  if (!isSupabaseConfigured) {
    const posts = parseLocal(POSTS_KEY, demoPosts).map((post) =>
      post.id === postId ? { ...post, status: 'archived' } : post,
    );
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    return;
  }
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from('health_posts')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('doctor_id', user.id);
  if (error) throw error;
}

export async function saveProfile(input) {
  if (!input.display_name.trim() || !input.specialty.trim()) {
    throw new Error('Name and specialty are required.');
  }

  if (!isSupabaseConfigured) {
    const avatarKey = input.avatar_file ? `avatar-${Date.now()}` : input.avatar_key;
    if (input.avatar_file) await saveLocalMedia(avatarKey, input.avatar_file);
    const profile = {
      ...input,
      id: DEMO_DOCTOR_ID,
      avatar_key: avatarKey,
      avatar_url: avatarKey ? await getLocalMediaUrl(avatarKey) : input.avatar_url,
      updated_at: new Date().toISOString(),
    };
    const cleanProfile = { ...profile, avatar_file: undefined };
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...cleanProfile, avatar_url: '' }));
    return cleanProfile;
  }

  const user = await getAuthenticatedUser();
  let avatarPath = input.avatar_path ?? null;
  let avatarUrl = input.avatar_url ?? '';
  if (input.avatar_file) {
    const uploaded = await uploadFile(AVATAR_BUCKET, user.id, input.avatar_file);
    avatarPath = uploaded.path;
    avatarUrl = uploaded.url;
  }
  const row = {
    id: user.id,
    display_name: input.display_name.trim(),
    username: input.username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, ''),
    specialty: input.specialty.trim(),
    qualifications: input.qualifications.trim(),
    registration_number: input.registration_number.trim(),
    bio: input.bio.trim(),
    avatar_path: avatarPath,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('doctor_profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
