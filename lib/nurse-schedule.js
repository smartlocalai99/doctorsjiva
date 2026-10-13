// Same rules as the patient app (src/lib/careSchedule.ts in drjiva-app).
// Dates are 'YYYY-MM-DD' strings in India time, so plain string
// comparison orders them correctly.

export function itemState(item, today) {
  if (item.status === 'done') return 'done';
  if (item.status === 'not_needed') return 'not_needed';
  if (today < item.fromDate) return 'upcoming';
  if (today <= item.toDate) return 'due_now';
  return item.conditional ? 'optional' : 'pending';
}

export function visitState(visit, today) {
  const states = visit.items.map((item) => itemState(item, today));
  const required = visit.items
    .map((item, index) => ({ item, state: states[index] }))
    .filter(({ item }) => !item.conditional)
    .map(({ state }) => state);
  const closed = (state) => state === 'done' || state === 'not_needed';
  if (required.length > 0 && required.every(closed)) return 'done';
  if (required.length === 0 && states.some(closed)) return 'done';
  if (states.includes('due_now')) return 'due_now';
  if (states.includes('pending')) return 'pending';
  if (states.includes('upcoming')) return 'upcoming';
  return 'optional';
}

function toUtc(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

export function addDays(date, days) {
  const value = new Date(toUtc(date) + days * 86400000);
  return value.toISOString().slice(0, 10);
}

export function addMonths(date, months) {
  const [y, m, d] = date.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(d, lastDay));
  return value.toISOString().slice(0, 10);
}

export function pregnancyWeek(plan, today) {
  return Math.floor(daysBetween(plan.startDate, today) / 7);
}

export function trimester(week) {
  if (week < 14) return 1;
  if (week < 28) return 2;
  return 3;
}

export function childAge(birthDate, today) {
  const days = daysBetween(birthDate, today);
  if (days < 0) return 'not born yet';
  if (days < 98) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week old' : `${weeks} weeks old`;
  }
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  if (months < 24) return `${months} months old`;
  return `${Math.floor(months / 12)} years old`;
}

// Items for the nurse's checklist, grouped the way she works.
export function checklistGroups(plan, today) {
  const dueNow = [];
  const pending = [];
  for (const visit of plan.visits) {
    for (const item of visit.items) {
      const state = itemState(item, today);
      if (state === 'due_now') dueNow.push({ item, visit });
      if (state === 'pending') pending.push({ item, visit });
    }
  }
  return { dueNow, pending };
}

// First visit that starts after today and is not finished.
export function nextScheduledVisit(plan, today) {
  return plan.visits
    .filter((visit) => visit.fromDate > today && visitState(visit, today) !== 'done')
    .sort((a, b) => (a.fromDate < b.fromDate ? -1 : 1))[0] || null;
}

export function formatDate(date, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' }).format(new Date(toUtc(date)));
}

export function formatMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : mobile;
}

export const DEPARTMENT_LABEL = {
  gynecology: 'Gynecology',
  pediatrics: 'Pediatrics',
  general: 'General',
};
