import { getDoctorSession } from '@/lib/server/doctor-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = ['medical', 'dental', 'other'];

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const session = getDoctorSession(request);
  if (!session) return response.status(401).json({ error: 'Your session expired. Sign in again.' });
  if (request.method === 'GET') return listCamps(request, response, session.doctor.phone_number);
  if (request.method === 'POST') return publishCamp(request, response, session.doctor.phone_number);
  if (request.method === 'DELETE') return deleteCamp(request, response, session.doctor.phone_number);
  response.setHeader('Allow', 'GET, POST, DELETE');
  return response.status(405).json({ error: 'Method not allowed.' });
}

async function loadDoctorProfile(admin, phoneNumber) {
  const { data, error } = await admin
    .from('doctors')
    .select('display_name, hospital_name')
    .eq('phone_number', phoneNumber)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Doctor profile not found.');
  return data;
}

async function listCamps(request, response, phoneNumber) {
  try {
    const admin = getSupabaseAdmin();
    const doctor = await loadDoctorProfile(admin, phoneNumber);
    const { data, error } = await admin
      .from('hospital_events')
      .select('id, title, event_type, doctor_name, description, event_date, start_time, end_time, location, created_at')
      .eq('hospital_name', doctor.hospital_name)
      .order('event_date', { ascending: false })
      .limit(100);
    if (error) throw error;
    return response.status(200).json({ camps: data || [], hospitalName: doctor.hospital_name });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to load camps.' });
  }
}

async function publishCamp(request, response, phoneNumber) {
  const { description, endTime, eventDate, eventType, location, startTime, title } = request.body || {};
  if (!title?.trim() || title.trim().length > 120) return response.status(400).json({ error: 'Add a title under 120 characters.' });
  if (!EVENT_TYPES.includes(eventType)) return response.status(400).json({ error: 'Choose a camp type.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate || '')) return response.status(400).json({ error: 'Choose a valid date.' });

  try {
    const admin = getSupabaseAdmin();
    const doctor = await loadDoctorProfile(admin, phoneNumber);

    const { data: hospitalMatches } = await admin
      .from('hospitals')
      .select('id')
      .ilike('name', `%${doctor.hospital_name}%`)
      .limit(1);
    const hospital = hospitalMatches?.[0] || null;

    const row = {
      description: description?.trim() || null,
      doctor_name: doctor.display_name,
      end_time: endTime || null,
      event_date: eventDate,
      event_type: eventType,
      hospital_id: hospital?.id || null,
      hospital_name: doctor.hospital_name,
      location: location?.trim() || doctor.hospital_name,
      start_time: startTime || null,
      title: title.trim(),
    };
    const { data, error } = await admin.from('hospital_events').insert(row).select().single();
    if (error) throw error;
    return response.status(201).json({ camp: data });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to publish the camp.' });
  }
}

async function deleteCamp(request, response, phoneNumber) {
  const { id } = request.body || {};
  if (!UUID_PATTERN.test(id || '')) return response.status(400).json({ error: 'Invalid camp.' });

  try {
    const admin = getSupabaseAdmin();
    const doctor = await loadDoctorProfile(admin, phoneNumber);
    const { data: deleted, error } = await admin
      .from('hospital_events')
      .delete()
      .eq('id', id)
      .eq('hospital_name', doctor.hospital_name)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!deleted) return response.status(404).json({ error: 'Camp not found.' });
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(503).json({ error: error.message || 'Unable to remove the camp.' });
  }
}
