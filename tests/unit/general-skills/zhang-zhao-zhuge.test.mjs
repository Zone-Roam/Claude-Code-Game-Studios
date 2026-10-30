// general-skills: the skill token and effect at token end (rule 8), Zhang Fei
// (rule 12), Zhao Yun (rule 13) and Zhuge Liang (rule 14). GDD Acceptance
// Criteria sections 张飞, 赵云, 诸葛亮. Step, shield-block and push timing are
// battle-pressure's side; here the calls skills makes are checked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_SHOW_MS, ZHANG_PUSHBACK, ZHANG_STUN, ROAR_FOOD } from '../../../src/rules/general-skills.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeSkills, fakePressure, stubBoard, charge } from '../../helpers/general-skills-fakes.mjs';

const EMPTY = '. . . . . .';
// gu pair at (2,2)/(2,5) walled in by qi: unconnectable; qi (1,1)/(1,2) adjacent.
const WALLED = [
  'qi qi qi qi qi qi',
  'qi gu qi qi gu qi',
  'qi qi qi qi qi qi',
  EMPTY, EMPTY, EMPTY,
];
// dun pair walled in: forced match of a dun pair.
const WALLED_DUN = [
  'qi qi qi qi qi qi',
  'qi dun qi qi dun qi',
  'qi qi qi qi qi qi',
  EMPTY, EMPTY, EMPTY,
];
// shu: 6 top + 4 under = 10; qi 8; dao 2.
const SHU_10 = [
  'shu/shu shu/shu shu/shu shu/shu qi qi',
  'shu shu qi qi qi qi',
  'qi qi dao dao . .',
  EMPTY, EMPTY, EMPTY,
];
const CHENG_QI_TIE = [
  'cheng cheng cheng cheng qi qi',
  'cheng cheng cheng cheng qi qi',
  'qi qi qi qi . .',
  EMPTY, EMPTY, EMPTY,
];
const HUO_MOST = [
  'huo huo huo huo ying ying',
  'huo huo . . . .',
  EMPTY, EMPTY, EMPTY, EMPTY,
];

function readyZhang(mode, pressure) {
  const f = fakeSkills({ loadout: ['zhang_fei'], mode, board: stubBoard(), pressure: pressure.impl });
  charge(f.skills, 'gu', 3);
  return f;
}

test('AC skill token: tapping a ready card clears the selection, zeroes charge, holds skill 950 ms; effect only at token end', () => {
  const p = fakePressure();
  const board = stubBoard();
  const f = fakeSkills({ loadout: ['zhang_fei'], mode: 'boss', board, pressure: p.impl });
  charge(f.skills, 'gu', 3);
  assert.equal(f.skills.tapCard('zhang_fei'), null);
  assert.equal(board.s.cleared, 1);
  assert.equal(f.tokens.length, 1);
  assert.equal(f.tokens[0].reason, 'skill');
  assert.equal(f.tokens[0].durationMs, SKILL_SHOW_MS);
  assert.equal(SKILL_SHOW_MS, 950);
  assert.equal(f.card('zhang_fei').charge, 0);
  assert.deepEqual(p.calls, [], 'nothing lands while the show runs');
  f.end(f.tokens[0]);
  assert.deepEqual(p.calls, [['roarBack', ZHANG_PUSHBACK, ZHANG_STUN]]);
  assert.deepEqual(f.released, [f.tokens[0]]);
  assert.equal(f.card('zhang_fei').state, 'charging');
});

test('AC Zhang Fei boss: roarBack(3, 3) at token end (steps 5 -> 2, stun set to 3: battle-pressure)', () => {
  const p = fakePressure();
  const f = readyZhang('boss', p);
  f.skills.tapCard('zhang_fei');
  f.end(f.tokens[0]);
  assert.deepEqual(p.calls, [['roarBack', 3, 3]]);
});

test('AC Zhang Fei boss steps 0: a ready Zhang Fei still fires (no roarUseless hint)', () => {
  const p = fakePressure({ canScare: false });
  const f = readyZhang('boss', p);
  f.skills.tapCard('zhang_fei');
  assert.equal(f.emitted('cardHint').length, 0);
  assert.equal(f.tokens.length, 1);
});

test('AC Zhang Fei press, bottom row has units: scareNextPush at token end', () => {
  const p = fakePressure({ canScare: true });
  const f = readyZhang('press', p);
  f.skills.tapCard('zhang_fei');
  assert.deepEqual(p.calls, []);
  f.end(f.tokens[0]);
  assert.deepEqual(p.calls, [['scareNextPush']]);
});

test('AC Zhang Fei press, bottom row empty: cardHint noEffect roarUseless, still ready', () => {
  const p = fakePressure({ canScare: false });
  const f = readyZhang('press', p);
  f.skills.tapCard('zhang_fei');
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'zhang_fei', reason: 'noEffect', why: 'roarUseless' });
  assert.equal(f.card('zhang_fei').state, 'ready');
  assert.equal(f.tokens.length, 0);
});

test('AC Zhang Fei food: addFood(ROAR_FOOD = 3) at token end', () => {
  const p = fakePressure();
  const f = readyZhang('food', p);
  f.skills.tapCard('zhang_fei');
  f.end(f.tokens[0]);
  assert.deepEqual(p.calls, [['addFood', ROAR_FOOD]]);
  assert.equal(ROAR_FOOD, 3);
});

test('AC Zhao Yun boss: raiseShield at token end, Zhao 0/3 charging, no stand-by', () => {
  const p = fakePressure();
  const board = stubBoard();
  const f = fakeSkills({ loadout: ['zhao_yun'], mode: 'boss', board, pressure: p.impl });
  charge(f.skills, 'dun', 3);
  f.skills.tapCard('zhao_yun');
  f.end(f.tokens[0]);
  assert.deepEqual(p.calls, [['raiseShield']]);
  assert.equal(p.impl.hasShield(), true);
  assert.equal(board.forceNext(), false);
  assert.equal(f.card('zhao_yun').state, 'charging');
  assert.equal(f.card('zhao_yun').charge, 0);
});

function standbyOn(picture, mode, need) {
  const board = boardFromPicture(picture);
  const f = fakeSkills({ loadout: ['zhao_yun', 'zhang_fei'], mode: mode || 'press', board, need });
  charge(f.skills, 'dun', need ? need.zhao_yun : 3);
  f.skills.tapCard('zhao_yun');
  f.end(f.tokens[0]);
  return { board, f };
}

test('AC Zhao Yun stand-by: press, connectable same-kind pair -> forced match, leaves stand-by', () => {
  const { board, f } = standbyOn(WALLED);
  assert.equal(board.forceNext(), true);
  assert.equal(f.card('zhao_yun').state, 'standby');
  assert.deepEqual(f.emitted('skillArmed'), [{ type: 'skillArmed', general: 'zhao_yun' }]);
  board.tap(1, 1);
  const ev = board.tap(1, 2);
  assert.equal(ev.forced, true);
  f.skills.onMatch(ev);
  assert.equal(f.card('zhao_yun').state, 'charging');
  assert.equal(f.emitted('skillArmedSpent').length, 1);
});

test('AC Zhao Yun stand-by: unconnectable gu pair is cleared and charges Zhang Fei', () => {
  const { board, f } = standbyOn(WALLED);
  board.tap(2, 2);
  const ev = board.tap(2, 5);
  assert.equal(ev.type, 'match');
  assert.equal(ev.forced, true);
  f.skills.onMatch(ev);
  assert.equal(f.card('zhao_yun').state, 'charging');
  assert.equal(f.card('zhang_fei').charge, 1);
});

test('AC Zhao Yun stand-by tapped: cardHint standby, not uncharged', () => {
  const { f } = standbyOn(WALLED);
  f.skills.tapCard('zhao_yun');
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'zhao_yun', reason: 'standby' });
});

test('AC Zhao Yun spends stand-by with a dun pair -> 1/3 charging; need 1 -> ready at once', () => {
  const a = standbyOn(WALLED_DUN);
  a.board.tap(2, 2);
  a.f.skills.onMatch(a.board.tap(2, 5));
  assert.equal(a.f.card('zhao_yun').charge, 1);
  assert.equal(a.f.card('zhao_yun').state, 'charging');
  const b = standbyOn(WALLED_DUN, 'press', { zhao_yun: 1 });
  b.board.tap(2, 2);
  b.f.skills.onMatch(b.board.tap(2, 5));
  assert.equal(b.f.card('zhao_yun').charge, 1);
  assert.equal(b.f.card('zhao_yun').state, 'ready');
});

test('AC Zhao Yun stand-by: two different kinds selected -> still in stand-by', () => {
  const { board, f } = standbyOn(WALLED);
  board.tap(2, 2);
  const ev = board.tap(1, 1);
  assert.notEqual(ev && ev.type, 'match');
  assert.equal(board.forceNext(), true);
  assert.equal(f.card('zhao_yun').state, 'standby');
});

test('AC Zhao Yun stand-by ends with the round: a new round starts 0/3, not in stand-by', () => {
  const first = standbyOn(WALLED);
  assert.equal(first.f.card('zhao_yun').state, 'standby');
  const again = fakeSkills({ loadout: ['zhao_yun'], mode: 'press', board: boardFromPicture(WALLED) });
  assert.equal(again.card('zhao_yun').charge, 0);
  assert.equal(again.card('zhao_yun').state, 'charging');
});

test('AC Zhao Yun food stand-by: a forced match makes no pressure call from skills (food: battle-pressure)', () => {
  const p = fakePressure();
  const board = boardFromPicture(WALLED);
  const f = fakeSkills({ loadout: ['zhao_yun'], mode: 'food', board, pressure: p.impl });
  charge(f.skills, 'dun', 3);
  f.skills.tapCard('zhao_yun');
  f.end(f.tokens[0]);
  board.tap(2, 2);
  f.skills.onMatch(board.tap(2, 5));
  assert.deepEqual(p.calls, []);
});

function fireZhuge(picture, pressureInit, mode) {
  const board = boardFromPicture(picture);
  const p = fakePressure(pressureInit);
  const f = fakeSkills({ loadout: ['zhuge_liang'], mode: mode || 'boss', board, pressure: p.impl });
  charge(f.skills, 'shu', 4);
  f.skills.tapCard('zhuge_liang');
  return { board, p, f };
}

test('AC Zhuge: shu 6 top + 4 under, qi 8 -> all 10 shu cleared, skillResult shu 5 pairs, clear dispatched for damage', () => {
  const { board, f } = fireZhuge(SHU_10, { hasPhase2: false });
  assert.equal(board.count('shu'), 10, 'nothing before token end');
  f.end(f.tokens[0]);
  assert.equal(board.count('shu'), 0);
  assert.equal(board.count('qi'), 8);
  assert.equal(f.dispatched.length, 1);
  assert.equal(f.dispatched[0].source, 'skill');
  assert.equal(f.dispatched[0].pairs, 5);
  assert.deepEqual(f.emitted('skillResult'), [{
    type: 'skillResult', general: 'zhuge_liang', kind: 'shu', pairs: 5, special: null, forecast: false,
  }]);
});

test('AC Zhuge tie: cheng 8 and qi 8 -> cheng cleared (kind order)', () => {
  const { board, f } = fireZhuge(CHENG_QI_TIE, { hasPhase2: false });
  f.end(f.tokens[0]);
  assert.equal(board.count('cheng'), 0);
  assert.equal(board.count('qi'), 8);
});

test('AC Zhuge huo most: huo cleared, ying untouched (no effect triggered: source skill)', () => {
  const { board, f } = fireZhuge(HUO_MOST, { hasPhase2: false });
  f.end(f.tokens[0]);
  assert.equal(board.count('huo'), 0);
  assert.equal(board.count('ying'), 2);
  assert.equal(f.dispatched[0].source, 'skill');
});

test('AC Zhuge forecast lit: banner data special charge with forecast true', () => {
  const { f } = fireZhuge(SHU_10, { next: 'charge', forecast: 'charge' });
  f.end(f.tokens[0]);
  const r = f.emitted('skillResult')[0];
  assert.equal(r.special, 'charge');
  assert.equal(r.forecast, true);
});

test('AC Zhuge no forecast (normal attack next, or phase 1): special set, forecast false (view shows the 破 tag from hud)', () => {
  const { p, f } = fireZhuge(SHU_10, { next: 'sweep', forecast: null });
  f.end(f.tokens[0]);
  const r = f.emitted('skillResult')[0];
  assert.equal(r.special, 'sweep');
  assert.equal(r.forecast, false);
  assert.equal(p.s.broken, true);
});

test('AC Zhuge already broken: only clears, banner without special', () => {
  const { f } = fireZhuge(SHU_10, { broken: true, forecast: 'charge' });
  f.end(f.tokens[0]);
  assert.equal(f.emitted('skillResult')[0].special, null);
  assert.equal(f.emitted('skillResult')[0].pairs, 5);
});

test('Zhuge in press mode: no breakSpecial call', () => {
  const { p, f } = fireZhuge(SHU_10, {}, 'press');
  f.end(f.tokens[0]);
  assert.deepEqual(p.calls, []);
});

test('Zhuge on a board with no units: cardHint noEffect boardEmpty', () => {
  const f = fakeSkills({ loadout: ['zhuge_liang'], mode: 'boss', board: stubBoard({ pairsLeft: 0 }) });
  charge(f.skills, 'shu', 4);
  f.skills.tapCard('zhuge_liang');
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'zhuge_liang', reason: 'noEffect', why: 'boardEmpty' });
});
