// battle-pressure press mode, food mode and Liu Bei's hooks
// (design/gdd/battle-pressure.md Acceptance Criteria). Test names start with "AC …".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPressure, foodStart } from '../../../src/rules/battle-pressure.mjs';
import { boardFromPicture, dealtBoard, pairedDeck } from '../../helpers/board-fixtures.mjs';
import { bossRig, luBuChapter, oneBarChapter, misses, forceAttack, kindCounts, OPEN_PICTURE } from '../../helpers/battle-pressure-fakes.mjs';

const FIXTURE_INTERVAL = 7000; // GDD test fixture, not a chapter value
const row = (s) => s;
const emptyRows = (n, cols) => Array.from({ length: n }, () => new Array(cols).fill('.').join(' '));

function rig(chapter, board, slow) {
  const events = [];
  const ctx = { chapter, board, constants: {}, slow, emit: (e) => events.push(e), acquire() {}, release() {} };
  const pressure = createPressure(ctx);
  return { pressure, board, events, of: (type) => events.filter((e) => e.type === type) };
}

function pressChapter(press, deck) {
  return { id: 'test-press', mode: 'press', deck: deck || pairedDeck(24, 6),
    press: Object.assign({ startRows: 4, waves: 8, interval: FIXTURE_INTERVAL }, press) };
}

// 8 rows; `lines` maps row number -> row text, other rows empty.
function pressBoard(cols, lines) {
  const pic = emptyRows(8, cols);
  for (const r of Object.keys(lines)) pic[r - 1] = lines[r];
  return boardFromPicture(pic);
}

function tickFor(pressure, ms, step) {
  const dt = step || 10;
  for (let t = 0; t < ms; t += dt) pressure.tick(dt);
}

function clearUnits(board) {
  for (const c of board.cells()) if (c.top !== null && c.top !== 'jm') board.set(c.r, c.c, null);
}

// ---- press ----

test('AC press breach: startRows 4, interval 7000, no input, dt 10 ms to 35000 ms -> 5th push time finds the bottom row occupied, outcome 破城', () => {
  const board = dealtBoard({ seed: 3, cols: 6, rows: 8, deck: pairedDeck(24, 6), mode: 'press', startRows: 4 });
  const r = rig(pressChapter(), board);
  tickFor(r.pressure, 34990);
  assert.equal(r.of('push').length, 4);
  assert.deepEqual(r.pressure.outcome(), { result: null, reason: null });
  r.pressure.tick(10);
  assert.equal(r.of('push').length, 4);
  assert.deepEqual(r.pressure.outcome(), { result: 'lose', reason: '破城' });
});

test('AC press push: bottom row empty, at the push time the board moves down, row 1 is the next wave row, kinds stay even, wave + 1, nextPush = now + 7000', () => {
  const board = dealtBoard({ seed: 3, cols: 6, rows: 8, deck: pairedDeck(24, 6), mode: 'press', startRows: 4 });
  const r = rig(pressChapter(), board);
  const before = board.cells().filter((c) => c.r === 1).map((c) => c.top);
  tickFor(r.pressure, 6990);
  assert.equal(r.of('push').length, 0);
  r.pressure.tick(10);
  const table = r.pressure.waveTable();
  assert.deepEqual(board.cells().filter((c) => c.r === 1).map((c) => c.top), table[0]);
  assert.deepEqual(board.cells().filter((c) => c.r === 2).map((c) => c.top), before);
  assert.equal(table[0].filter((v) => v !== null).length, 6);
  for (const n of Object.values(kindCounts(board))) assert.equal(n % 2, 0);
  assert.equal(r.pressure.hud().wave, 1);
  assert.equal(r.pressure.hud().msToNextPush, FIXTURE_INTERVAL);
});

test('AC press wave table: same seed with 0 and 2 shuffles gives the same table', () => {
  const make = (shuffles) => {
    const board = dealtBoard({ seed: 9, cols: 6, rows: 8, deck: pairedDeck(24, 6), mode: 'press', startRows: 4 });
    for (let i = 0; i < shuffles; i++) board.rng('shuffle').shuffle([1, 2, 3, 4, 5]);
    return rig(pressChapter(), board).pressure.waveTable();
  };
  assert.deepEqual(make(2), make(0));
});

test('AC press 5 columns without waveList: each row is 2 pairs and 1 empty cell, no roadblock, same seed same table', () => {
  const make = () => rig(pressChapter({}, pairedDeck(20, 5)), dealtBoard({ seed: 4, cols: 5, rows: 8, deck: pairedDeck(20, 5), mode: 'press', startRows: 4 })).pressure.waveTable();
  const table = make();
  assert.equal(table.length, 8);
  for (const line of table) {
    assert.equal(line.length, 5);
    assert.equal(line.filter((v) => v === null).length, 1);
    assert.equal(line.indexOf('jm'), -1);
    const counts = {};
    for (const v of line) if (v !== null) counts[v] = (counts[v] || 0) + 1;
    for (const n of Object.values(counts)) assert.equal(n % 2, 0);
  }
  assert.deepEqual(make(), table);
});

test('AC press board cleared with waves left: outcome is not a win and the next tick pushes at once', () => {
  const r = rig(pressChapter(), pressBoard(6, {}));
  assert.equal(r.pressure.outcome().result, null);
  r.pressure.tick(10);
  assert.equal(r.of('push').length, 1);
  assert.equal(r.pressure.hud().wave, 1);
});

test('AC press after the last wave an empty row is pushed (push.empty), and clearing the board then wins', () => {
  const r = rig(pressChapter({ waves: 4 }), pressBoard(6, { 1: row('dao dao . . . .') }));
  tickFor(r.pressure, 28000);
  assert.equal(r.pressure.hud().wave, 4);
  assert.equal(r.of('lastWave').length, 1);
  tickFor(r.pressure, 7000);
  const pushes = r.of('push');
  assert.equal(pushes.length, 5);
  assert.equal(pushes[4].empty, true);
  assert.equal(r.pressure.outcome().result, null);
  clearUnits(r.board);
  assert.equal(r.pressure.outcome().result, 'win');
});

test('AC press scare: bottom row occupied, 2000 ms left, Zhang Fei roars -> no push, no breach, wave unchanged, nextPush = now + 7000; bottom row empty -> canScare false', () => {
  const r = rig(pressChapter(), pressBoard(6, { 8: row('dao dao . . . .') }));
  tickFor(r.pressure, 5000);
  assert.equal(r.pressure.hud().msToNextPush, 2000);
  assert.equal(r.pressure.canScare(), true);
  r.pressure.scareNextPush();
  assert.equal(r.pressure.canScare(), false);
  tickFor(r.pressure, 2000);
  assert.equal(r.of('push').length, 0);
  assert.equal(r.of('scared').length, 1);
  assert.equal(r.pressure.outcome().result, null);
  assert.equal(r.pressure.hud().wave, 0);
  assert.equal(r.pressure.hud().msToNextPush, FIXTURE_INTERVAL);
  const empty = rig(pressChapter(), pressBoard(6, { 1: row('dao dao . . . .') }));
  assert.equal(empty.pressure.canScare(), false);
});

test('AC press scare armed and board cleared with waves left: the next tick still pushes, scareArmed stays true, the next scheduled push is scared', () => {
  const r = rig(pressChapter(), pressBoard(6, {}));
  r.pressure.scareNextPush();
  r.pressure.tick(10);
  assert.equal(r.of('push').length, 1);
  assert.equal(r.pressure.hud().scareArmed, true);
  tickFor(r.pressure, FIXTURE_INTERVAL);
  assert.equal(r.of('push').length, 1);
  assert.equal(r.of('scared').length, 1);
  assert.equal(r.pressure.hud().scareArmed, false);
});

test('AC press danger time: bottom row occupied for 2500.6 ms of game time -> dangerMs 2500', () => {
  const r = rig(pressChapter(), pressBoard(6, { 8: row('dao dao . . . .') }));
  r.pressure.tick(2000);
  r.pressure.tick(500.6);
  assert.deepEqual(r.pressure.metrics(), { dangerMs: 2500 });
});

test('AC press combo delay: comboReward delays the next push by pressDelay, capped per push', () => {
  const r = rig(pressChapter(), pressBoard(6, { 1: row('dao dao . . . .') }));
  assert.equal(r.pressure.comboReward(), 1000);
  r.pressure.comboReward();
  r.pressure.comboReward();
  assert.equal(r.pressure.comboReward(), 0);
  assert.equal(r.pressure.hud().msToNextPush, FIXTURE_INTERVAL + 3000);
});

test('AC slow=1 press interval 12000 -> 15600 (applied after validation)', () => {
  const r = rig(pressChapter({ interval: 12000 }), pressBoard(6, { 1: row('dao dao . . . .') }), true);
  assert.equal(r.pressure.hud().interval, 15600);
  assert.equal(r.pressure.hud().msToNextPush, 15600);
});

// ---- press roadblocks (rule 9a) ----

test('AC press roadblock wave: waveList item 1 [qi, dao, jm, dao, qi] -> row 1 col 3 is a roadblock, 4 units, wave 1, kinds even', () => {
  const waveList = [['qi', 'dao', 'jm', 'dao', 'qi']].concat(Array.from({ length: 7 }, () => ['dao', 'dao', 'gu', 'gu', null]));
  const r = rig(pressChapter({ waveList }, pairedDeck(20, 5)), pressBoard(5, { 1: row('gu gu . . .') }));
  tickFor(r.pressure, FIXTURE_INTERVAL);
  assert.deepEqual(r.board.cells().filter((c) => c.r === 1).map((c) => c.top), ['qi', 'dao', 'jm', 'dao', 'qi']);
  assert.equal(r.pressure.hud().wave, 1);
  for (const n of Object.values(kindCounts(r.board))) assert.equal(n % 2, 0);
});

test('AC press bottom row holds only a roadblock: no breach, the board moves down, the roadblock leaves (push.dropped), wave + 1', () => {
  const r = rig(pressChapter({}, pairedDeck(20, 5)), pressBoard(5, { 1: row('gu gu . . .'), 8: row('. . jm . .') }));
  tickFor(r.pressure, FIXTURE_INTERVAL);
  const push = r.of('push')[0];
  assert.deepEqual(push.dropped, [3]);
  assert.equal(r.pressure.hud().wave, 1);
  assert.equal(r.pressure.outcome().result, null);
  assert.equal(r.board.blocks().length, 0);
});

test('AC press only a roadblock on the bottom row for 3000 ms: dangerMs stays 0, bottomOccupied false, canScare false', () => {
  const r = rig(pressChapter({}, pairedDeck(20, 5)), pressBoard(5, { 1: row('gu gu . . .'), 8: row('. . jm . .') }));
  tickFor(r.pressure, 3000);
  assert.equal(r.pressure.metrics().dangerMs, 0);
  assert.equal(r.pressure.hud().bottomOccupied, false);
  assert.equal(r.pressure.canScare(), false);
});

test('AC press waves done and only 2 roadblocks left -> outcome win', () => {
  const r = rig(pressChapter({ waves: 4 }, pairedDeck(20, 5)), pressBoard(5, { 1: row('gu gu . . .') }));
  tickFor(r.pressure, 28000);
  assert.equal(r.pressure.hud().wave, 4);
  clearUnits(r.board);
  r.board.set(3, 1, 'jm');
  r.board.set(5, 2, 'jm');
  assert.equal(r.pressure.outcome().result, 'win');
});

// ---- food ----

const FOOD_DECK = Object.freeze({ huo: 2, ying: 6, ma: 2, gong: 6, shui: 2, cheng: 8, dao: 4, gu: 4, dun: 4, shu: 4, qi: 6 });
const foodChapter = () => ({ id: 'test-food', mode: 'food', deck: FOOD_DECK, food: { slack: 2 } });
const foodRig = (picture) => rig(foodChapter(), boardFromPicture(picture || OPEN_PICTURE));
const MATCH = Object.freeze({ type: 'match', kind: 'dao', forced: false });

test('AC food_start: GDD example deck with slack 2 -> food0 16', () => {
  assert.equal(foodStart(FOOD_DECK, 2), 16);
  assert.equal(foodRig().pressure.hud().food0, 16);
});

test('AC food: a match -> 15; a miss -> 14 and misses 1, each with foodSpent', () => {
  const r = foodRig();
  r.pressure.onMatch(MATCH);
  assert.equal(r.pressure.hud().food, 15);
  r.pressure.onMiss({ type: 'miss' });
  assert.deepEqual([r.pressure.hud().food, r.pressure.hud().misses], [14, 1]);
  assert.deepEqual(r.of('foodSpent'), [{ type: 'foodSpent', amount: 1, cause: 'match' }, { type: 'foodSpent', amount: 1, cause: 'miss' }]);
});

test('AC food: Zhao Yun forced pair at food 5 costs nothing', () => {
  const r = foodRig();
  misses(r.pressure, 11);
  r.pressure.onMatch({ type: 'match', kind: 'dao', forced: true });
  assert.equal(r.pressure.hud().food, 5);
});

test('AC food: food 1, 4 units on the board, a miss -> 粮草断绝', () => {
  const r = foodRig(['dao dao gu gu .'].concat(emptyRows(5, 5)));
  misses(r.pressure, 15);
  assert.equal(r.pressure.hud().food, 1);
  misses(r.pressure, 1);
  assert.deepEqual(r.pressure.outcome(), { result: 'lose', reason: '粮草断绝' });
});

test('AC food: food 1, fire pair + 3 pairs of camps; the fire match takes food to 0, the effect clears the board -> win', () => {
  const r = foodRig(['huo huo ying ying ying ying', 'ying ying . . . .'].concat(emptyRows(4, 6)));
  misses(r.pressure, 15);
  r.board.set(1, 1, null);
  r.board.set(1, 2, null);
  r.pressure.onMatch({ type: 'match', kind: 'huo', forced: false });
  assert.equal(r.pressure.hud().food, 0);
  r.pressure.onClear(r.board.clearKind('ying', 'effect'));
  assert.equal(r.pressure.outcome().result, 'win');
});

test('AC food: a fire match that burns 6 camps costs only 1 food', () => {
  const r = foodRig();
  r.pressure.onMatch({ type: 'match', kind: 'huo', forced: false });
  r.pressure.onClear({ type: 'clear', source: 'effect', kind: 'ying', pairs: 3 });
  assert.equal(r.pressure.hud().food, 15);
});

test('AC food: food 2, Zhang Fei roars (addFood 3) -> 5', () => {
  const r = foodRig();
  misses(r.pressure, 14);
  assert.equal(r.pressure.addFood(3), 3);
  assert.equal(r.pressure.hud().food, 5);
});

test('AC metrics: press {dangerMs} and food {foodLeft, misses} are integers', () => {
  const p = rig(pressChapter(), pressBoard(6, { 8: row('dao dao . . . .') }));
  p.pressure.tick(12.7);
  assert.deepEqual(Object.keys(p.pressure.metrics()), ['dangerMs']);
  assert.ok(Number.isInteger(p.pressure.metrics().dangerMs));
  const f = foodRig();
  misses(f.pressure, 20);
  assert.deepEqual(f.pressure.metrics(), { foodLeft: 0, misses: 20 });
});

// ---- Liu Bei ----

test('AC Liu Bei boss: hearts 2/3, healHeart(1) -> 1, hearts 3, one heal {heart}; steps, stun, shield, seal unchanged', () => {
  const r = bossRig({ chapter: luBuChapter() });
  forceAttack(r.pressure);
  r.pressure.raiseShield();
  r.pressure.debugSet({ steps: 3, stun: 1, seal: { general: 'guan_yu', left: 2 } });
  const before = r.pressure.hud();
  assert.equal(r.pressure.canHeal(), true);
  assert.equal(r.pressure.healHeart(1), 1);
  const after = r.pressure.hud();
  assert.equal(after.hearts, 3);
  assert.deepEqual(r.of('heal'), [{ type: 'heal', heart: 2 }]);
  for (const k of ['steps', 'stun', 'shield', 'seal', 'broken']) assert.deepEqual(after[k], before[k], k);
});

test('AC Liu Bei boss: hearts 3/3 -> canHeal false, healHeart(1) returns 0 and emits nothing', () => {
  const r = bossRig({ chapter: luBuChapter() });
  assert.equal(r.pressure.canHeal(), false);
  assert.equal(r.pressure.healHeart(1), 0);
  assert.equal(r.of('heal').length, 0);
});

test('AC Liu Bei boss: hit twice, heal 1, hit once, win -> heartsLost 2 (hearts_net)', () => {
  const r = bossRig({ chapter: oneBarChapter() });
  forceAttack(r.pressure);
  forceAttack(r.pressure);
  r.pressure.healHeart(1);
  forceAttack(r.pressure);
  r.pressure.onClear({ type: 'clear', pairs: 18 });
  assert.equal(r.pressure.outcome().result, 'win');
  assert.deepEqual(r.pressure.metrics(), { heartsLost: 2 });
});

test('AC hasShield: always false in press and food', () => {
  const p = rig(pressChapter(), pressBoard(6, { 1: row('dao dao . . . .') }));
  const f = foodRig();
  p.pressure.raiseShield();
  f.pressure.raiseShield();
  assert.equal(p.pressure.hasShield(), false);
  assert.equal(f.pressure.hasShield(), false);
});

test('AC Liu Bei food: food0 16, food 15, refillFood(2) -> 1, food 16, foodRefill {amount 1}', () => {
  const r = foodRig();
  r.pressure.onMatch(MATCH);
  assert.equal(r.pressure.canRefill(), true);
  assert.equal(r.pressure.refillFood(2), 1);
  assert.equal(r.pressure.hud().food, 16);
  assert.deepEqual(r.of('foodRefill'), [{ type: 'foodRefill', amount: 1 }]);
});

test('AC Liu Bei food: Zhang Fei raised food to 18 -> canRefill false, refillFood(2) returns 0, food stays 18', () => {
  const r = foodRig();
  r.pressure.addFood(2);
  assert.equal(r.pressure.canRefill(), false);
  assert.equal(r.pressure.refillFood(2), 0);
  assert.equal(r.pressure.hud().food, 18);
  assert.equal(r.of('foodRefill').length, 0);
});

test('AC Liu Bei press: canHeal and canRefill false; healHeart / refillFood return 0', () => {
  const p = rig(pressChapter(), pressBoard(6, { 1: row('dao dao . . . .') }));
  assert.equal(p.pressure.canHeal(), false);
  assert.equal(p.pressure.canRefill(), false);
  assert.equal(p.pressure.healHeart(1), 0);
  assert.equal(p.pressure.refillFood(2), 0);
});
