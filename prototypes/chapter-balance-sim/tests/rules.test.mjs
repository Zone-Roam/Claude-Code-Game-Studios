// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard } from '../src/rules/board-link.mjs';
import { createPressure } from '../src/rules/battle-pressure.mjs';
import { createSkills, guanTargets, huangTargets } from '../src/rules/general-skills.mjs';
import { loadChapters } from '../src/rules/chapter-loader.mjs';
import { CHAPTERS, ENEMIES } from '../src/data/chapters.mjs';
import { KINDS, BLOCK } from '../src/core/constants.mjs';
import { playOne } from '../sim.mjs';

const LOADED = loadChapters({ chapters: CHAPTERS, enemies: ENEMIES }, { slow: false });
const CH = (id) => LOADED.chapters.find((c) => c.id === id);
const _ = null;
const J = BLOCK;

// A stub round context: tokens end at once, dispatch forwards clears to the pressure.
function rig(chapter, layout, under) {
  const events = [];
  const board = createBoard(chapter, { seed: 1, layout, under: under || [] });
  const ctx = {
    chapter, board,
    emit: (e) => events.push(e),
    acquire: (reason, ms, onEnd) => { const t = { reason }; if (onEnd) onEnd(t); return t; },
    release: () => {},
    dispatch: null,
  };
  const pressure = createPressure(ctx);
  ctx.dispatch = (res) => { if (res && res.type === 'clear') pressure.onClear(res); };
  const skills = createSkills(Object.assign({}, ctx, { pressure }));
  pressure.bindSkills(skills);
  return { board, pressure, skills, events };
}

function allEven(board) {
  for (const k of KINDS) if (board.count(k) % 2 !== 0) return false;
  return true;
}

// 5 columns × 6 rows, like ch02/ch03/ch05.
const LAYOUT = [
  ['dao', 'gu', 'qi', 'jiu', 'ying'],
  ['gu', 'dao', 'jiu', 'qi', 'ying'],
  ['dao', 'gu', 'qi', 'jiu', _],
  ['ying', 'ying', 'dao', 'gu', J],
  ['qi', 'jiu', _, _, _],
  [_, 'dun', _, 'dun', _],
];

test('loader → all five boss chapters load, lineup = recommend', () => {
  assert.equal(LOADED.rejected.length, 0);
  assert.deepEqual(LOADED.chapters.filter((c) => c.mode === 'boss').map((c) => c.id), ['ch02', 'ch03', 'ch05', 'ch09', 'ch10']);
  assert.deepEqual(CH('ch10').generals, ['huang_zhong', 'zhuge_liang', 'zhao_yun']);
});

test('关羽 chosen row (GDD guan_cut example) → row + buried + 拒马, odd kinds get one extra each, pairs = 4', () => {
  // Arrange: row 4 is 营 营 刀 鼓 拒马, the first 营 has a buried 书; a second 书 is buried at (1, 1)
  const ch = CH('ch03');
  const { board, pressure, skills } = rig(ch, LAYOUT, [{ r: 4, c: 1, kind: 'shu' }, { r: 1, c: 1, kind: 'shu' }]);
  skills.setCharge('guan_yu', 2);
  const hp0 = pressure.hud().hp;
  // Act
  const targets = guanTargets(board, 4);
  const ok = skills.tapCard('guan_yu', { row: 4 });
  // Assert: 营 2, 刀 1, 鼓 1, 书 1 in the row → extra 刀 (bottom-up: row 3), 鼓 (row 3), buried 书 at (1,1)
  assert.ok(ok);
  assert.deepEqual(targets.filter((t) => t.layer === 'top').map((t) => [t.r, t.c]), [[3, 1], [3, 2]]);
  assert.deepEqual(targets.filter((t) => t.layer === 'under').map((t) => [t.r, t.c]), [[1, 1]]);
  for (let c = 1; c <= 5; c++) assert.equal(board.kindAt(4, c), null, 'row 4 col ' + c + ' cleared, 拒马 too');
  assert.equal(board.depthAt(4, 1), 0);
  assert.equal(board.depthAt(1, 1), 0);
  assert.equal(hp0 - pressure.hud().hp, 4, 'cut 8 → 4 pairs of damage');
  assert.ok(allEven(board));
});

test('关羽 → an empty row does not respond and keeps the charge; a 拒马-only row clears for 0 damage', () => {
  const { board, pressure, skills } = rig(CH('ch03'), [
    ['dao', 'dao', _, _, _], [_, _, J, _, _], [_, _, _, _, _], [_, _, _, _, _], [_, _, _, _, _], [_, _, _, _, _],
  ]);
  skills.setCharge('guan_yu', 2);
  assert.equal(skills.tapCard('guan_yu', { row: 3 }), false);
  assert.equal(skills.cards().find((c) => c.id === 'guan_yu').charge, 2);
  const hp0 = pressure.hud().hp;
  assert.equal(skills.tapCard('guan_yu', { row: 2 }), true);
  assert.equal(board.kindAt(2, 3), null);
  assert.equal(pressure.hud().hp, hp0);
});

test('黄忠 chosen column (GDD huang_cut example) → column + buried + 拒马, pairs = 5', () => {
  // Arrange: column 2 top→bottom 营 书 拒马 刀 营 鼓, (1,2) has a buried 旗; partners elsewhere
  const ch = Object.assign({}, CH('ch10'), { rows: 6 });
  const layout = [
    ['shu', 'ying', _, _, _],
    ['dao', 'shu', _, _, _],
    [_, J, _, _, _],
    ['gu', 'dao', _, _, _],
    [_, 'ying', 'qi', _, _],
    [_, 'gu', _, _, _],
  ];
  const { board, pressure, skills } = rig(ch, layout, [{ r: 1, c: 2, kind: 'qi' }]);
  skills.setCharge('huang_zhong', 3);
  const hp0 = pressure.hud().hp;
  // Act
  const targets = huangTargets(board, 2);
  assert.ok(skills.tapCard('huang_zhong', { col: 2 }));
  // Assert
  assert.equal(targets.filter((t) => t.layer === 'stack').length, 5);
  assert.equal(targets.filter((t) => t.layer === 'block').length, 1);
  assert.equal(targets.filter((t) => t.layer === 'top').length, 4); // 书, 刀, 鼓, 旗 partners
  assert.equal(hp0 - pressure.hud().hp, 5);
  assert.ok(board.isEmpty());
  assert.equal(board.blocks().length, 0);
});

test('刘备 → heals one heart, never above heartsMax; teammates +1 capped at need; himself not gifted', () => {
  // Arrange: ch05 lineup with 刘备 instead of 赵云
  const ch = Object.assign({}, CH('ch05'), { generals: ['zhang_fei', 'guan_yu', 'liu_bei'] });
  const { pressure, skills } = rig(ch, LAYOUT);
  // full hearts, 关羽 1/2, 张飞 3/3 (full)
  skills.setCharge('liu_bei', 3);
  skills.setCharge('guan_yu', 1);
  skills.setCharge('zhang_fei', 3);
  // Act
  assert.ok(skills.tapCard('liu_bei'));
  // Assert
  const cards = Object.fromEntries(skills.cards().map((c) => [c.id, c]));
  assert.equal(pressure.hud().hearts, 3, 'already full: no heal above heartsMax');
  assert.equal(pressure.metrics().healed, 0);
  assert.equal(cards.guan_yu.charge, 2);
  assert.equal(cards.zhang_fei.charge, 3);
  assert.equal(cards.liu_bei.charge, 0);
  // heal path
  assert.equal(pressure.healHeart(1), 0);
  for (let i = 0; i < 6; i++) pressure.onMatch({ kind: 'jiu' });
  pressure.tick(16); // attack: hearts 2
  assert.equal(pressure.hud().hearts, 2);
  skills.setCharge('liu_bei', 3);
  assert.ok(skills.tapCard('liu_bei'));
  assert.equal(pressure.hud().hearts, 3);
  assert.equal(pressure.metrics().heartsLost, 0, 'net hearts lost');
  assert.equal(pressure.metrics().hits, 1);
});

test('刘备 → no effect with full hearts and everyone full', () => {
  const ch = Object.assign({}, CH('ch05'), { generals: ['guan_yu', 'liu_bei'] });
  const { skills, events } = rig(ch, LAYOUT);
  skills.setCharge('liu_bei', 3);
  skills.setCharge('guan_yu', 2);
  assert.equal(skills.tapCard('liu_bei'), false);
  assert.equal(events.pop().text, '心满，众将也满');
});

test('铁索连环 → converts top tiles to 营, never 营火马水, every kind stays even', () => {
  // Arrange: drive ch09 into phase 2 and let it attack with chain over many seeds
  const ch = CH('ch09');
  for (let seed = 1; seed <= 30; seed++) {
    const events = [];
    const board = createBoard(ch, { seed });
    const ctx = { chapter: ch, board, emit: (e) => events.push(e), acquire: () => ({}), release: () => {}, dispatch: () => {} };
    const p = createPressure(ctx);
    p.onClear({ pairs: 99 }); // empty phase-1 hp
    p.tick(16); // enter phase 2
    assert.equal(p.hud().phase, 2);
    const before = {};
    for (const k of KINDS) before[k] = board.count(k);
    for (let i = 0; i < 6; i++) p.onMatch({ kind: 'jiu' });
    // Act
    p.tick(16);
    // Assert
    const atk = events.find((e) => e.type === 'hostAttack');
    assert.equal(atk.special, 'chain');
    assert.ok(allEven(board), 'seed ' + seed);
    for (const k of ['huo', 'ma', 'shui']) assert.equal(board.count(k), before[k]);
    const gained = board.count('ying') - before.ying;
    assert.ok(gained === 4 || gained === 2 || gained === 0);
    assert.equal(p.hud().hearts, 3, 'a special takes no heart');
  }
});

test('convertBlocks → refuses odd changes, 拒马 and empty cells; no change on refusal', () => {
  const board = createBoard(CH('ch03'), { seed: 1, layout: LAYOUT });
  assert.equal(board.convertBlocks([{ r: 1, c: 1 }], 'ying').ok, false);
  assert.equal(board.convertBlocks([{ r: 4, c: 5 }, { r: 3, c: 1 }], 'ying').ok, false);
  assert.equal(board.kindAt(1, 1), 'dao');
  const res = board.convertBlocks([{ r: 1, c: 1 }, { r: 2, c: 2 }], 'ying');
  assert.equal(res.type, 'convert');
  assert.equal(board.kindAt(2, 2), 'ying');
  assert.ok(allEven(board));
});

test('文丑 (one hp bar, no phase2) → only normal attacks, no forecast, no phase change, breakSpecial null', () => {
  const ch = CH('ch03');
  const events = [];
  const board = createBoard(ch, { seed: 3 });
  const ctx = { chapter: ch, board, emit: (e) => events.push(e), acquire: () => ({}), release: () => {}, dispatch: () => {} };
  const p = createPressure(ctx);
  assert.equal(p.breakSpecial(), null);
  for (let a = 0; a < 2; a++) {
    for (let i = 0; i < 8; i++) { p.onMatch({ kind: 'jiu' }); assert.equal(p.hud().forecast, null); }
    p.tick(16);
  }
  assert.deepEqual(events.filter((e) => e.type === 'hostAttack').map((e) => e.kind), ['normal', 'normal']);
  assert.equal(p.hud().hearts, 1);
  p.onClear({ pairs: 99 });
  assert.equal(p.tick(16), false, 'no phase change');
  assert.equal(p.hud().phase, 1);
  assert.equal(p.outcome().result, 'win');
  assert.equal(events.filter((e) => e.type === 'bossPhase').length, 0);
});

test('诸葛亮 in phase 1 of a two-phase enemy → break stays for the first phase-2 special', () => {
  const ch = CH('ch05');
  const events = [];
  const board = createBoard(ch, { seed: 4 });
  const ctx = { chapter: ch, board, emit: (e) => events.push(e), acquire: () => ({}), release: () => {}, dispatch: () => {} };
  const p = createPressure(ctx);
  const r = p.breakSpecial();
  assert.equal(r.special, 'sweep');
  assert.equal(r.forecast, false);
  assert.equal(p.breakSpecial(), null, 'does not stack');
  p.onClear({ pairs: 99 });
  p.tick(16);
  for (let i = 0; i < 5; i++) p.onMatch({ kind: 'jiu' });
  p.tick(16);
  assert.equal(events.filter((e) => e.type === 'hostAttack').pop().kind, 'broken');
});

test('sim → same seed gives the same game (reproducible)', () => {
  const a = playOne(CH('ch09'), 7, 0.2, true);
  const b = playOne(CH('ch09'), 7, 0.2, true);
  assert.deepEqual(a, b);
});

// ---- 压境、粮草 (battle-pressure rules 7–19, 2026-10-30) ----
import { foodStart } from '../src/rules/press-food.mjs';

const PRESS = (waveList, startRows) => ({
  id: 'tp', mode: 'press', rows: 8, cols: 5, deck: { dao: 2 }, generals: ['guan_yu'],
  press: { startRows: startRows || 1, waves: waveList.length, interval: 1000, waveList },
});
const W1 = ['gu', 'gu', null, 'qi', 'qi'];
const W2 = ['jiu', 'jiu', 'jm', 'dun', 'dun'];
const FOOD = (generals) => ({
  id: 'tf', mode: 'food', rows: 2, cols: 5, deck: { dao: 4, gu: 2, qi: 4 }, food: { slack: 2 }, generals,
});
const FOOD_LAYOUT = [['dao', 'dao', 'gu', 'qi', 'qi'], ['gu', 'dao', 'dao', 'qi', 'qi']];

test('压境 → at interval one row comes down from the top; waves count', () => {
  const { board, pressure } = rig(PRESS([W1, W2]), [['dao', 'dao', _, _, _]]);
  assert.equal(pressure.tick(999), false);
  assert.equal(pressure.tick(1), true);
  assert.equal(board.kindAt(2, 1), 'dao');
  assert.equal(board.kindAt(1, 1), 'gu');
  assert.equal(board.kindAt(1, 3), null);
  assert.equal(pressure.hud().wave, 1);
  assert.equal(pressure.outcome().result, null);
});

test('压境 → a tile in the bottom row when a push falls due = 破城, board unchanged', () => {
  const layout = [_, _, _, _, _, _, _, ['dao', 'dao', _, _, _]].map((r) => r || [_, _, _, _, _]);
  const { board, pressure } = rig(PRESS([W1]), layout);
  pressure.tick(500);
  assert.equal(pressure.outcome().result, null);
  pressure.tick(500);
  assert.deepEqual(pressure.outcome(), { result: 'lose', reason: '破城' });
  assert.equal(board.kindAt(1, 1), null);
  assert.equal(pressure.metrics().dangerMs, 1000); // both ticks started with a tile in the bottom row
});

test('压境 → 拒马 in the bottom row does not lose; it is pushed off the board (dropped)', () => {
  const layout = [['dao', 'dao', _, _, _], _, _, _, _, _, _, [J, _, _, _, _]].map((r) => r || [_, _, _, _, _]);
  const { board, pressure, events } = rig(PRESS([W1, W2]), layout);
  assert.equal(board.bottomOccupied(), false);
  pressure.tick(1000);
  assert.equal(pressure.outcome().result, null);
  assert.equal(board.blocks().length, 0);
  assert.deepEqual(events.find((e) => e.type === 'push').dropped, [1]);
  assert.equal(pressure.metrics().dangerMs, 0);
  pressure.tick(1000); // wave 2 brings its own 拒马 in at row 1
  assert.equal(board.kindAt(1, 3), J);
});

test('压境 → all waves pushed and the board cleared = win (not before the last wave)', () => {
  const { board, pressure } = rig(PRESS([W1]), [['dao', 'dao', _, _, _]]);
  board.tap(1, 1); board.tap(1, 2);
  assert.equal(board.isEmpty(), true);
  assert.equal(pressure.outcome().result, null); // waves left
  assert.equal(pressure.tick(16), true); // empty board → next wave at once
  assert.equal(pressure.hud().wave, 1);
  for (const [a, b] of [[[1, 1], [1, 2]], [[1, 4], [1, 5]]]) { board.tap(a[0], a[1]); board.tap(b[0], b[1]); }
  assert.deepEqual(pressure.outcome(), { result: 'win', reason: null });
});

test('粮草 → food0 from food_start; a pair costs 1, a forced pair 0, a miss 1 and counts', () => {
  assert.equal(foodStart(CH('ch07')), 21); // 2026-10-30 deck 50: 25 − 6 + 2 (was 19)
  assert.equal(foodStart(CH('ch04')), 21);
  const { pressure } = rig(FOOD(['guan_yu']), FOOD_LAYOUT);
  assert.equal(pressure.hud().food, 7); // 5 pairs − 0 + 2
  pressure.onMatch({ forced: false });
  assert.equal(pressure.hud().food, 6);
  pressure.onMatch({ forced: true });
  assert.equal(pressure.hud().food, 6);
  pressure.onMiss({});
  assert.equal(pressure.hud().food, 5);
  assert.equal(pressure.metrics().misses, 1);
});

test('粮草 → food 0 with tiles left = 粮草断绝', () => {
  const { pressure } = rig(FOOD(['guan_yu']), FOOD_LAYOUT);
  for (let i = 0; i < 7; i++) pressure.onMiss({});
  assert.deepEqual(pressure.outcome(), { result: 'lose', reason: '粮草断绝' });
});

test('粮草 → 刘备 refills 2 capped at food0; 张飞 +3 may exceed it', () => {
  const r = rig(FOOD(['liu_bei', 'zhang_fei']), FOOD_LAYOUT);
  r.pressure.onMiss({});
  r.skills.setCharge('liu_bei', 3);
  assert.equal(r.skills.tapCard('liu_bei'), true);
  assert.equal(r.pressure.hud().food, 7);
  assert.deepEqual(r.events.filter((e) => e.type === 'foodRefill').map((e) => e.amount), [1]);
  assert.equal(r.pressure.canRefill(), false);
  r.skills.setCharge('zhang_fei', 3);
  assert.equal(r.skills.tapCard('zhang_fei'), true);
  assert.equal(r.pressure.hud().food, 10);
  assert.equal(r.pressure.metrics().misses, 1);
});
