import { indiaToday } from '@/lib/doctor-desk';
import { getDoctorDesk } from '@/lib/server/doctor-desk';
import { requestOrigin, sendToSubscriptions } from '@/lib/server/doctor-push';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

// 8 AM India time (vercel.json): each doctor with notifications on gets
// who is coming today. At most once a day per phone, so a second call
// does nothing.
function allowed(request) {
  if (process.env.CRON_SECRET) return request.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  return String(request.headers['user-agent'] || '').startsWith('vercel-cron');
}

function summary(desk) {
  const today = desk.appointments.filter((entry) => entry.date === desk.today && entry.status === 'expected').length;
  const missed = desk.missed.length;
  if (!today && !missed) return null;
  const coming = today ? `${today} ${today === 1 ? 'patient' : 'patients'} coming today.` : 'No one booked today.';
  return missed ? `${coming} ${missed} to call back.` : coming;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!allowed(request)) return response.status(401).json({ error: 'Not allowed.' });

  const db = getSupabaseAdmin();
  const today = indiaToday();
  const { data: subscriptions, error } = await db.from('doctor_push_subscriptions')
    .select('endpoint, p256dh, auth, doctor_phone, summary_sent_on')
    .or(`summary_sent_on.is.null,summary_sent_on.lt.${today}`);
  if (error) return response.status(500).json({ error: error.message });

  const byDoctor = new Map();
  for (const row of subscriptions || []) byDoctor.set(row.doctor_phone, [...(byDoctor.get(row.doctor_phone) || []), row]);
  const { data: doctors } = byDoctor.size
    ? await db.from('doctors').select('phone_number, display_name, hospital_name').in('phone_number', [...byDoctor.keys()])
    : { data: [] };

  let sent = 0;
  for (const doctor of doctors || []) {
    try {
      const body = summary(await getDoctorDesk(doctor, { fresh: true }));
      const rows = byDoctor.get(doctor.phone_number);
      if (body) sent += (await sendToSubscriptions(rows, { body, tag: 'morning', title: 'Good morning', url: '/' }, requestOrigin(request))).length;
      await db.from('doctor_push_subscriptions').update({ summary_sent_on: today }).in('endpoint', rows.map((row) => row.endpoint));
    } catch (sendError) {
      console.error('[cron-morning]', doctor.phone_number, sendError);
    }
  }
  return response.status(200).json({ doctors: doctors?.length || 0, sent });
}
