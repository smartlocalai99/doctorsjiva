import { clearNurseSession, getNurseSession } from './nurse-session';
import { getSupabaseAdmin } from './supabase-admin';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Database error codes (raised by the care_nurse_* functions) → plain words.
const MESSAGES = {
  patient_not_at_hospital: 'This patient is not registered at your hospital.',
  invalid_mobile: 'Enter a valid 10-digit mobile number.',
  invalid_name: 'Enter a name with 2 to 80 letters.',
  invalid_hospital_id: 'Hospital ID can have at most 40 letters.',
  hospital_id_taken: 'That hospital ID is already used for another patient.',
  lmp_or_edd_required: 'Enter the LMP date or the due date (EDD).',
  invalid_lmp: 'LMP must be within the last 43 weeks and not in the future.',
  invalid_edd: 'That due date does not look right. Check the date.',
  pregnancy_exists: 'This patient already has an active pregnancy schedule.',
  invalid_birth_date: 'Birth date cannot be in the future or more than 18 years ago.',
  invalid_gender: 'Choose girl or boy, or leave it empty.',
  unknown_doctor: 'Choose a doctor from your hospital list.',
  invalid_doctor: 'Doctor name can have at most 80 letters.',
  invalid_outcome: 'Choose how the schedule ended.',
  invalid_date: 'Choose a date that is not in the future.',
  invalid_next_date: 'Next visit must be today or later, within about a year.',
  note_too_long: 'Keep the note under 300 letters.',
  unknown_plan: 'That schedule was not found. Refresh the page and try again.',
  unknown_item: 'A checklist item was not found. Refresh the page and try again.',
  invalid_items: 'The checklist could not be read. Refresh the page and try again.',
  invalid_item_status: 'The checklist could not be read. Refresh the page and try again.',
};

export async function callCare(fn, args) {
  const { data, error } = await getSupabaseAdmin().rpc(fn, args);
  if (error) throw error;
  return data;
}

export function sendCareError(response, error) {
  const code = error?.message;
  if (code === 'nurse_inactive') {
    clearNurseSession(response);
    return response.status(401).json({ error: 'Your nurse login is switched off. Ask your admin.', code });
  }
  if (MESSAGES[code]) return response.status(400).json({ error: MESSAGES[code], code });
  console.error('[nurse-api]', error);
  return response.status(500).json({ error: 'Something went wrong. Please try again.' });
}

// Wraps a nurse API route: no caching, a signed nurse cookie, JSON-only
// POSTs (blocks cross-site form posts), and plain-word errors.
export function nurseRoute(methods, handler) {
  return async function route(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (!methods.includes(request.method)) {
      response.setHeader('Allow', methods.join(', '));
      return response.status(405).json({ error: 'Method not allowed.' });
    }
    if (request.method !== 'GET' && !String(request.headers['content-type'] || '').includes('application/json')) {
      return response.status(415).json({ error: 'Send JSON.' });
    }
    const session = getNurseSession(request);
    if (!session) return response.status(401).json({ error: 'Please log in again.' });
    try {
      return await handler(request, response, session.nurse);
    } catch (error) {
      return sendCareError(response, error);
    }
  };
}

export function text(value, max = 300) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function uuidOrNull(value) {
  return UUID_PATTERN.test(String(value || '')) ? String(value) : null;
}

export function dateOrNull(value) {
  return DATE_PATTERN.test(String(value || '')) ? String(value) : null;
}
