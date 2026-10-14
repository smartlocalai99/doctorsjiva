// The hospital's patient list in the browser: compact rows from
// /api/nurse/patients become objects, and search suggestions are ranked
// here, so typing never calls the server.

export function toPatients(rows) {
  return (rows || []).map(([id, name, mobile, hospitalId, lastSeen, doctors]) => ({
    doctorIds: Array.isArray(doctors) ? doctors : doctors ? [doctors] : [],
    hospitalId,
    id,
    idKey: String(hospitalId || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    lastSeen,
    mobile,
    name,
    nameKey: String(name || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim(),
  }));
}

// Best matches first, most recently seen first within a rank.
// limit 0 = every match.
export function searchPatients(patients, query, limit = 6) {
  const q = String(query || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (q.length < 2) return [];
  const compact = q.replace(/[\s()+-]/g, '');
  const digits = /^\d+$/.test(compact) ? compact.replace(/^91(?=\d{10}$)/, '') : '';
  const words = q.split(' ');
  const idKey = q.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const found = [];
  patients.forEach((patient, index) => {
    let rank = 0;
    if (digits.length >= 3) {
      if (patient.mobile.startsWith(digits)) rank = 3;
      else if (patient.mobile.includes(digits)) rank = 2;
    } else if (words.every((word) => patient.nameKey.includes(word))) {
      const nameWords = patient.nameKey.split(' ');
      if (patient.nameKey.startsWith(q)) rank = 4;
      else if (words.every((word) => nameWords.some((part) => part.startsWith(word)))) rank = 3;
      else rank = 1;
    }
    if (!rank && idKey.length >= 2 && patient.idKey && patient.idKey.includes(idKey)) rank = patient.idKey === idKey ? 4 : 2;
    if (rank) found.push({ index, patient, rank });
  });
  found.sort((a, b) => b.rank - a.rank || a.index - b.index);
  return (limit ? found.slice(0, limit) : found).map((entry) => entry.patient);
}

export function initials(name) {
  const parts = String(name || '').replace(/[^A-Za-z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isPatientOf(patient, doctorId) {
  return Boolean(doctorId) && patient.doctorIds.includes(doctorId);
}

// Patients of one doctor (the nurse's desk doctor), newest first.
export function patientsOfDoctor(patients, doctorId) {
  return doctorId ? patients.filter((patient) => isPatientOf(patient, doctorId)) : patients;
}
