import { createHmac, timingSafeEqual } from 'node:crypto';

// Separate from the doctor session: its own cookie and its own signing
// key (derived from the server secret), so a doctor cookie can never be
// used as a nurse cookie or the other way round.
const COOKIE_NAME = 'drjiva_nurse_session';
const MAX_AGE = 60 * 60 * 24 * 7;

function signingKey() {
  const base = process.env.NURSE_SESSION_SECRET || process.env.DOCTOR_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!base) throw new Error('Nurse sessions are not configured.');
  return createHmac('sha256', base).update('drjiva-nurse-session-v1').digest();
}

function sign(value) {
  return createHmac('sha256', signingKey()).update(value).digest('base64url');
}

function readCookie(request) {
  const header = request.headers.cookie || '';
  const item = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : '';
}

export function createNurseSession(response, nurse) {
  const payload = Buffer.from(JSON.stringify({
    nurse: {
      id: nurse.id,
      name: nurse.name,
      hospitalId: nurse.hospitalId,
      hospitalName: nurse.hospitalName,
    },
    expiresAt: Date.now() + MAX_AGE * 1000,
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
}

export function clearNurseSession(response) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function getNurseSession(request) {
  const token = readCookie(request);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.expiresAt > Date.now() && session.nurse?.id ? session : null;
  } catch {
    return null;
  }
}
