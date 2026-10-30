// The view's pure wording helpers: hint codes, skill results, the pressure HUD
// line per mode, and the picker button intent (src/view/view.mjs, src/view/input.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintText, resultText, hudLine } from '../../../src/view/view.mjs';
import { buttonIntent } from '../../../src/view/input.mjs';
import { SPECIAL_NAMES } from '../../../src/rules/battle-pressure.mjs';

test('hintText words every general-skills hint code; null is empty', () => {
  assert.equal(hintText(null), '');
  assert.equal(hintText({ reason: 'uncharged', kind: 'dao', short: 2 }), '再连 2 对刀');
  assert.equal(hintText({ reason: 'sealed', left: 3 }), '被镇住 3 步');
  assert.equal(hintText({ reason: 'standby' }), '已布阵，等下一对');
  for (const why of ['roarUseless', 'hasShield', 'boardEmpty', 'heartsFullGeneralsFull', 'foodFullGeneralsFull', 'noGenerals', 'generalsFull']) {
    assert.notEqual(hintText({ reason: 'noEffect', why }), '', why);
  }
});

test('resultText: Zhuge Liang clear with a broken special; Liu Bei joins heal / food / gift', () => {
  assert.equal(resultText({ general: 'zhuge_liang', kind: 'qi', pairs: 3, special: 'roar' }, SPECIAL_NAMES), '清掉 3 对旗，识破虎啸');
  assert.equal(resultText({ general: 'zhuge_liang', kind: 'qi', pairs: 3, special: null }, SPECIAL_NAMES), '清掉 3 对旗');
  assert.equal(resultText({ general: 'liu_bei', healed: 1, food: 0, gifted: 2 }, SPECIAL_NAMES), '补心 1，2 将各蓄一格');
  assert.equal(resultText({ general: 'liu_bei', healed: 0, food: 2, gifted: 0 }, SPECIAL_NAMES), '补粮 2');
});

test('hudLine press: countdown fill, tier 2 near a push, tier 3 when the bottom row holds a unit', () => {
  const base = { mode: 'press', msToNextPush: 6000, interval: 12000, wave: 2, waves: 6, bottomOccupied: false, scareArmed: false };
  assert.deepEqual(hudLine(base), { label: '6 秒后压下一排 · 2/6', tier: 1, fill: 0.5 });
  assert.equal(hudLine(Object.assign({}, base, { msToNextPush: 2000 })).tier, 2);
  const danger = hudLine(Object.assign({}, base, { bottomOccupied: true }));
  assert.equal(danger.tier, 3);
  assert.equal(danger.label, '底排有兵，再压就破城');
  assert.equal(hudLine(Object.assign({}, base, { wave: 6 })).label, '敌军压尽，清完就赢');
});

test('hudLine food and boss: food bar and warning; boss steps, stun, forecast', () => {
  assert.deepEqual(hudLine({ mode: 'food', food: 8, food0: 16 }), { label: '粮草 8/16', tier: 1, fill: 0.5 });
  assert.equal(hudLine({ mode: 'food', food: 1, food0: 16 }).tier, 3);
  const boss = { mode: 'boss', stepsLeft: 3, stun: 0, tier: 1, forecast: null, shield: false };
  assert.deepEqual(hudLine(boss), { label: '还有 3 步出手', tier: 1, fill: null });
  assert.equal(hudLine(Object.assign({}, boss, { stun: 2 })).label, '震慑中 · 2 步不涨');
  assert.equal(hudLine(Object.assign({}, boss, { forecast: { name: '虎啸', broken: true } })).label, '下招：虎啸（已识破）');
});

test('buttonIntent carries a 0-based slot or a general for the picker', () => {
  assert.deepEqual(buttonIntent('start', null, null), { type: 'button', button: 'start' });
  assert.deepEqual(buttonIntent('clear', '2', null), { type: 'button', button: 'clear', slot: 2 });
  assert.deepEqual(buttonIntent('slot', '0', null), { type: 'button', button: 'slot', slot: 0 });
  assert.deepEqual(buttonIntent('pick', null, 'zhao_yun'), { type: 'button', button: 'pick', general: 'zhao_yun' });
});
