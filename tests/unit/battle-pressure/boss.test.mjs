// battle-pressure boss mode + shared interface (design/gdd/battle-pressure.md Acceptance Criteria).
// Test names start with the AC they cover ("AC boss-…").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPressure } from '../../../src/rules/battle-pressure.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import {
  bossRig, luBuChapter, oneBarChapter, matches, misses, forceAttack, enterPhase2, snap, kindCounts,
  SWEEP_PICTURE, OPEN_PICTURE, TWO_FREE_PICTURE, CHAIN_PICTURE,
} from '../../helpers/battle-pressure-fakes.mjs';

const attacks = (rig) => rig.of('hostAttack');
const lastAttack = (rig) => attacks(rig)[attacks(rig).length - 1];
const withSpecials = (specials, extra) => luBuChapter({
  boss: Object.assign({ enemy: 'lv_bu', hp: 12, steps: 8, hearts: 3, addPairs: 2,
    phase2: { hp: 18, steps: 6, specials } }, extra),
});
const emptyCells = (board) => board.cells().filter((c) => c.top === null);

// ---- shared interface ----

test('AC interface: createPressure returns tick/onMatch/onMiss/onClear/outcome/metrics/hud/comboReward and the skill hooks', () => {
  const { pressure } = bossRig({ chapter: luBuChapter() });
  for (const m of ['tick', 'onMatch', 'onMiss', 'onClear', 'outcome', 'metrics', 'hud', 'comboReward',
    'roarBack', 'raiseShield', 'hasShield', 'breakSpecial', 'sealed', 'canScare', 'scareNextPush', 'charge', 'resetCharge']) {
    assert.equal(typeof pressure[m], 'function', m);
  }
});

test('AC interface: all three modes expose the same methods; an unknown mode is a RangeError', () => {
  const board = boardFromPicture(OPEN_PICTURE);
  const ctx = (mode) => ({ chapter: { id: 'x', mode, deck: { dao: 4 } }, board, emit() {}, acquire() {}, release() {} });
  const names = (p) => Object.keys(p).filter((k) => k !== 'waveTable').sort();
  const boss = createPressure(ctx('boss'));
  assert.deepEqual(names(createPressure(ctx('press'))), names(boss));
  assert.deepEqual(names(createPressure(ctx('food'))), names(boss));
  assert.throws(() => createPressure(ctx('siege')), RangeError);
});

// ---- steps ----

test('AC boss idle 60000 ms: steps stay 0 and there is no attack', () => {
  const rig = bossRig({ chapter: luBuChapter() });
  for (let i = 0; i < 6000; i++) rig.pressure.tick(10);
  assert.equal(rig.pressure.hud().steps, 0);
  assert.equal(attacks(rig).length, 0);
  assert.equal(rig.tokens.length, 0);
});

test('AC boss steps: a match walks 1, then a miss walks 2 (steps 3)', () => {
  const { pressure } = bossRig({ chapter: luBuChapter() });
  matches(pressure, 1);
  assert.equal(pressure.hud().steps, 1);
  misses(pressure, 1);
  assert.equal(pressure.hud().steps, 3);
});

test('AC boss attack: steps 7/8, hp 5, a match -> same-frame tick attacks: heart -1, 2 pairs on empty cells, steps 0, hostAttack 600 ms', () => {
  const rig = bossRig({ chapter: luBuChapter() });
  const { pressure, board } = rig;
  matches(pressure, 7);
  assert.deepEqual([pressure.hud().steps, pressure.hud().hp], [7, 5]);
  const empties = new Set(emptyCells(board).map((c) => c.r + ',' + c.c));
  const buried = board.buriedCount();
  matches(pressure, 1);
  pressure.tick(16);
  const h = pressure.hud();
  assert.equal(h.hearts, 2);
  assert.equal(h.steps, 0);
  assert.equal(h.pushedSinceAttack, 0);
  const ev = lastAttack(rig);
  assert.equal(ev.kind, 'normal');
  assert.equal(ev.cells.length, 4);
  for (const c of ev.cells) assert.ok(empties.has(c.r + ',' + c.c));
  assert.equal(board.buriedCount(), buried);
  assert.deepEqual(rig.tokens.map((t) => [t.reason, t.durationMs]), [['hostAttack', 600]]);
});

test('AC boss miss at 7/8: steps capped at 8, next tick attacks', () => {
  const rig = bossRig({ chapter: luBuChapter() });
  matches(rig.pressure, 7);
  misses(rig.pressure, 1);
  assert.equal(rig.pressure.hud().steps, 8);
  rig.pressure.tick(16);
  assert.equal(attacks(rig).length, 1);
});

test('AC boss combo pushback: 3rd combo returns 1 (steps stay 5), 4th returns 1, 5th returns 0; attack resets pushedSinceAttack', () => {
  const { pressure } = bossRig({ chapter: luBuChapter() });
  matches(pressure, 5);
  assert.equal(pressure.comboReward(), 1);
  matches(pressure, 1);
  assert.equal(pressure.hud().steps, 5);
  assert.equal(pressure.comboReward(), 1);
  matches(pressure, 1);
  assert.equal(pressure.comboReward(), 0);
  matches(pressure, 1);
  assert.equal(pressure.hud().pushedSinceAttack, 2);
  forceAttack(pressure);
  assert.equal(pressure.hud().pushedSinceAttack, 0);
});

test('AC boss combo at steps 0: comboReward returns 0 and steps stay 0', () => {
  const rig = bossRig({ chapter: luBuChapter() });
  assert.equal(rig.pressure.comboReward(), 0);
  assert.equal(rig.pressure.hud().steps, 0);
  assert.equal(rig.of('comboPushback').length, 0);
});

test('AC boss roarBack(3,3) at 6/8: steps 3 stun 3; 3 matches -> steps 3 stun 0; one more -> 4', () => {
  const { pressure } = bossRig({ chapter: luBuChapter() });
  matches(pressure, 6);
  pressure.roarBack(3, 3);
  assert.deepEqual([pressure.hud().steps, pressure.hud().stun], [3, 3]);
  matches(pressure, 3);
  assert.deepEqual([pressure.hud().steps, pressure.hud().stun], [3, 0]);
  matches(pressure, 1);
  assert.equal(pressure.hud().steps, 4);
});

test('AC boss stun 1, steps 3, a miss -> stun 0, steps 4', () => {
  const { pressure } = bossRig({ chapter: luBuChapter() });
  matches(pressure, 6);
  pressure.roarBack(3, 1);
  misses(pressure, 1);
  assert.deepEqual([pressure.hud().stun, pressure.hud().steps], [0, 4]);
});

// ---- shield ----

test('AC boss shield: full steps + shield -> hearts and board unchanged, shield false, steps 0, hostAttack blocked; hasShield === hud().shield', () => {
  const rig = bossRig({ chapter: luBuChapter() });
  const { pressure, board } = rig;
  pressure.raiseShield();
  assert.equal(pressure.hasShield(), true);
  assert.equal(pressure.hud().shield, true);
  misses(pressure, 4);
  const before = snap(board);
  pressure.tick(16);
  assert.equal(pressure.hud().hearts, 3);
  assert.equal(snap(board), before);
  assert.equal(pressure.hud().steps, 0);
  assert.equal(pressure.hasShield(), false);
  assert.equal(pressure.hud().shield, false);
  assert.deepEqual(lastAttack(rig), { type: 'hostAttack', kind: 'blocked' });
});

test('AC boss phase 2 shield blocks sweep: board unchanged; next attack normal; next special is charge', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  enterPhase2(rig.pressure);
  rig.pressure.raiseShield();
  const before = snap(rig.board);
  forceAttack(rig.pressure);
  assert.equal(lastAttack(rig).kind, 'blocked');
  assert.equal(snap(rig.board), before);
  forceAttack(rig.pressure);
  assert.equal(lastAttack(rig).kind, 'normal');
  forceAttack(rig.pressure);
  assert.deepEqual([lastAttack(rig).kind, lastAttack(rig).special], ['special', 'charge']);
});

// ---- phase change ----

test('AC boss phase change: hp 1, 7/8, a match -> outcome null; tick changes phase (refill floor(free/2), hp 18, 0/6, phase token 1400, bossPhase)', () => {
  const rig = bossRig({ chapter: luBuChapter({ boss: { enemy: 'lv_bu', hp: 8, steps: 8, phase2: { hp: 18, steps: 6, name: '暴怒吕布' } } }) });
  const { pressure, board } = rig;
  matches(pressure, 7);
  assert.deepEqual([pressure.hud().hp, pressure.hud().steps], [1, 7]);
  matches(pressure, 1);
  assert.deepEqual(pressure.outcome(), { result: null, reason: null });
  const free = emptyCells(board).length;
  pressure.tick(16);
  assert.equal(attacks(rig).length, 0);
  const h = pressure.hud();
  assert.deepEqual([h.phase, h.hp, h.hpMax, h.steps, h.stepsMax, h.stun], [2, 18, 18, 0, 6, 0]);
  const ev = rig.of('bossPhase')[0];
  assert.equal(ev.phase, 2);
  assert.equal(ev.name, '暴怒吕布');
  assert.equal(ev.cells.length, 2 * Math.floor(free / 2));
  assert.equal(emptyCells(board).length, free % 2);
  assert.deepEqual(rig.tokens.map((t) => [t.reason, t.durationMs]), [['phase', 1400]]);
});

test('AC boss phase change keeps shield and seal (seal 2 left set by test stub)', () => {
  const rig = bossRig({ chapter: luBuChapter({ boss: { enemy: 'lv_bu', hp: 3, steps: 8, phase2: { hp: 18, steps: 6 } } }) });
  rig.pressure.raiseShield();
  rig.pressure.debugSet({ seal: { general: 'zhang_fei', left: 2 } });
  enterPhase2(rig.pressure);
  assert.equal(rig.pressure.hud().phase, 2);
  assert.equal(rig.pressure.hud().shield, true);
  assert.deepEqual(rig.pressure.hud().seal, { general: 'zhang_fei', left: 2 });
});

test('AC boss phase 2 rotation: 5 attacks are sweep, normal, charge, normal, roar; only the 2 normals cost hearts', () => {
  const generals = [{ id: 'guan_yu', charge: 1, need: 2 }];
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE, generals });
  enterPhase2(rig.pressure);
  for (let i = 0; i < 5; i++) forceAttack(rig.pressure);
  assert.deepEqual(attacks(rig).map((e) => e.special || e.kind), ['sweep', 'normal', 'charge', 'normal', 'roar']);
  assert.equal(rig.pressure.hud().hearts, 1);
});

test('AC boss forecast: phase 2, next is special, stepsMax 6: steps 3 -> null; steps 4 -> {sweep, 画戟横扫, broken false}', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  enterPhase2(rig.pressure);
  matches(rig.pressure, 3);
  assert.equal(rig.pressure.hud().forecast, null);
  matches(rig.pressure, 1);
  assert.deepEqual(rig.pressure.hud().forecast, { id: 'sweep', name: '画戟横扫', broken: false });
});

// ---- break ----

test('AC boss breakSpecial before a normal attack: returns next special (forecast false), normal still hits, the special only resets steps', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  const { pressure, board } = rig;
  enterPhase2(pressure);
  forceAttack(pressure); // sweep; next is a normal attack
  const r = pressure.breakSpecial();
  assert.deepEqual(r, { special: 'charge', name: '赤兔冲阵', forecast: false });
  assert.equal(pressure.hud().broken, true);
  forceAttack(pressure);
  assert.equal(lastAttack(rig).kind, 'normal');
  assert.equal(pressure.hud().hearts, 2);
  const before = snap(board);
  forceAttack(pressure);
  assert.deepEqual([lastAttack(rig).kind, lastAttack(rig).special], ['broken', 'charge']);
  assert.equal(snap(board), before);
  assert.equal(pressure.hud().hearts, 2);
  assert.equal(pressure.hud().steps, 0);
  assert.equal(pressure.hud().broken, false);
  forceAttack(pressure); // normal
  matches(pressure, 4);
  assert.equal(pressure.hud().forecast.id, 'roar');
});

test('AC boss breakSpecial in phase 1: returns {sweep, forecast false}, mark survives the phase change and breaks the first special; null when no phase2 or already marked', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  const r = rig.pressure.breakSpecial();
  assert.equal(r.special, 'sweep');
  assert.equal(r.forecast, false);
  assert.equal(rig.pressure.hud().broken, true);
  assert.equal(rig.pressure.breakSpecial(), null);
  enterPhase2(rig.pressure);
  assert.equal(rig.pressure.hud().broken, true);
  forceAttack(rig.pressure);
  assert.equal(lastAttack(rig).kind, 'broken');
  assert.equal(rig.pressure.hud().steps, 0);
  const one = bossRig({ chapter: oneBarChapter() });
  assert.equal(one.pressure.breakSpecial(), null);
});

// ---- specials ----

test('AC boss sweep: only the top units of rows 2-3 move; roadblocks, empty cells, buried cards and kind counts unchanged; selection cleared', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  const { pressure, board } = rig;
  enterPhase2(pressure);
  board.tap(3, 2);
  assert.notEqual(board.selection(), null);
  const before = board.cells();
  const counts = kindCounts(board);
  forceAttack(pressure);
  assert.equal(lastAttack(rig).special, 'sweep');
  const after = board.cells();
  const isUnit = (k) => k !== null && k !== 'jm';
  for (let i = 0; i < before.length; i++) {
    const b = before[i];
    const a = after[i];
    assert.deepEqual(a.under, b.under);
    if (b.r === 2 || b.r === 3) assert.equal(isUnit(a.top), isUnit(b.top));
    if (!isUnit(b.top) || (b.r !== 2 && b.r !== 3)) assert.equal(a.top, b.top);
  }
  const units = (cells) => cells.filter((c) => (c.r === 2 || c.r === 3) && isUnit(c.top)).map((c) => c.top).sort();
  assert.deepEqual(units(after), units(before));
  assert.deepEqual(kindCounts(board), counts);
  assert.equal(board.selection(), null);
});

test('AC boss charge with 1 empty cell: places 1 roadblock and the rotation still advances', () => {
  const rig = bossRig({ chapter: withSpecials(['charge', 'roar']), picture: SWEEP_PICTURE });
  enterPhase2(rig.pressure);
  forceAttack(rig.pressure);
  assert.equal(lastAttack(rig).special, 'charge');
  assert.equal(lastAttack(rig).cells.length, 1);
  assert.equal(rig.board.get(2, 4), 'jm');
  assert.equal(rig.pressure.breakSpecial().special, 'roar');
});

test('AC boss roar: seals the general with the highest charge/need (张飞 2/3), sealed = 3; a match then a miss unseal him', () => {
  const generals = [{ id: 'guan_yu', charge: 1, need: 2 }, { id: 'zhang_fei', charge: 2, need: 3 }, { id: 'zhuge_liang', charge: 0, need: 4 }];
  const rig = bossRig({ chapter: withSpecials(['roar']), picture: SWEEP_PICTURE, generals });
  enterPhase2(rig.pressure);
  forceAttack(rig.pressure);
  assert.deepEqual(rig.of('seal'), [{ type: 'seal', general: 'zhang_fei', left: 3 }]);
  assert.equal(rig.pressure.sealed('zhang_fei'), 3);
  assert.equal(rig.pressure.sealed('guan_yu'), 0);
  matches(rig.pressure, 1);
  misses(rig.pressure, 1);
  assert.deepEqual(rig.of('unseal'), [{ type: 'unseal', general: 'zhang_fei' }]);
  assert.equal(rig.pressure.sealed('zhang_fei'), 0);
});

test('AC boss roar target: 关羽 1/2 over 张飞 0/3; a tie goes to the earlier slot; all zero goes to the first', () => {
  const pick = (generals) => {
    const rig = bossRig({ chapter: withSpecials(['roar']), picture: SWEEP_PICTURE, generals });
    enterPhase2(rig.pressure);
    forceAttack(rig.pressure);
    return rig.of('seal')[0].general;
  };
  assert.equal(pick([{ id: 'guan_yu', charge: 1, need: 2 }, { id: 'zhang_fei', charge: 0, need: 3 }]), 'guan_yu');
  assert.equal(pick([{ id: 'zhang_fei', charge: 1, need: 2 }, { id: 'guan_yu', charge: 2, need: 4 }]), 'zhang_fei');
  assert.equal(pick([{ id: 'zhuge_liang', charge: 0, need: 4 }, { id: 'guan_yu', charge: 0, need: 2 }]), 'zhuge_liang');
});

test('AC boss slow=1: 6/5 steps -> 9 then 8; 8/6 -> 12 then 9; 5 -> 8 (7.5 rounded)', () => {
  const stepsFor = (s1, s2) => {
    const rig = bossRig({ chapter: luBuChapter({ boss: { enemy: 'lv_bu', hp: 12, steps: s1, phase2: { hp: 18, steps: s2 } } }), slow: true });
    const first = rig.pressure.hud().stepsMax;
    enterPhase2(rig.pressure);
    return [first, rig.pressure.hud().stepsMax];
  };
  assert.deepEqual(stepsFor(6, 5), [9, 8]);
  assert.deepEqual(stepsFor(8, 6), [12, 9]);
  assert.equal(stepsFor(5, 6)[0], 8);
});

// ---- outcome and metrics ----

test('AC boss phase 2 hp 1, steps 5/6, a match -> win at the settle point, no attack', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  enterPhase2(rig.pressure);
  matches(rig.pressure, 5);
  rig.pressure.onClear({ type: 'clear', pairs: 12 });
  assert.deepEqual([rig.pressure.hud().hp, rig.pressure.hud().steps], [1, 5]);
  matches(rig.pressure, 1);
  assert.equal(rig.pressure.outcome().result, 'win');
  rig.pressure.tick(16);
  assert.equal(attacks(rig).length, 0);
});

test('AC boss 3 normal attacks on 3 hearts -> 城破 at the settle point, heartsLost 3', () => {
  const { pressure } = bossRig({ chapter: oneBarChapter() });
  forceAttack(pressure);
  forceAttack(pressure);
  assert.equal(pressure.outcome().result, null);
  forceAttack(pressure);
  assert.deepEqual(pressure.outcome(), { result: 'lose', reason: '城破' });
  assert.deepEqual(pressure.metrics(), { heartsLost: 3 });
});

test('AC boss phase 2: special, blocked and broken attacks leave heartsLost unchanged', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  const { pressure } = rig;
  enterPhase2(pressure);
  const lost = () => pressure.metrics().heartsLost;
  forceAttack(pressure);
  assert.equal(lastAttack(rig).kind, 'special');
  assert.equal(lost(), 0);
  forceAttack(pressure); // normal
  assert.equal(lost(), 1);
  pressure.raiseShield();
  forceAttack(pressure);
  assert.equal(lastAttack(rig).kind, 'blocked');
  assert.equal(lost(), 1);
  forceAttack(pressure); // normal
  pressure.breakSpecial();
  forceAttack(pressure);
  assert.equal(lastAttack(rig).kind, 'broken');
  assert.equal(lost(), 2);
});

test('AC boss phase 2 hp 4: a fire match (-1) whose effect clears 3 pairs of camps -> hp 0, win', () => {
  const rig = bossRig({ chapter: luBuChapter(), picture: SWEEP_PICTURE });
  enterPhase2(rig.pressure);
  rig.pressure.onClear({ type: 'clear', pairs: 14 });
  assert.equal(rig.pressure.hud().hp, 4);
  rig.pressure.onMatch({ type: 'match', kind: 'huo', forced: false });
  rig.pressure.onClear({ type: 'clear', source: 'effect', kind: 'ying', pairs: 3 });
  assert.equal(rig.pressure.hud().hp, 0);
  assert.equal(rig.pressure.outcome().result, 'win');
});

test('AC boss only 2 empty cells: a normal attack places 1 pair and costs a heart', () => {
  const rig = bossRig({ chapter: oneBarChapter(), picture: TWO_FREE_PICTURE });
  forceAttack(rig.pressure);
  assert.equal(lastAttack(rig).cells.length, 2);
  assert.equal(rig.pressure.hud().hearts, 2);
  assert.equal(emptyCells(rig.board).length, 0);
});

test('AC outcome: win and lose both true -> win (boss hearts 0 and hp 0)', () => {
  const { pressure } = bossRig({ chapter: oneBarChapter({ boss: { enemy: 'wen_chou', hp: 3, steps: 8, hearts: 3 } }) });
  for (let i = 0; i < 3; i++) forceAttack(pressure);
  assert.equal(pressure.hud().hearts, 0);
  pressure.onClear({ type: 'clear', pairs: 3 });
  assert.equal(pressure.outcome().result, 'win');
});

test('AC metrics: boss metrics() is {heartsLost} with an integer', () => {
  const { pressure } = bossRig({ chapter: luBuChapter() });
  forceAttack(pressure);
  const m = pressure.metrics();
  assert.deepEqual(Object.keys(m), ['heartsLost']);
  assert.ok(Number.isInteger(m.heartsLost));
});

// ---- rotation, names, new enemies ----

test('AC specials [chain]: phase 2 attacks 1-3 are chain, normal, chain', () => {
  const rig = bossRig({ chapter: withSpecials(['chain']), picture: CHAIN_PICTURE });
  enterPhase2(rig.pressure);
  for (let i = 0; i < 3; i++) forceAttack(rig.pressure);
  assert.deepEqual(attacks(rig).map((e) => e.special || e.kind), ['chain', 'normal', 'chain']);
});

test('AC 夏侯渊 specialNames: forecast name 布鹿角, charge places CHARGE_BLOCKS roadblocks, next special banner 虎啸', () => {
  const enemies = { xiahou_yuan: { name: '夏侯渊', lines: ['老卒焉敢犯我！'], specialNames: { charge: '布鹿角' } } };
  const chapter = luBuChapter({ boss: { enemy: 'xiahou_yuan', hp: 16, steps: 7, hearts: 3, addPairs: 2,
    phase2: { hp: 18, steps: 6, specials: ['charge', 'roar'] } } });
  const rig = bossRig({ chapter, picture: SWEEP_PICTURE, enemies, generals: [{ id: 'guan_yu', charge: 0, need: 2 }] });
  enterPhase2(rig.pressure);
  rig.board.set(4, 5, null);
  rig.board.set(4, 6, null);
  matches(rig.pressure, 4);
  assert.equal(rig.pressure.hud().forecast.name, '布鹿角');
  misses(rig.pressure, 1);
  rig.pressure.tick(16);
  assert.deepEqual([lastAttack(rig).special, lastAttack(rig).name, lastAttack(rig).cells.length], ['charge', '布鹿角', 2]);
  forceAttack(rig.pressure);
  forceAttack(rig.pressure);
  assert.deepEqual([lastAttack(rig).special, lastAttack(rig).name], ['roar', '虎啸']);
});

test('AC 文丑 without phase2: 3 attacks are all normal (1 heart each), forecast always null, breakSpecial null', () => {
  const rig = bossRig({ chapter: oneBarChapter() });
  for (let i = 0; i < 3; i++) {
    for (let s = 0; s < 8; s++) {
      misses(rig.pressure, 1);
      assert.equal(rig.pressure.hud().forecast, null);
    }
    rig.pressure.tick(16);
  }
  assert.deepEqual(attacks(rig).map((e) => e.kind), ['normal', 'normal', 'normal']);
  assert.equal(rig.pressure.hud().hearts, 0);
  assert.equal(rig.pressure.breakSpecial(), null);
});

test('AC chain: exactly 4 top units turn from 书/旗 into 营; 火, buried cards and positions unchanged; kinds even; selection cleared; no hearts or adds', () => {
  const rig = bossRig({ chapter: withSpecials(['chain']), picture: CHAIN_PICTURE });
  const { pressure, board } = rig;
  enterPhase2(pressure);
  board.tap(1, 1);
  const before = board.cells();
  forceAttack(pressure);
  const ev = lastAttack(rig);
  assert.deepEqual([ev.kind, ev.special, ev.cells.length], ['special', 'chain', 4]);
  const after = board.cells();
  let changed = 0;
  for (let i = 0; i < before.length; i++) {
    assert.deepEqual(after[i].under, before[i].under);
    if (after[i].top === before[i].top) continue;
    changed++;
    assert.ok(['shu', 'qi'].indexOf(before[i].top) !== -1);
    assert.equal(after[i].top, 'ying');
  }
  assert.equal(changed, 4);
  for (const n of Object.values(kindCounts(board))) assert.equal(n % 2, 0);
  assert.equal(kindCounts(board).huo, 2);
  assert.equal(board.selection(), null);
  assert.equal(pressure.hud().hearts, 3);
});

test('AC chain determinism: same seed and board convert the same cells', () => {
  const run = () => {
    const rig = bossRig({ chapter: withSpecials(['chain']), picture: CHAIN_PICTURE });
    enterPhase2(rig.pressure);
    forceAttack(rig.pressure);
    return lastAttack(rig).cells;
  };
  assert.deepEqual(run(), run());
});

test('AC chain with only 营 and 火 on top: nothing converts, banner still fires, steps 0, rotation advances', () => {
  const picture = ['ying ying ying ying huo huo', 'jm jm jm jm jm jm', 'jm jm jm jm jm jm',
    'jm jm jm jm jm jm', 'jm jm jm jm jm jm', 'jm jm jm jm jm .'];
  const rig = bossRig({ chapter: withSpecials(['chain', 'sweep']), picture });
  enterPhase2(rig.pressure);
  const before = snap(rig.board);
  forceAttack(rig.pressure);
  assert.deepEqual([lastAttack(rig).special, lastAttack(rig).cells], ['chain', []]);
  assert.equal(snap(rig.board), before);
  assert.equal(rig.pressure.hud().steps, 0);
  assert.equal(rig.pressure.breakSpecial().special, 'sweep');
});

test('AC chain forecast + shield: blocked, nothing converts, shield false', () => {
  const rig = bossRig({ chapter: withSpecials(['chain']), picture: CHAIN_PICTURE });
  enterPhase2(rig.pressure);
  matches(rig.pressure, 4);
  assert.equal(rig.pressure.hud().forecast.id, 'chain');
  rig.pressure.raiseShield();
  const before = snap(rig.board);
  misses(rig.pressure, 1);
  rig.pressure.tick(16);
  assert.equal(lastAttack(rig).kind, 'blocked');
  assert.equal(snap(rig.board), before);
  assert.equal(rig.pressure.hasShield(), false);
});

test('AC chain forecast + breakSpecial: name 铁索连环, the attack is broken and converts nothing', () => {
  const rig = bossRig({ chapter: withSpecials(['chain']), picture: CHAIN_PICTURE });
  enterPhase2(rig.pressure);
  matches(rig.pressure, 4);
  const r = rig.pressure.breakSpecial();
  assert.deepEqual(r, { special: 'chain', name: '铁索连环', forecast: true });
  const before = snap(rig.board);
  misses(rig.pressure, 1);
  rig.pressure.tick(16);
  assert.deepEqual([lastAttack(rig).kind, lastAttack(rig).special], ['broken', 'chain']);
  assert.equal(snap(rig.board), before);
});

test('boss hp defaults to the deck pair count when boss.hp is omitted', () => {
  const rig = bossRig({ chapter: luBuChapter({ boss: { enemy: 'lv_bu', steps: 8 } }) });
  assert.equal(rig.pressure.hud().hp, 12);
  assert.equal(rig.pressure.hud().phases, 1);
});
