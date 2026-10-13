import { callCare } from '@/lib/server/nurse-api';
import { createNurseSession } from '@/lib/server/nurse-session';

function lockedMessage(lockedUntil) {
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(lockedUntil));
  return `Too many wrong PINs. Try again after ${time}.`;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }
  const mobile = String(request.body?.mobile || '').replace(/\D/g, '').slice(-10);
  const pin = String(request.body?.pin || '');
  if (mobile.length !== 10 || !/^\d{4}$/.test(pin)) {
    return response.status(400).json({ error: 'Enter your 10-digit mobile number and 4-digit PIN.' });
  }
  try {
    const result = await callCare('care_nurse_login', { p_mobile: mobile, p_pin: pin });
    if (result?.ok && result.nurse) {
      createNurseSession(response, result.nurse);
      return response.status(200).json({ nurse: result.nurse });
    }
    if (result?.lockedUntil) return response.status(429).json({ error: lockedMessage(result.lockedUntil) });
    return response.status(401).json({ error: 'Mobile number or PIN is wrong.' });
  } catch (error) {
    console.error('[nurse-login]', error);
    return response.status(500).json({ error: 'Login is not working right now. Try again in a minute.' });
  }
}
