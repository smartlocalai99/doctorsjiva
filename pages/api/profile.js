import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'PUT') {
    response.setHeader('Allow', 'PUT');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });
  const input = request.body || {};
  if (!input.display_name?.trim() || !input.specialty?.trim()) return response.status(400).json({ error: 'Name and specialty are required.' });
  const avatarPrefix = `${session.doctor.phone_number.replace(/\D/g, '')}/avatars/`;
  if (input.avatar_path && !input.avatar_path.startsWith(avatarPrefix)) return response.status(400).json({ error: 'Invalid profile image path.' });

  try {
    const admin = getSupabaseAdmin();
    const avatarUrl = input.avatar_path ? admin.storage.from('doctor-avatars').getPublicUrl(input.avatar_path).data.publicUrl : input.avatar_url || '';
    const updates = {
      display_name: input.display_name.trim(),
      slug: input.slug?.trim() || input.username?.trim() || 'doctor',
      specialty: input.specialty.trim(),
      hospital_name: input.hospital_name?.trim() || '',
      experience_years: Number(input.experience_years) || 0,
      qualifications: input.qualifications?.trim() || '',
      city: input.city?.trim() || '',
      bio: input.bio?.trim() || '',
      avatar_url: avatarUrl,
    };
    const { data, error } = await admin.from('doctors').update(updates).eq('phone_number', session.doctor.phone_number).select().single();
    if (error) throw error;
    return response.status(200).json({ profile: data });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to save the profile.' });
  }
}
