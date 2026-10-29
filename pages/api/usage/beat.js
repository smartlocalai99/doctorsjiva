import { getDoctorSession } from '@/lib/server/doctor-session';
import { UUID_PATTERN } from '@/lib/server/nurse-api';
import { getNurseSession } from '@/lib/server/nurse-session';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

// Screen time from the doctor and nurse apps (lib/usage-client). Who it is
// comes from the signed-in cookie, never from the browser; without one the
// time counts as the login screen.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).end();
  }
  const { app, device, screens, session } = request.body || {};
  if (!['doctor', 'nurse'].includes(app) || !UUID_PATTERN.test(String(session || '')) || !/^[A-Za-z0-9_-]{8,64}$/.test(String(device || '')) || !Array.isArray(screens) || screens.length > 30) {
    return response.status(400).end();
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return response.status(204).end();

  const nurse = app === 'nurse' ? getNurseSession(request)?.nurse : null;
  const doctor = app === 'doctor' ? getDoctorSession(request)?.doctor : null;
  const signedIn = Boolean(nurse?.id || doctor?.phone_number);
  const clean = screens.map((entry) => ({
    screen: signedIn ? String(entry?.screen || '').slice(0, 80) : 'Login',
    seconds: Number(entry?.seconds) || 0,
    views: Number(entry?.views) || 0,
  }));

  const { error } = await getSupabaseAdmin().rpc('usage_save', {
    p_app: app,
    p_session: session,
    p_device: device,
    p_platform: 'web',
    p_version: process.env.APP_BUILD_ID || null,
    p_owner: null,
    p_patient: null,
    p_nurse: nurse?.id || null,
    p_doctor_phone: doctor?.phone_number || null,
    p_screens: clean,
  });
  if (error) console.error('[usage-beat]', error.message);
  return response.status(204).end();
}
