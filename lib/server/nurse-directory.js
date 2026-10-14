import { callCare } from './nurse-api';

// One hospital's patient list, kept in this server's memory for a short
// while so several nurses opening the desk cost one database query.
// Rows are compact arrays: [id, name, mobile (10 digits), hospital ID, last seen].
const TTL_MS = 2 * 60 * 1000;
const MIN_REFRESH_MS = 20 * 1000;
const cache = new Map();

export async function getDirectory(nurse, { fresh = false } = {}) {
  const hit = cache.get(nurse.hospitalId);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && (age < (fresh ? MIN_REFRESH_MS : TTL_MS))) return hit;

  const list = await callCare('care_nurse_directory', { p_nurse_id: nurse.id, p_limit: 3000 });
  const rows = (Array.isArray(list) ? list : []).map((patient) => [
    patient.id,
    patient.name || '',
    String(patient.mobile || '').replace(/^\+91/, ''),
    patient.hospitalPatientId || '',
    String(patient.lastSeen || '').slice(0, 10),
  ]);
  const entry = { at: Date.now(), rows };
  cache.set(nurse.hospitalId, entry);
  return entry;
}

// After a nurse adds a patient, the next list read goes to the database.
export function forgetDirectory(hospitalId) {
  cache.delete(hospitalId);
}
