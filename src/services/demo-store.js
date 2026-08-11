import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultDoctorProfile, demoPosts } from '../data/demo-data';

const POSTS_KEY = 'drjiva-doctor-demo-posts-v1';
const PROFILE_KEY = 'drjiva-doctor-demo-profile-v1';

async function readJson(key, fallback) {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function listDemoPosts() {
  return readJson(POSTS_KEY, demoPosts);
}

export async function getDemoPost(postId) {
  const posts = await listDemoPosts();
  return posts.find((post) => post.id === postId) ?? null;
}

export async function saveDemoPost(input) {
  const posts = await listDemoPosts();
  const now = new Date().toISOString();
  const nextPost = {
    id: input.id ?? `demo-${Date.now()}`,
    doctor_id: input.doctor_id,
    title: input.title.trim(),
    caption: input.caption.trim(),
    hashtags: input.hashtags,
    media_type: input.media_type,
    media_url: input.media?.uri ?? input.media_url ?? null,
    status: input.status,
    views_count: input.views_count ?? 0,
    likes_count: input.likes_count ?? 0,
    comments_count: input.comments_count ?? 0,
    published_at:
      input.status === 'published' ? input.published_at ?? now : null,
    created_at: input.created_at ?? now,
    updated_at: now,
  };

  const nextPosts = input.id
    ? posts.map((post) => (post.id === input.id ? nextPost : post))
    : [nextPost, ...posts];

  await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(nextPosts));
  return nextPost;
}

export async function archiveDemoPost(postId) {
  const posts = await listDemoPosts();
  const nextPosts = posts.map((post) =>
    post.id === postId
      ? { ...post, status: 'archived', updated_at: new Date().toISOString() }
      : post,
  );
  await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(nextPosts));
}

export async function getDemoProfile() {
  return readJson(PROFILE_KEY, defaultDoctorProfile);
}

export async function saveDemoProfile(profile) {
  const nextProfile = {
    ...defaultDoctorProfile,
    ...profile,
    updated_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
  return nextProfile;
}
