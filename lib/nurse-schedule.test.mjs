import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, buildTimeline, suggestedNextDate } from './nurse-schedule.js';

const today = '2026-10-15';
const visit = (id, fromDate, toDate = fromDate, status = null) => ({
  id, fromDate, toDate, titleEn: id,
  items: [{ id: `${id}-item`, fromDate, toDate, status, conditional: false }],
});
function timeline(visits, visitDates = [], changes = {}, dates = {}) {
  return buildTimeline({ plans: [{ id: 'plan', type: 'pregnancy', visits }], visitDates }, changes, dates, today);
}
const next = (result) => result.cards.find((card) => card.key === result.nextKey);

test('partly completed NT group is titled with the remaining TD dose', () => {
  const grouped = visit('NT scan', '2026-08-24');
  grouped.items = [
    { ...grouped.items[0], id: 'nt', labelEn: 'NT scan', status: 'done' },
    { ...grouped.items[0], id: 'marker', labelEn: 'Double marker', status: 'done' },
    { ...grouped.items[0], id: 'td2', labelEn: 'TD vaccine – 2nd dose' },
  ];
  const result = timeline([grouped], [{ planId: 'plan', visitId: 'NT scan', date: '2026-11-04' }]);
  assert.equal(next(result).title, 'TD vaccine – 2nd dose');
  assert.equal(suggestedNextDate(result.cards, next(result), today), '2026-11-04');
});

test('a future appointment on a previously missed visit becomes the next card', () => {
  const result = timeline([
    visit('rescheduled', '2026-08-24'), visit('later', '2026-11-23'),
  ], [{ planId: 'plan', visitId: 'rescheduled', date: '2026-11-04' }]);
  assert.equal(next(result).visit.id, 'rescheduled');
  assert.equal(suggestedNextDate(result.cards, next(result), today), '2026-11-04');
});

test('an unfinished schedule supplies a date when no appointment was entered', () => {
  const result = timeline([visit('later', '2026-11-23')]);
  assert.equal(suggestedNextDate(result.cards, next(result), today), '2026-11-23');
  assert.equal(next(result).date, null);
});

test('a saved follow-up takes priority over an inferred schedule date', () => {
  const result = timeline([visit('later', '2026-11-23')]);
  assert.equal(suggestedNextDate(result.cards, next(result), today, '2026-11-02'), '2026-11-02');
});

test('a nurse-entered date wins even when another unmarked test is due today', () => {
  const visits = [visit('current', '2026-10-01', '2026-10-21'), visit('other', today)];
  const result = timeline(visits, [], {}, { 'visit:plan:current': '2026-11-04' });
  assert.equal(next(result).visit.id, 'current');
  assert.equal(suggestedNextDate(result.cards, next(result), today), '2026-11-04');
  assert.ok(result.cards.every((card) => card.visit.items.every((item) => item.status === null)));
  assert.equal(result.cards.find((card) => card.visit.id === 'current').state, 'upcoming');
});

test('the earliest booked unfinished visit wins over earlier automatic schedule dates', () => {
  const result = timeline([
    visit('automatic', '2026-10-16'), visit('booked-later', '2026-08-24'), visit('booked-first', '2026-09-01'),
  ], [
    { planId: 'plan', visitId: 'booked-later', date: '2026-11-10' },
    { planId: 'plan', visitId: 'booked-first', date: '2026-11-04' },
  ]);
  assert.equal(next(result).visit.id, 'booked-first');
  assert.equal(suggestedNextDate(result.cards, next(result), today), '2026-11-04');
});

test('marking a booked visit done or not needed selects the next booked unfinished visit', () => {
  for (const status of ['done', 'not_needed']) {
    const result = timeline([visit('first', '2026-08-24'), visit('second', '2026-09-01')], [
      { planId: 'plan', visitId: 'first', date: '2026-11-04' },
      { planId: 'plan', visitId: 'second', date: '2026-11-10' },
    ], { 'plan:first-item': status });
    assert.equal(next(result).visit.id, 'second');
  }
});

test('completed and not-needed visits never become next even with future dates', () => {
  for (const status of ['done', 'not_needed']) {
    const result = timeline([visit('closed', '2026-08-24', '2026-08-24', status)],
      [{ planId: 'plan', visitId: 'closed', date: '2026-11-04' }]);
    assert.equal(result.nextKey, null);
    assert.equal(suggestedNextDate(result.cards, next(result), today), '');
  }
});

test('staged completion advances to the following appointment', () => {
  const result = timeline([visit('first', today), visit('later', '2026-11-23')], [],
    { 'plan:first-item': 'done' });
  assert.equal(next(result).visit.id, 'later');
});

test('clearing an override restores the original schedule state', () => {
  const result = timeline([visit('old', '2026-08-24'), visit('later', '2026-11-23')],
    [{ planId: 'plan', visitId: 'old', date: '2026-11-04' }], {}, { 'visit:plan:old': null });
  assert.equal(next(result).visit.id, 'later');
});

test('past follow-ups, completed dates and case-sheet extras are not suggested', () => {
  assert.equal(suggestedNextDate([
    { kind: 'extra', date: '2026-11-01', state: 'upcoming' },
    { kind: 'visit', date: '2026-11-02', state: 'done' },
  ], null, today, '2026-10-01'), '');
});

test('child dates beyond the save API limit are not suggested', () => {
  const card = { kind: 'visit', date: addDays(today, 401), state: 'upcoming' };
  assert.equal(suggestedNextDate([card], card, today), '');
  card.date = addDays(today, 400);
  assert.equal(suggestedNextDate([card], card, today), card.date);
});

test('cycle step dates and linked IUI dates retain their existing behavior', () => {
  const result = buildTimeline({ plans: [], cycles: [{ id: 'cycle', anchorDate: today, steps: [
    { id: 'trigger', baseDate: '2026-10-27', labelEn: 'Trigger' },
    { id: 'iui', baseDate: '2026-10-28', labelEn: 'IUI', linkedStepId: 'trigger', linkedOffsetDays: 1 },
  ] }] }, {}, { 'cycdate:cycle:trigger': '2026-10-29' }, today);
  assert.deepEqual(result.cards.map((card) => card.date), ['2026-10-29', '2026-10-30']);
  assert.equal(suggestedNextDate(result.cards, next(result), today), '2026-10-29');
});
