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

// Month of pregnancy the way families count it (weeks 0–4 = 1st month …
// 36+ = 9th month).
const MONTH_ENDS = [4, 8, 13, 17, 22, 27, 31, 35];
export function pregnancyMonth(week) {
  const index = MONTH_ENDS.findIndex((end) => week <= end);
  return index === -1 ? 9 : index + 1;
}

export function ordinal(n) {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

// "9 weeks pregnant · 3rd month"
export function pregnancyText(week) {
  const w = Math.max(0, week);
  return `${w} ${w === 1 ? 'week' : 'weeks'} pregnant · ${ordinal(pregnancyMonth(w))} month`;
}

// A cycle step's date with what the nurse changed on this page: her own
// date, else (for IUI) the linked step's date + offset, else the plan date.
function cycleStepDate(cycle, step, dates, byId, seen = new Set()) {
  const key = `cycdate:${cycle.id}:${step.id}`;
  if (key in dates && dates[key]) return dates[key];
  if (!(key in dates) && step.planned) return step.date;
  if (step.linkedStepId && !seen.has(step.id)) {
    const linked = byId.get(step.linkedStepId);
    if (linked) return addDays(cycleStepDate(cycle, linked, dates, byId, new Set([...seen, step.id])), step.linkedOffsetDays || 0);
  }
  return step.baseDate;
}

// Every visit (all schedules), every OI-TI / IUI step and every test from
// the case sheet as one list of timeline cards in date order. `changes`
// are staged ticks ("<planId>:<itemId>", "extra:<id>", "cyc:<cycleId>:<stepId>"),
// `dates` staged dates ("visit:…", "extra:<id>", "cycdate:<cycleId>:<stepId>").
export function buildTimeline({ plans, extraItems, visitDates, cycles }, changes, dates, today) {
  const saved = new Map((visitDates || []).map((entry) => [`visit:${entry.planId}:${entry.visitId}`, entry.date]));
  const cards = [];
  for (const plan of plans) {
    for (const visit of plan.visits) {
      const key = `visit:${plan.id}:${visit.id}`;
      const items = visit.items.map((item) => {
        const staged = changes[`${plan.id}:${item.id}`];
        return { ...item, status: staged === 'clear' ? null : staged ?? item.status };
      });
      const date = key in dates ? dates[key] : saved.get(key) || null;
      cards.push({
        date,
        fromDate: visit.fromDate,
        key,
        kind: 'visit',
        plan,
        sortDate: date || visit.fromDate,
        state: visitState({ items }, today),
        title: visit.titleEn,
        toDate: visit.toDate,
        visit,
      });
    }
  }
  for (const item of extraItems || []) {
    const key = `extra:${item.id}`;
    const staged = changes[key];
    const status = staged === 'clear' ? null : staged ?? item.status;
    const date = key in dates ? dates[key] : item.dueDate;
    const closed = status === 'done' || status === 'not_needed';
    cards.push({
      date,
      item,
      key,
      kind: 'extra',
      sortDate: date,
      state: closed ? 'done' : date < today ? 'pending' : date === today ? 'due_now' : 'upcoming',
      title: item.label,
    });
  }
  for (const cycle of cycles || []) {
    const byId = new Map(cycle.steps.map((step) => [step.id, step]));
    const byDate = new Map();
    for (const step of cycle.steps) {
      const staged = changes[`cyc:${cycle.id}:${step.id}`];
      const status = staged === 'clear' ? null : staged ?? step.status;
      const date = cycleStepDate(cycle, step, dates, byId);
      const list = byDate.get(date) || [];
      list.push({ ...step, date, status, savedStatus: step.status });
      byDate.set(date, list);
    }
    for (const [date, steps] of byDate) {
      const closed = steps.every((step) => step.status === 'done' || step.status === 'not_needed');
      const day = cycleDay(cycle.anchorDate, date);
      cards.push({
        cycle,
        date,
        day,
        key: `cycle:${cycle.id}:${steps[0].id}`,
        kind: 'cycle',
        sortDate: date,
        state: closed ? 'done' : date < today ? 'pending' : date === today ? 'due_now' : 'upcoming',
        steps,
        title: steps.length === 1 ? steps[0].labelEn : `Day ${day} tests`,
      });
    }
  }
  const ORDER = { cycle: 1, extra: 2, visit: 0 };
  cards.sort((a, b) => (a.sortDate === b.sortDate ? ORDER[a.kind] - ORDER[b.kind] : a.sortDate < b.sortDate ? -1 : 1));
  // The next visit: a schedule visit or cycle step due now, else the first
  // one ahead. Its date is the next-visit date the patient sees in the app.
  const visits = cards.filter((card) => card.kind === 'visit' || card.kind === 'cycle');
  const next = visits.find((card) => card.state === 'due_now') || visits.find((card) => card.state === 'upcoming') || null;
  return { cards, nextKey: next?.key || null };
}

// OI-TI / IUI: Day 1 = first day of her period; a step on day N is on
// Day 1 + (N - 1). Key dates shown before the cycle is started.
export const CYCLE_PREVIEW = [
  { day: 2, label: 'Baseline tests' },
  { day: 13, label: 'Trigger injection' },
  { day: 14, label: 'IUI / timed intercourse' },
  { day: 31, label: 'Pregnancy test' },
];

export function cycleDay(anchorDate, date) {
  return daysBetween(anchorDate, date) + 1;
}

export const WHO_LABEL = { couple: 'Both', husband: 'Husband', wife: 'Wife' };
