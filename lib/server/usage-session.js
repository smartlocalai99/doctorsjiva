import { createHmac, timingSafeEqual } from 'node:crypto';

// The owner's login for the usage page: its own cookie and signing key, so
// a doctor or nurse cookie can never open it.
const COOKIE_NAME = 'drjiva_usage_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function signingKey() {
  const base = process.env.USAGE_SESSION_SECRET || process.env.DOCTOR_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!base) throw new Error('Usage sessions are not configured.');
  return createHmac('sha256', base).update('drjiva-usage-session-v1').digest();
}

function sign(value) {
  return createHmac('sha256', signingKey()).update(value).digest('base64url');
}

function readCookie(request) {
  const header = request.headers.cookie || '';
  const item = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : '';
}

export function createUsageSession(response, admin) {
  const payload = Buffer.from(JSON.stringify({
    admin: { name: admin.name, phone: admin.phone },
    expiresAt: Date.now() + MAX_AGE * 1000,
  })).toString('base64url');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(`${payload}.${sign(payload)}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
}

export function clearUsageSession(response) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function getUsageSession(request) {
  const [payload, signature] = readCookie(request).split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.expiresAt > Date.now() && session.admin?.phone ? session : null;
  } catch {
    return null;
  }
}
