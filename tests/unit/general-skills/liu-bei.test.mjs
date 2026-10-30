// general-skills PART B: Liu Bei (rule 14a; formulas liu_gift, liu_heal /
// liu_food). GDD Acceptance Criteria section 刘备, skills side. The pressure
// halves (hearts / food arithmetic, 虎啸 tie-break, heartsLost) are
// battle-pressure's; the fake below follows battle-pressure rules 18a / 23e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIU_HEAL, LIU_FOOD } from '../../../src/rules/general-skills.mjs';
import { fakeSkills, fakePressure, stubBoard, charge } from '../../helpers/general-skills-fakes.mjs';

const KIND = { guan_yu: 'dao', zhang_fei: 'gu', zhao_yun: 'dun', zhuge_liang: 'shu', liu_bei: 'qi', huang_zhong: 'gong' };

// fakePressure plus Liu Bei's calls (battle-pressure rules 18a, 23e).
function liuPressure(mode, init) {
  const p = fakePressure(init && init.base);
  const s = Object.assign({ hearts: 3, heartsMax: 3, food: 0, food0: 0 }, init);
  Object.assign(p.impl, {
    canHeal: () => mode === 'boss' && s.hearts < s.heartsMax,
    healHeart(n) {
      p.calls.push(['healHeart', n]);
      if (mode !== 'boss') return 0;
      const gain = Math.max(0, Math.min(n, s.heartsMax - s.hearts));
      s.hearts += gain;
      return gain;
    },
    canRefill: () => mode === 'food' && s.food < s.food0,
    refillFood(n) {
      p.calls.push(['refillFood', n]);
      if (mode !== 'food') return 0;
      const gain = Math.max(0, Math.min(n, s.food0 - s.food));
      s.food += gain;
      return gain;
    },
  });
  return { impl: p.impl, s, calls: p.calls, base: p.s };
}

// Builds skills with `charges` {id: n} applied in slot order, events cleared.
function setup(mode, charges, pressureInit) {
  const p = liuPressure(mode, pressureInit);
  const loadout = Object.keys(charges);
  const f = fakeSkills({ loadout, mode, board: stubBoard(), pressure: p.impl });
  for (const id of loadout) charge(f.skills, KIND[id], charges[id]);
  f.events.length = 0;
  return Object.assign(f, { p });
}

function fireLiu(f) {
  assert.equal(f.skills.tapCard('liu_bei'), null);
  assert.equal(f.tokens.length, 1);
  f.end(f.tokens[0]);
}

test('AC Liu Bei boss: hearts 2/3, Guan 1/2, Zhang 3/3: heal 1, Guan 2/2 ready with skillReady, Zhang stays 3/3, Liu 0/3, banner heal + gift', () => {
  const f = setup('boss', { liu_bei: 3, guan_yu: 1, zhang_fei: 3 }, { hearts: 2 });
  assert.equal(f.skills.tapCard('liu_bei'), null);
  assert.equal(f.card('liu_bei').charge, 0);
  assert.equal(f.p.s.hearts, 2); // nothing before token end
  assert.equal(f.card('guan_yu').charge, 1);
  f.end(f.tokens[0]);
  assert.equal(f.p.s.hearts, 3);
  assert.deepEqual(f.p.calls, [['healHeart', LIU_HEAL]]); // no step call
  assert.equal(f.card('guan_yu').charge, 2);
  assert.equal(f.card('guan_yu').state, 'ready');
  assert.deepEqual(f.emitted('skillReady'), [{ type: 'skillReady', general: 'guan_yu' }]);
  assert.equal(f.card('zhang_fei').charge, 3);
  assert.equal(f.skills.skillsUsed().liu_bei, 1);
  assert.deepEqual(f.emitted('gift'), [{ type: 'gift', general: 'liu_bei', generals: ['guan_yu'] }]);
  assert.deepEqual(f.emitted('skillResult'), [{ type: 'skillResult', general: 'liu_bei', mode: 'boss', healed: 1, food: 0, gifted: 1 }]);
});

test('AC Liu Bei boss, hearts full and everyone full: noEffect heartsFullGeneralsFull, no token, charge kept', () => {
  const f = setup('boss', { liu_bei: 3, zhang_fei: 3 }, { hearts: 3 });
  assert.equal(f.skills.tapCard('liu_bei'), null);
  assert.equal(f.tokens.length, 0);
  assert.deepEqual(f.emitted('cardHint'), [{ type: 'cardHint', general: 'liu_bei', reason: 'noEffect', why: 'heartsFullGeneralsFull' }]);
  assert.equal(f.card('liu_bei').charge, 3);
  assert.equal(f.card('liu_bei').state, 'ready'); // keeps the ready look
});

test('AC Liu Bei boss, hearts full, Zhuge 2/4: Zhuge 3/4, no heal call, banner gift only (healed 0)', () => {
  const f = setup('boss', { liu_bei: 3, zhuge_liang: 2 }, { hearts: 3 });
  fireLiu(f);
  assert.equal(f.card('zhuge_liang').charge, 3);
  assert.equal(f.p.s.hearts, 3);
  assert.deepEqual(f.p.calls, []);
  assert.deepEqual(f.emitted('skillResult')[0], { type: 'skillResult', general: 'liu_bei', mode: 'boss', healed: 0, food: 0, gifted: 1 });
});

test('AC Liu Bei press: Guan 1/2 -> 2/2, Zhao Yun in stand-by stays at 0 in stand-by, no pressure call (push timer untouched)', () => {
  const f = setup('press', { liu_bei: 3, guan_yu: 1, zhao_yun: 3 });
  f.skills.tapCard('zhao_yun');
  f.end(f.tokens[0]);
  assert.equal(f.card('zhao_yun').state, 'standby');
  f.tokens.length = 0;
  f.events.length = 0;
  fireLiu(f);
  assert.equal(f.card('guan_yu').charge, 2);
  assert.equal(f.card('zhao_yun').charge, 0);
  assert.equal(f.card('zhao_yun').state, 'standby');
  assert.deepEqual(f.emitted('gift')[0].generals, ['guan_yu']);
  assert.deepEqual(f.p.calls, []);
  assert.deepEqual(f.emitted('skillResult')[0], { type: 'skillResult', general: 'liu_bei', mode: 'press', healed: 0, food: 0, gifted: 1 });
});

test('AC Liu Bei press, fielded alone: noEffect noGenerals, no token', () => {
  const f = setup('press', { liu_bei: 3 });
  f.skills.tapCard('liu_bei');
  assert.equal(f.tokens.length, 0);
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'liu_bei', reason: 'noEffect', why: 'noGenerals' });
});

test('Liu Bei press, others all full: noEffect generalsFull; alone in boss with a heart down still fires', () => {
  const f = setup('press', { liu_bei: 3, guan_yu: 2 });
  f.skills.tapCard('liu_bei');
  assert.equal(f.emitted('cardHint')[0].why, 'generalsFull');
  const g = setup('boss', { liu_bei: 3 }, { hearts: 2 });
  fireLiu(g);
  assert.equal(g.p.s.hearts, 3);
  assert.equal(g.emitted('gift').length, 0); // no one received: no gift event
  assert.equal(g.emitted('skillResult')[0].gifted, 0);
});

test('AC Liu Bei food, food0 16, food 15, others full: refillFood(2) gives 1 (16 not 17), banner food 1', () => {
  const f = setup('food', { liu_bei: 3, guan_yu: 2 }, { food: 15, food0: 16 });
  fireLiu(f);
  assert.deepEqual(f.p.calls, [['refillFood', LIU_FOOD]]);
  assert.equal(f.p.s.food, 16);
  assert.deepEqual(f.emitted('skillResult')[0], { type: 'skillResult', general: 'liu_bei', mode: 'food', healed: 0, food: 1, gifted: 0 });
});

test('AC Liu Bei food, food0 16, food 10, Guan 1/2: food 12, Guan 2/2, banner food 2 + gift', () => {
  const f = setup('food', { liu_bei: 3, guan_yu: 1 }, { food: 10, food0: 16 });
  fireLiu(f);
  assert.equal(f.p.s.food, 12);
  assert.equal(f.card('guan_yu').charge, 2);
  assert.deepEqual(f.emitted('skillResult')[0], { type: 'skillResult', general: 'liu_bei', mode: 'food', healed: 0, food: 2, gifted: 1 });
});

test('AC Liu Bei food, Zhang raised food 18 > food0 16, others full: noEffect foodFullGeneralsFull', () => {
  const f = setup('food', { liu_bei: 3, zhang_fei: 3 }, { food: 18, food0: 16 });
  f.skills.tapCard('liu_bei');
  assert.equal(f.tokens.length, 0);
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'liu_bei', reason: 'noEffect', why: 'foodFullGeneralsFull' });
});

test('AC Liu Bei before 虎啸: Guan 1/2 and Zhuge 3/4 become 2/2 and 4/4 in slot order, Liu 0/3 (the tie-break is battle-pressure)', () => {
  const f = setup('boss', { guan_yu: 1, zhuge_liang: 3, liu_bei: 3 }, { hearts: 3 });
  fireLiu(f);
  const ratios = f.skills.cards().map((c) => [c.general, c.charge / c.need]);
  assert.deepEqual(ratios, [['guan_yu', 1], ['zhuge_liang', 1], ['liu_bei', 0]]);
  assert.deepEqual(f.emitted('skillReady').map((e) => e.general), ['guan_yu', 'zhuge_liang']);
});

test('AC Liu Bei before 虎啸: skills binds pressure.bindGenerals, and the bound list shows the gifted charge', () => {
  const p = liuPressure('boss', { hearts: 3 });
  let read = null;
  p.impl.bindGenerals = (fn) => { read = fn; };
  const f = fakeSkills({ loadout: ['guan_yu', 'zhuge_liang', 'liu_bei'], mode: 'boss', board: stubBoard(), pressure: p.impl });
  charge(f.skills, 'dao', 1);
  charge(f.skills, 'shu', 3);
  charge(f.skills, 'qi', 3);
  assert.deepEqual(read(), [{ id: 'guan_yu', charge: 1, need: 2 }, { id: 'zhuge_liang', charge: 3, need: 4 }, { id: 'liu_bei', charge: 3, need: 3 }]);
  fireLiu(f);
  assert.deepEqual(read(), [{ id: 'guan_yu', charge: 2, need: 2 }, { id: 'zhuge_liang', charge: 4, need: 4 }, { id: 'liu_bei', charge: 0, need: 3 }]);
});

test('AC Liu Bei and a sealed Zhang 2/3 (2 steps left): Zhang 3/3 but still sealed 2; ready once the seal lifts', () => {
  const f = setup('boss', { liu_bei: 3, zhang_fei: 2 }, { hearts: 2, base: { sealed: { zhang_fei: 2 } } });
  fireLiu(f);
  const zhang = f.card('zhang_fei');
  assert.equal(zhang.charge, 3);
  assert.equal(zhang.state, 'sealed');
  assert.equal(zhang.sealed, 2);
  f.p.base.sealed = {};
  assert.equal(f.card('zhang_fei').state, 'ready');
  assert.equal(f.card('zhang_fei').hint, null);
});

test('Liu Bei LIU_GIFT override 2 caps at need (formula liu_gift)', () => {
  const p = liuPressure('press');
  const f = fakeSkills({ loadout: ['liu_bei', 'zhuge_liang', 'guan_yu'], mode: 'press', board: stubBoard(), pressure: p.impl, constants: { LIU_GIFT: 2 } });
  charge(f.skills, 'qi', 3);
  charge(f.skills, 'shu', 1);
  charge(f.skills, 'dao', 1);
  fireLiu(f);
  assert.equal(f.card('zhuge_liang').charge, 3);
  assert.equal(f.card('guan_yu').charge, 2);
});
