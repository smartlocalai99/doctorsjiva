import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'drjiva_doctor_session';
// A year, renewed every time the app opens (see renewDoctorSession), so a
// doctor who uses the app logs in once on each phone. Browsers cap cookies
// at 400 days.
const MAX_AGE = 60 * 60 * 24 * 365;
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

function secret() {
  return process.env.DOCTOR_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || 'drjiva-ritish-test-session-change-before-production';
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function readCookie(request) {
  const header = request.headers.cookie || '';
  const item = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : '';
}

export function createDoctorSession(response, doctor) {
  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({ doctor, expiresAt: issuedAt + MAX_AGE * 1000, issuedAt })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
  return { doctor, expiresAt: issuedAt + MAX_AGE * 1000 };
}

// A fresh year from today, at most once a day.
export function renewDoctorSession(response, session) {
  if (session.issuedAt && Date.now() - session.issuedAt < RENEW_AFTER_MS) return session;
  return createDoctorSession(response, session.doctor);
}

export function clearDoctorSession(response) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function getDoctorSession(request) {
  const token = readCookie(request);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}
