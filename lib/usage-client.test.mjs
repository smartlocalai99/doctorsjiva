import assert from 'node:assert/strict';
import test from 'node:test';
import { createUsageTracker, screenName, usageApp } from './usage-client.js';

function setup() {
  let time = 1_000_000;
  const sent = [];
  const tracker = createUsageTracker({ now: () => time, send: (body, leaving) => sent.push({ ...body, leaving }) });
  return { advance: (seconds) => { time += seconds * 1000; }, sent, tracker };
}

test('screens are named per app and /usage is not counted', () => {
  assert.equal(usageApp('/nurse/patient/[id]'), 'nurse');
  assert.equal(usageApp('/patients/[id]'), 'doctor');
  assert.equal(usageApp('/usage'), null);
  assert.equal(screenName('doctor', '/patients/[id]'), 'Patient page');
  assert.equal(screenName('nurse', '/nurse'), 'Today');
});

test('seconds go to the screen that was on screen', () => {
  const { advance, sent, tracker } = setup();
  tracker.show('/');
  advance(20);
  tracker.show('/calendar');
  advance(10);
  tracker.beat();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].screens, [
    { screen: 'Today', seconds: 20, views: 1 },
    { screen: 'Calendar', seconds: 10, views: 1 },
  ]);
  assert.equal(sent[0].app, 'doctor');
});

test('time in the background is not counted, and a long break is a new open', () => {
  const { advance, sent, tracker } = setup();
  tracker.show('/nurse');
  advance(15);
  tracker.hide();
  assert.equal(sent.at(-1).leaving, true);
  assert.equal(sent.at(-1).screens[0].seconds, 15);
  const firstSession = sent.at(-1).session;
  advance(45 * 60);
  tracker.reveal();
  advance(5);
  tracker.beat();
  assert.deepEqual(sent.at(-1).screens, [{ screen: 'Today', seconds: 5, views: 1 }]);
  assert.notEqual(sent.at(-1).session, firstSession);
});

test('a short break keeps the same open', () => {
  const { advance, sent, tracker } = setup();
  tracker.show('/');
  advance(5);
  tracker.hide();
  advance(60);
  tracker.reveal();
  advance(5);
  tracker.beat();
  assert.equal(sent[0].session, sent[1].session);
  assert.deepEqual(sent[1].screens, [{ screen: 'Today', seconds: 5, views: 0 }]);
});

test('moving from the doctor app to the nurse desk starts a nurse open', () => {
  const { advance, sent, tracker } = setup();
  tracker.show('/login');
  advance(8);
  tracker.show('/nurse');
  assert.equal(sent[0].app, 'doctor');
  advance(4);
  tracker.beat();
  assert.equal(sent[1].app, 'nurse');
  assert.notEqual(sent[0].session, sent[1].session);
});

test('nothing is sent while nothing happened', () => {
  const { sent, tracker } = setup();
  tracker.beat();
  tracker.show('/usage');
  tracker.beat();
  assert.equal(sent.length, 0);
});
