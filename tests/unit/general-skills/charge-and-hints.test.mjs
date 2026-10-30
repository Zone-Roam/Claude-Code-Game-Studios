// general-skills: charging (rules 2-5), card states, the hint order (rules 6-7),
// skillsUsed (rule 17) and the open-card skill lines (rule 18). GDD Acceptance
// Criteria sections 蓄力, 不能释放与提示顺序 and 水牌.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSkills, GENERALS, SKILL_LINES, skillLine } from '../../../src/rules/general-skills.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeSkills, fakePressure, stubBoard, charge, match } from '../../helpers/general-skills-fakes.mjs';

const DAO_MOST = [
  'dao dao dao dao shu shu',
  'dao/dao dao/dao shu shu . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
];

test('AC charge: Guan Yu 0/2 -> two dao pairs -> 2/2 ready with skillReady once; a third pair stays 2/2', () => {
  const f = fakeSkills({ loadout: ['guan_yu'], mode: 'boss', board: stubBoard() });
  charge(f.skills, 'dao', 1);
  assert.equal(f.card('guan_yu').charge, 1);
  assert.equal(f.card('guan_yu').state, 'charging');
  charge(f.skills, 'dao', 1);
  assert.equal(f.card('guan_yu').charge, 2);
  assert.equal(f.card('guan_yu').state, 'ready');
  assert.deepEqual(f.emitted('skillReady'), [{ type: 'skillReady', general: 'guan_yu' }]);
  charge(f.skills, 'dao', 1);
  assert.equal(f.card('guan_yu').charge, 2);
  assert.equal(f.emitted('skillReady').length, 1);
});

test('AC default need: guan 0/2, zhang 0/3, zhao 0/3, liu 0/3, huang 0/3, zhuge 0/4', () => {
  const want = { guan_yu: 2, zhang_fei: 3, zhao_yun: 3, liu_bei: 3, huang_zhong: 3, zhuge_liang: 4 };
  for (const loadout of [['guan_yu', 'zhang_fei', 'zhao_yun'], ['liu_bei', 'huang_zhong', 'zhuge_liang']]) {
    const f = fakeSkills({ loadout, mode: 'boss', board: stubBoard() });
    for (const c of f.skills.cards()) {
      assert.equal(c.charge, 0);
      assert.equal(c.need, want[c.general]);
      assert.equal(c.need, GENERALS[c.general].need);
    }
  }
});

test('AC need override: need {zhuge_liang: 3} -> zhuge 0/3, others keep defaults', () => {
  const f = fakeSkills({ loadout: ['zhuge_liang', 'guan_yu'], mode: 'boss', board: stubBoard(), need: { zhuge_liang: 3 } });
  assert.equal(f.card('zhuge_liang').need, 3);
  assert.equal(f.card('guan_yu').need, 2);
});

test('need override outside 1..4, unknown, repeated or more than 3 generals are refused', () => {
  const base = { chapter: { mode: 'boss' }, board: stubBoard(), pressure: fakePressure().impl, emit() {} };
  assert.throws(() => createSkills(Object.assign({}, base, { loadout: ['guan_yu'], chapter: { mode: 'boss', need: { guan_yu: 5 } } })), RangeError);
  assert.throws(() => createSkills(Object.assign({}, base, { loadout: ['lu_bu'] })), RangeError);
  assert.throws(() => createSkills(Object.assign({}, base, { loadout: ['guan_yu', 'guan_yu'] })), RangeError);
  assert.throws(() => createSkills(Object.assign({}, base, { loadout: ['guan_yu', 'zhang_fei', 'zhao_yun', 'liu_bei'] })), RangeError);
});

test('AC skill clears do not charge: Zhuge clears every dao (with buried) -> Guan Yu stays 0/2', () => {
  const board = boardFromPicture(DAO_MOST);
  const f = fakeSkills({ loadout: ['guan_yu', 'zhuge_liang'], mode: 'boss', board, pressure: fakePressure({ hasPhase2: false }).impl });
  charge(f.skills, 'shu', 4);
  f.skills.tapCard('zhuge_liang');
  f.end(f.tokens[0]);
  assert.equal(board.count('dao'), 0);
  assert.equal(f.dispatched[0].source, 'skill');
  assert.equal(f.card('guan_yu').charge, 0);
});

test('AC only fielded generals: Zhang Fei + Zhao Yun, a dao pair charges nobody; two cards', () => {
  const f = fakeSkills({ loadout: ['zhang_fei', 'zhao_yun'], mode: 'boss', board: stubBoard() });
  f.skills.onMatch(match('dao'));
  assert.equal(f.skills.cards().length, 2);
  assert.ok(f.skills.cards().every((c) => c.charge === 0));
});

test('AC uncharged hint: Zhuge 1/4 tapped -> cardHint uncharged shu short 3, charge 1/4, no token', () => {
  const f = fakeSkills({ loadout: ['zhuge_liang'], mode: 'boss', board: stubBoard() });
  charge(f.skills, 'shu', 1);
  assert.equal(f.skills.tapCard('zhuge_liang'), null);
  assert.deepEqual(f.emitted('cardHint'), [{ type: 'cardHint', general: 'zhuge_liang', reason: 'uncharged', kind: 'shu', short: 3 }]);
  assert.equal(f.card('zhuge_liang').charge, 1);
  assert.equal(f.tokens.length, 0);
});

test('AC sealed hint: Zhuge 4/4 sealed 2 -> cardHint sealed left 2, no token, charge kept', () => {
  const p = fakePressure({ sealed: { zhuge_liang: 2 } });
  const f = fakeSkills({ loadout: ['zhuge_liang'], mode: 'boss', board: stubBoard(), pressure: p.impl });
  charge(f.skills, 'shu', 4);
  f.skills.tapCard('zhuge_liang');
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'zhuge_liang', reason: 'sealed', left: 2 });
  assert.equal(f.tokens.length, 0);
  assert.equal(f.card('zhuge_liang').charge, 4);
  assert.equal(f.card('zhuge_liang').state, 'sealed');
});

test('AC hint order: Zhang Fei 1/3 sealed 3 -> sealed wins over uncharged', () => {
  const p = fakePressure({ sealed: { zhang_fei: 3 } });
  const f = fakeSkills({ loadout: ['zhang_fei'], mode: 'boss', board: stubBoard(), pressure: p.impl });
  charge(f.skills, 'gu', 1);
  f.skills.tapCard('zhang_fei');
  assert.equal(f.emitted('cardHint')[0].reason, 'sealed');
  assert.equal(f.emitted('cardHint')[0].left, 3);
});

test('AC seal lifted: when pressure.sealed drops to 0 the card is back (ready if full) [countdown itself: battle-pressure]', () => {
  const p = fakePressure({ sealed: { zhang_fei: 2 } });
  const f = fakeSkills({ loadout: ['zhang_fei'], mode: 'boss', board: stubBoard(), pressure: p.impl });
  charge(f.skills, 'gu', 3);
  assert.equal(f.card('zhang_fei').state, 'sealed');
  charge(f.skills, 'gu', 1);
  p.s.sealed.zhang_fei = 0;
  assert.equal(f.card('zhang_fei').state, 'ready');
  assert.equal(f.card('zhang_fei').hint, null);
});

test('AC sealed still charges: a sealed general charges normally', () => {
  const p = fakePressure({ sealed: { zhang_fei: 2 } });
  const f = fakeSkills({ loadout: ['zhang_fei'], mode: 'boss', board: stubBoard(), pressure: p.impl });
  charge(f.skills, 'gu', 2);
  assert.equal(f.card('zhang_fei').charge, 2);
});

test('AC shield hint: boss, Zhao Yun 3/3 with a shield -> cardHint noEffect hasShield, stays ready, charge 3/3', () => {
  const p = fakePressure({ shield: true });
  const f = fakeSkills({ loadout: ['zhao_yun'], mode: 'boss', board: stubBoard(), pressure: p.impl });
  charge(f.skills, 'dun', 3);
  f.skills.tapCard('zhao_yun');
  assert.deepEqual(f.emitted('cardHint')[0], { type: 'cardHint', general: 'zhao_yun', reason: 'noEffect', why: 'hasShield' });
  assert.equal(f.card('zhao_yun').state, 'ready');
  assert.equal(f.card('zhao_yun').charge, 3);
  assert.equal(f.tokens.length, 0);
});

test('a second card tap while a skill token is held does nothing', () => {
  const f = fakeSkills({ loadout: ['zhang_fei', 'zhao_yun'], mode: 'boss', board: stubBoard() });
  charge(f.skills, 'gu', 3);
  charge(f.skills, 'dun', 3);
  f.skills.tapCard('zhang_fei');
  assert.equal(f.card('zhang_fei').state, 'show');
  f.skills.tapCard('zhao_yun');
  assert.equal(f.tokens.length, 1);
  assert.equal(f.card('zhao_yun').charge, 3);
});

test('rule 17: skillsUsed counts each fielded general', () => {
  const f = fakeSkills({ loadout: ['zhang_fei', 'zhao_yun'], mode: 'boss', board: stubBoard() });
  charge(f.skills, 'gu', 3);
  f.skills.tapCard('zhang_fei');
  f.end(f.tokens[0]);
  assert.deepEqual(f.skills.skillsUsed(), { zhang_fei: 1, zhao_yun: 0 });
});

test('AC skill lines (boss): Guan, Zhang, Zhuge lines as in rule 18, each <= 12 chars', () => {
  assert.equal(skillLine('guan_yu', 'boss'), '点选一排，整排斩掉');
  assert.equal(skillLine('zhang_fei', 'boss'), '敌将退三步，三步不涨');
  assert.equal(skillLine('zhuge_liang', 'boss'), '清最多的兵，破下一个特技');
  for (const id of Object.keys(SKILL_LINES)) {
    for (const mode of ['boss', 'press', 'food']) assert.ok(Array.from(SKILL_LINES[id][mode]).length <= 12, id + ' ' + mode);
  }
});

test('AC skill lines (food, press): Liu Bei and Huang Zhong defaults; chapter texts override', () => {
  assert.equal(skillLine('liu_bei', 'food'), '补两份粮，众将各蓄一格');
  assert.equal(skillLine('huang_zhong', 'food'), '点选一列，整列射穿');
  assert.equal(skillLine('liu_bei', 'press'), '众将各蓄一格');
  assert.equal(skillLine('liu_bei', 'food', { skillLine: { liu_bei: { food: '补两份粮' } } }), '补两份粮');
});
