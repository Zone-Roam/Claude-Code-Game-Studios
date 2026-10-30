// progress-save: star rules per mode, reason line, best record (GDD rules 1-7, Formulas, ACs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, computeStars, STAR_PRESS_T3, STAR_PRESS_T2 } from '../../../src/rules/progress-save.mjs';
import { fakeStorage, roundResult, saveText, TEST_CHAPTERS } from '../../helpers/progress-save-fakes.mjs';

function booted(initial, chapters) {
  const st = fakeStorage(initial);
  const progress = createProgress({ storage: st.port, chapters: chapters || TEST_CHAPTERS, now: () => 5 });
  progress.boot();
  return { st, progress };
}

const boss = (heartsLost, over) => roundResult(Object.assign({ chapterId: 'ch01', mode: 'boss', metrics: { heartsLost } }, over));
const press = (dangerMs) => roundResult({ chapterId: 'ch02', mode: 'press', metrics: { dangerMs } });
const food = (misses, foodLeft) => roundResult({ chapterId: 'ch03', mode: 'food', metrics: { misses, foodLeft } });

test('AC boss win heartsLost 0 → 3 stars, reasonLine null', () => {
  const { progress } = booted();
  const out = progress.settle(boss(0));
  assert.equal(out.stars, 3);
  assert.equal(out.reasonLine, null);
});

test('AC boss win heartsLost 1 → 2 stars, "丢了 1 颗心"', () => {
  const { progress } = booted();
  const out = progress.settle(boss(1));
  assert.equal(out.stars, 2);
  assert.equal(out.reasonLine, '丢了 1 颗心');
});

test('AC boss win heartsLost 2 → 1 star', () => {
  const { progress } = booted();
  assert.equal(progress.settle(boss(2)).stars, 1);
});

test('AC boss chapter with 4 hearts, heartsLost 3 → 1 star, no assertion', () => {
  const warnings = [];
  const st = fakeStorage();
  const progress = createProgress({ storage: st.port, chapters: [{ id: 'ch01', mode: 'boss', hearts: 4 }], warn: (m) => warnings.push(m) });
  progress.boot();
  assert.equal(progress.settle(boss(3)).stars, 1);
  assert.deepEqual(warnings, []);
});

test('AC boss net hearts: hit twice, Liu Bei healed one (heartsLost 1) → 2 stars, "丢了 1 颗心"', () => {
  const { progress } = booted();
  const out = progress.settle(boss(1));
  assert.deepEqual([out.stars, out.reasonLine], [2, '丢了 1 颗心']);
});

test('AC press dangerMs 2000 → 3, 2001 → 2, 8000 → 2, 8001 → 1 (inclusive thresholds)', () => {
  const ch = { mode: 'press' };
  const stars = [STAR_PRESS_T3, STAR_PRESS_T3 + 1, STAR_PRESS_T2, STAR_PRESS_T2 + 1]
    .map((d) => computeStars({ win: true, mode: 'press', metrics: { dangerMs: d } }, ch).stars);
  assert.deepEqual(stars, [3, 2, 2, 1]);
});

test('AC press reasonLine rounds seconds up: 5201 → "压线 5.3 秒", 2001 → "压线 2.1 秒"', () => {
  const { progress } = booted();
  assert.equal(progress.settle(Object.assign(press(5201), { attempt: 1 })).reasonLine, '压线 5.3 秒');
  assert.equal(progress.settle(Object.assign(press(2001), { attempt: 2 })).reasonLine, '压线 2.1 秒');
});

test('AC food misses 0, foodLeft 2 → 3 stars', () => {
  const { progress } = booted();
  assert.equal(progress.settle(food(0, 2)).stars, 3);
});

test('AC food misses 0, foodLeft 1 → 2 stars, "余粮只剩 1 份"', () => {
  const { progress } = booted();
  const out = progress.settle(food(0, 1));
  assert.deepEqual([out.stars, out.reasonLine], [2, '余粮只剩 1 份']);
});

test('AC food misses 2, foodLeft 5 → 2 stars "连不上 2 次"; misses 3 → 1 star', () => {
  const { progress } = booted();
  const two = progress.settle(Object.assign(food(2, 5), { attempt: 1 }));
  const three = progress.settle(Object.assign(food(3, 5), { attempt: 2 }));
  assert.deepEqual([two.stars, two.reasonLine, three.stars], [2, '连不上 2 次', 1]);
});

test('AC any mode loss → 0 stars, best kept, plays + 1, wins unchanged', () => {
  for (const ch of TEST_CHAPTERS) {
    const initial = { 'pslk.save': saveText({ [ch.id]: { stars: 2, wins: 1, plays: 1 } }) };
    const { progress } = booted(initial);
    const out = progress.settle(roundResult({ chapterId: ch.id, mode: ch.mode, win: false }));
    assert.equal(out.stars, 0, ch.mode);
    assert.equal(out.bestStars, 2, ch.mode);
    assert.deepEqual(progress.record(ch.id), { stars: 2, wins: 1, plays: 2, loadout: ['guan_yu'] }, ch.mode);
  }
});

test('AC ch01 best 2 stars, win with 1 star → bestStars 2, isNewBest false, wins + 1', () => {
  const { progress } = booted({ 'pslk.save': saveText({ ch01: { stars: 2, wins: 1, plays: 1 } }) });
  const out = progress.settle(boss(2));
  assert.deepEqual([out.stars, out.bestStars, out.isNewBest], [1, 2, false]);
  assert.equal(progress.record('ch01').wins, 2);
});

test('new best: 3 stars over a stored 2 → isNewBest true', () => {
  const { progress } = booted({ 'pslk.save': saveText({ ch01: { stars: 2, wins: 1, plays: 1 } }) });
  const out = progress.settle(boss(0));
  assert.deepEqual([out.bestStars, out.isNewBest], [3, true]);
});

test('AC boss override stars {t3: 1, t2: 2}, heartsLost 1 → 3 stars', () => {
  const chapters = [{ id: 'ch01', mode: 'boss', stars: { t3: 1, t2: 2 } }];
  const { progress } = booted(undefined, chapters);
  assert.equal(progress.settle(boss(1)).stars, 3);
});

test('rule 3: a bad override (t3 > t2) falls back to the defaults', () => {
  assert.equal(computeStars({ win: true, mode: 'boss', metrics: { heartsLost: 1 } }, { mode: 'boss', stars: { t3: 3, t2: 1 } }).stars, 2);
});
