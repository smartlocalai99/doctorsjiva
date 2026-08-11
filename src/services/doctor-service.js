import { fetch as expoFetch } from 'expo/fetch';

import { DEMO_DOCTOR_ID, defaultDoctorProfile } from '../data/demo-data';
import { isBackendConfigured, supabase } from '../lib/supabase';
import {
  archiveDemoPost,
  getDemoPost,
  getDemoProfile,
  listDemoPosts,
  saveDemoPost,
  saveDemoProfile,
} from './demo-store';

const CONTENT_BUCKET = 'health-feed';
const AVATAR_BUCKET = 'doctor-avatars';

async function getDoctorId() {
  if (!supabase) return DEMO_DOCTOR_ID;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Your session has expired. Please sign in again.');
  return data.user.id;
}

function normalizeHashtags(hashtags) {
  const source = Array.isArray(hashtags) ? hashtags : hashtags.split(/[\s,]+/);
  return [...new Set(source.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean))]
    .slice(0, 10);
}

function createUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getMediaExtension(media) {
  const fileNameExtension = media.fileName?.split('.').pop()?.toLowerCase();
  if (fileNameExtension) return fileNameExtension;
  if (media.mimeType?.includes('/')) return media.mimeType.split('/')[1].replace('quicktime', 'mov');
  return media.type === 'video' ? 'mp4' : 'jpg';
}

async function uploadAsset(bucket, folder, media) {
  if (!supabase || !media?.uri) return null;

  const response = await expoFetch(media.uri);
  if (!response.ok) throw new Error('Unable to read the selected media.');
  const body = await response.arrayBuffer();
  const extension = getMediaExtension(media);
  const objectPath = `${folder}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
    contentType: media.mimeType ?? (media.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return { path: objectPath, url: data.publicUrl };
}

export async function listDoctorPosts() {
  if (!isBackendConfigured) return listDemoPosts();
  const doctorId = await getDoctorId();
  const { data, error } = await supabase
    .from('health_posts')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDoctorPost(postId) {
  if (!isBackendConfigured) return getDemoPost(postId);
  const doctorId = await getDoctorId();
  const { data, error } = await supabase
    .from('health_posts')
    .select('*')
    .eq('id', postId)
    .eq('doctor_id', doctorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveDoctorPost(input) {
  const doctorId = await getDoctorId();
  const payload = {
    ...input,
    doctor_id: doctorId,
    title: input.title.trim(),
    caption: input.caption.trim(),
    hashtags: normalizeHashtags(input.hashtags),
  };

  if (!payload.title) throw new Error('Add a clear post title.');
  if (!payload.caption) throw new Error('Add a helpful caption.');
  if (!payload.media?.uri && !payload.media_url) {
    throw new Error('Choose an image or video before saving.');
  }

  if (!isBackendConfigured) return saveDemoPost(payload);

  const postId = payload.id ?? createUuid();
  let mediaPath = payload.media_path ?? null;
  let mediaUrl = payload.media_url ?? null;

  if (payload.media?.uri && payload.media.uri !== payload.media_url) {
    const uploaded = await uploadAsset(
      CONTENT_BUCKET,
      `${doctorId}/${postId}`,
      payload.media,
    );
    mediaPath = uploaded.path;
    mediaUrl = uploaded.url;
  }

  const row = {
    id: postId,
    doctor_id: doctorId,
    title: payload.title,
    caption: payload.caption,
    hashtags: payload.hashtags,
    media_type: payload.media_type,
    media_path: mediaPath,
    media_url: mediaUrl,
    status: payload.status,
    safety_note: payload.safety_note?.trim() || null,
    source_url: payload.source_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const query = payload.id
    ? supabase
        .from('health_posts')
        .update(row)
        .eq('id', postId)
        .eq('doctor_id', doctorId)
    : supabase.from('health_posts').insert(row);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function archiveDoctorPost(postId) {
  if (!isBackendConfigured) return archiveDemoPost(postId);
  const doctorId = await getDoctorId();
  const { error } = await supabase
    .from('health_posts')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('doctor_id', doctorId);
  if (error) throw error;
}

export async function getDoctorProfile() {
  if (!isBackendConfigured) return getDemoProfile();
  const doctorId = await getDoctorId();
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('id', doctorId)
    .maybeSingle();
  if (error) throw error;
  return data ?? { ...defaultDoctorProfile, id: doctorId, verification_status: 'pending' };
}

export async function updateDoctorProfile(input) {
  const doctorId = await getDoctorId();
  let avatarUrl = input.avatar_url ?? null;
  let avatarPath = input.avatar_path ?? null;

  if (!isBackendConfigured) {
    return saveDemoProfile({ ...input, id: doctorId });
  }

  if (input.avatar?.uri && input.avatar.uri !== input.avatar_url) {
    const uploaded = await uploadAsset(AVATAR_BUCKET, doctorId, input.avatar);
    avatarPath = uploaded.path;
    avatarUrl = uploaded.url;
  }

  const row = {
    id: doctorId,
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

  if (!row.display_name || !row.specialty || !row.registration_number) {
    throw new Error('Name, specialty and registration number are required.');
  }

  const { data, error } = await supabase
    .from('doctor_profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
