import webpush from 'web-push';

import { matchCareDoctor } from '@/lib/doctor-desk';
import { formatDate } from '@/lib/nurse-schedule';
import { hospitalKey } from './doctor-desk';
import { getSupabaseAdmin } from './supabase-admin';

// Notifications on the doctor's phone: "Lakshmi was seen", "New pregnancy",
// and the 8 AM list for the day. A phone that turned notifications on is a
// row in doctor_push_subscriptions; the keys live in the database (see the
// doctor_push_notifications migration), or in VAPID_* settings if set.
const LOGINS_TTL_MS = 10 * 60 * 1000;
const loginsCache = new Map();
let keys = null;

async function rows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function pushKeys() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { privateKey: process.env.VAPID_PRIVATE_KEY, publicKey: process.env.VAPID_PUBLIC_KEY };
    return keys;
  }
  const db = getSupabaseAdmin();
  let [row] = await rows(db.rpc('doctor_push_keys'));
  if (!row) {
    // First use: make a pair. If another server made one at the same
    // moment, the database keeps theirs and hands it back.
    const fresh = webpush.generateVAPIDKeys();
    [row] = await rows(db.rpc('doctor_push_keys', { new_private_key: fresh.privateKey, new_public_key: fresh.publicKey }));
  }
  keys = { privateKey: row.private_key, publicKey: row.public_key };
  return keys;
}

// Apple and Google want a contact URL for whoever sends the message.
function subject(origin) {
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return origin && origin.startsWith('https://') ? origin : 'https://drjiva.app';
}

export function requestOrigin(request) {
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  return host ? `https://${host}` : '';
}

export async function saveSubscription(doctorPhone, subscription, userAgent = '') {
  const endpoint = String(subscription?.endpoint || '');
  const p256dh = String(subscription?.keys?.p256dh || '');
  const auth = String(subscription?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return false;
  const db = getSupabaseAdmin();
  const { error } = await db.from('doctor_push_subscriptions').upsert({
    auth,
    doctor_phone: doctorPhone,
    endpoint,
    p256dh,
    updated_at: new Date().toISOString(),
    user_agent: String(userAgent).slice(0, 300),
  });
  if (error) throw error;
  return true;
}

export async function removeSubscription(doctorPhone, endpoint) {
  const { error } = await getSupabaseAdmin().from('doctor_push_subscriptions').delete().eq('doctor_phone', doctorPhone).eq('endpoint', String(endpoint || ''));
  if (error) throw error;
}

// Logout: this phone gets nothing more, whoever it was filed under. The
// endpoint is a secret only the phone holds, so it is proof enough (the
// login may already have run out).
export async function forgetPhone(endpoint) {
  const value = String(endpoint || '');
  if (!/^https:\/\//.test(value) || value.length > 1000) return;
  const { error } = await getSupabaseAdmin().from('doctor_push_subscriptions').delete().eq('endpoint', value);
  if (error) throw error;
}

// Sends one message to subscriptions (rows with endpoint, p256dh, auth,
// doctor_phone). Each copy names the doctor it is for, and the phone only
// shows it while she is the one signed in there (public/sw.js). Phones
// that switched notifications off are forgotten.
export async function sendToSubscriptions(subscriptions, message, origin) {
  if (!subscriptions.length) return [];
  const { privateKey, publicKey } = await pushKeys();
  const options = { TTL: 12 * 60 * 60, timeout: 5000, urgency: 'high', vapidDetails: { privateKey, publicKey, subject: subject(origin) } };
  const gone = [];
  const sent = [];
  await Promise.all(subscriptions.map(async (row) => {
    try {
      const payload = JSON.stringify({ ...message, doctor: row.doctor_phone });
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { auth: row.auth, p256dh: row.p256dh } }, payload, options);
      sent.push(row.endpoint);
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) gone.push(row.endpoint);
      else console.error('[doctor-push]', error?.statusCode || '', error?.body || error?.message || error);
    }
  }));
  if (gone.length) await getSupabaseAdmin().from('doctor_push_subscriptions').delete().in('endpoint', gone);
  return sent;
}

export async function sendToDoctors(phones, message, origin) {
  if (!phones.length) return [];
  const subscriptions = await rows(getSupabaseAdmin().from('doctor_push_subscriptions').select('endpoint, p256dh, auth, doctor_phone').in('doctor_phone', phones));
  return sendToSubscriptions(subscriptions, message, origin);
}

// Nurse-desk doctor id -> doctor logins (phone numbers) at one hospital,
// matched by name the same way the doctor desk finds her patients.
async function loginsByCareDoctor(hospitalId) {
  const hit = loginsCache.get(hospitalId);
  if (hit && Date.now() - hit.at < LOGINS_TTL_MS) return hit.map;
  const db = getSupabaseAdmin();
  const [hospitals, doctors, careDoctors] = await Promise.all([
    rows(db.from('hospitals').select('id, name').eq('id', hospitalId)),
    rows(db.from('doctors').select('phone_number, display_name, hospital_id, hospital_name').eq('is_active', true)),
    rows(db.from('care_doctors').select('id, display_name').eq('hospital_id', hospitalId).eq('is_active', true)),
  ]);
  const aliases = careDoctors.length
    ? await rows(db.from('care_doctor_aliases').select('doctor_id, alias').in('doctor_id', careDoctors.map((entry) => entry.id)))
    : [];
  const key = hospitalKey(hospitals[0]?.name);
  const map = new Map();
  for (const doctor of doctors) {
    const here = doctor.hospital_id ? doctor.hospital_id === hospitalId : Boolean(key) && hospitalKey(doctor.hospital_name) === key;
    const care = here ? matchCareDoctor(careDoctors, aliases, doctor.display_name) : null;
    if (care) map.set(care.id, [...(map.get(care.id) || []), doctor.phone_number]);
  }
  loginsCache.set(hospitalId, { at: Date.now(), map });
  return map;
}

// Whose desk a saved visit shows on, the way the doctor desk counts it:
// the visit's doctor, the plan's doctor, or with neither, every doctor
// looking after her.
async function careDoctorsFor({ careDoctorId, hospitalId, patientId, planId }) {
  const db = getSupabaseAdmin();
  const ids = new Set(careDoctorId ? [careDoctorId] : []);
  if (planId) {
    (await rows(db.from('care_plans').select('care_doctor_id').eq('id', planId))).forEach((row) => row.care_doctor_id && ids.add(row.care_doctor_id));
  }
  if (!careDoctorId && !planId) {
    const [plans, cycles] = await Promise.all([
      rows(db.from('care_plans').select('care_doctor_id').eq('hospital_id', hospitalId).eq('patient_id', patientId).eq('status', 'active')),
      rows(db.from('care_cycles').select('care_doctor_id').eq('hospital_id', hospitalId).eq('patient_id', patientId).eq('status', 'active')),
    ]);
    [...plans, ...cycles].forEach((row) => row.care_doctor_id && ids.add(row.care_doctor_id));
  }
  return [...ids];
}

async function patientName(patientId) {
  const [row] = await rows(getSupabaseAdmin().from('patients').select('name').eq('id', patientId));
  return row?.name || 'Your patient';
}

async function phonesFor(hospitalId, careDoctorIds) {
  if (!careDoctorIds.length) return [];
  const logins = await loginsByCareDoctor(hospitalId);
  return [...new Set(careDoctorIds.flatMap((id) => logins.get(id) || []))];
}

// Never lets a notification problem fail the nurse's save, and never keeps
// her waiting more than a few seconds.
async function quietly(task) {
  try {
    await Promise.race([task(), new Promise((resolve) => { setTimeout(resolve, 6000); })]);
  } catch (error) {
    console.error('[doctor-push]', error);
  }
}

export function notifyVisitSaved({ careDoctorId, hospitalId, nextDate, nurseName, origin, patientId, planId }) {
  return quietly(async () => {
    const phones = await phonesFor(hospitalId, await careDoctorsFor({ careDoctorId, hospitalId, patientId, planId }));
    if (!phones.length) return;
    const name = await patientName(patientId);
    const next = nextDate ? ` Next visit ${formatDate(nextDate, { weekday: 'short', day: 'numeric', month: 'short' })}.` : '';
    await sendToDoctors(phones, {
      body: `Seen by ${nurseName || 'the nurse'}.${next}`,
      tag: `visit-${patientId}`,
      title: name,
      url: `/patients/${patientId}`,
    }, origin);
  });
}

const PLAN_TEXT = {
  add_child: 'Baby added',
  start_cycle: 'OI-TI / IUI cycle started',
  start_pregnancy: 'Pregnancy added',
};

// A nurse started a pregnancy, a cycle or a baby's schedule. Without a
// chosen doctor, the database gave the plan to one; read it back.
export function notifyPlanStarted({ action, careDoctorId, hospitalId, nurseName, origin, patientId }) {
  return quietly(async () => {
    let ids = careDoctorId ? [careDoctorId] : [];
    if (!ids.length) {
      const db = getSupabaseAdmin();
      const table = action === 'start_cycle' ? 'care_cycles' : 'care_plans';
      const [latest] = await rows(db.from(table).select('care_doctor_id').eq('hospital_id', hospitalId).eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1));
      ids = latest?.care_doctor_id ? [latest.care_doctor_id] : [];
    }
    const phones = await phonesFor(hospitalId, ids);
    if (!phones.length) return;
    await sendToDoctors(phones, {
      body: `${PLAN_TEXT[action]} by ${nurseName || 'the nurse'}.`,
      tag: `plan-${patientId}`,
      title: `New: ${await patientName(patientId)}`,
      url: `/patients/${patientId}`,
    }, origin);
  });
}
