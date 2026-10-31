// Start screen in front of the catalog (2026-10-31, user request): the screen
// controller begins on 'title' when asked to, and start() moves on to the catalog.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScreens } from '../../../src/app/screens.mjs';

const CHAPTERS = [{ id: 'ch01' }, { id: 'ch02' }];

function screens(options) {
  const made = [];
  const s = createScreens(Object.assign({ chapters: CHAPTERS, salt: 7, newRound: (o) => { made.push(o); return { slots: () => [] }; } }, options));
  return { s, made };
}

test('title: with title true the controller starts on title; start() goes to the catalog', () => {
  const { s, made } = screens({ title: true });
  assert.equal(s.screen(), 'title');
  assert.equal(s.round(), null);
  s.start();
  assert.equal(s.screen(), 'catalog');
  assert.equal(made.length, 0);
});

test('title: start() anywhere but the title screen changes nothing', () => {
  const { s } = screens({ title: true });
  s.start();
  s.open('ch01');
  s.start();
  assert.equal(s.screen(), 'round');
});

test('title: without the option the controller starts on the catalog, as before', () => {
  assert.equal(screens({}).s.screen(), 'catalog');
});

test('title: no loadable chapters shows the error page, not the title', () => {
  const s = createScreens({ chapters: [], salt: 7, newRound: () => null, title: true });
  assert.equal(s.screen(), 'error');
});
