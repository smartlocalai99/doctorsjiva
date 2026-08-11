import { demoPosts, demoProfile, TEST_PHONE } from './demo-data';
import { getLocalMediaUrl, saveLocalMedia } from './local-media';

const POSTS_KEY = 'drjiva-doctor-posts-v2';
const PROFILE_KEY = 'drjiva-doctor-profile-v2';

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
      media_url: record.media_key ? await getLocalMediaUrl(record.media_key) : record.media_url,
    })),
  );
}

export async function loadWorkspace(sessionDoctor = demoProfile) {
  const posts = parseLocal(POSTS_KEY, demoPosts);
  const savedProfile = parseLocal(PROFILE_KEY, null);
  const profile = savedProfile ? { ...sessionDoctor, ...savedProfile } : { ...demoProfile, ...sessionDoctor };
  const [hydratedPosts, avatarUrl] = await Promise.all([
    hydrateLocalMedia(posts.filter((post) => post.doctor_phone === profile.phone_number)),
    profile.avatar_key ? getLocalMediaUrl(profile.avatar_key) : Promise.resolve(profile.avatar_url),
  ]);
  return { profile: { ...profile, avatar_url: avatarUrl }, posts: hydratedPosts };
}

function normalizeHashtags(value) {
  const tags = Array.isArray(value) ? value : value.split(/[\s,]+/);
  return [...new Set(tags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 10);
}

export async function savePost(input, doctorPhone = TEST_PHONE) {
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  if (!input.title.trim() || !input.caption.trim()) throw new Error('Add both a title and caption.');
  if (!input.file && !input.media_url) throw new Error('Choose an image or video.');

  const existing = parseLocal(POSTS_KEY, demoPosts);
  const mediaKey = input.file ? `post-${doctorPhone}-${id}-${Date.now()}` : input.media_key;
  if (input.file) await saveLocalMedia(mediaKey, input.file);
  const post = {
    ...input,
    id,
    doctor_phone: doctorPhone,
    title: input.title.trim(),
    caption: input.caption.trim(),
    hashtags: normalizeHashtags(input.hashtags),
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

export async function archivePost(postId) {
  const posts = parseLocal(POSTS_KEY, demoPosts).map((post) =>
    post.id === postId ? { ...post, status: 'archived', updated_at: new Date().toISOString() } : post,
  );
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

export async function saveProfile(input) {
  if (!input.display_name.trim() || !input.specialty.trim()) throw new Error('Name and specialty are required.');
  const avatarKey = input.avatar_file ? `avatar-${input.phone_number}-${Date.now()}` : input.avatar_key;
  if (input.avatar_file) await saveLocalMedia(avatarKey, input.avatar_file);
  const profile = {
    ...input,
    phone_number: input.phone_number || TEST_PHONE,
    avatar_key: avatarKey,
    avatar_url: avatarKey ? await getLocalMediaUrl(avatarKey) : input.avatar_url,
    updated_at: new Date().toISOString(),
  };
  const cleanProfile = { ...profile, avatar_file: undefined };
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...cleanProfile, avatar_url: '' }));
  return cleanProfile;
}
