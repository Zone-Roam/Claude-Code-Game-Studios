// Story clear-effects/005: skills and boss attacks leave the combo alone; combo label text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comboLabel } from '../../../src/rules/clear-effects.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeEffects, plainMatch } from '../../helpers/effects-fakes.mjs';

// Eight 火 (four pairs) on top, plus a 刀 pair to match afterwards.
const BOARD = [
  'huo huo huo huo . .',
  'huo huo huo huo . .',
  'dao dao .   .   . .',
  '.   .   .   .   . .',
  '.   .   .   .   . .',
  '.   .   .   .   . .',
];

// The round would hand a neutral event to neither entry; feeding it to both
// proves neither entry reacts to it.
function feed(effects, ev) {
  effects.onMatch(ev);
  effects.onMiss(ev);
}

test('AC1 combo 4, Zhuge Liang clears 4 pairs, then one match -> combo 5', () => {
  const board = boardFromPicture(BOARD);
  const f = fakeEffects(board);
  for (let i = 0; i < 4; i += 1) f.effects.onMatch(plainMatch());
  const clear = board.clearKind('huo', 'skill');
  assert.equal(clear.type, 'clear');
  assert.equal(clear.pairs, 4);
  feed(f.effects, clear);
  assert.equal(f.effects.combo(), 4, 'the skill clear neither adds nor breaks');
  board.tap(3, 1);
  const ev = board.tap(3, 2);
  assert.equal(ev.type, 'match');
  f.effects.onMatch(ev);
  assert.equal(f.effects.combo(), 5);
});

test('AC2 combo 3, boss attacks (normal, special, blocked) and other neutral events -> combo 3', () => {
  const f = fakeEffects(null);
  for (let i = 0; i < 3; i += 1) f.effects.onMatch(plainMatch());
  const neutral = [
    { type: 'hostAttack', kind: 'normal' },
    { type: 'hostAttack', kind: 'special' },
    { type: 'hostAttack', kind: 'blocked' },
    { type: 'reshuffle', fallback: false },
    { type: 'state', from: 'play', to: 'select' },
    { type: 'clear', source: 'skill', cells: [], buried: 0, revealed: [], pairs: 2 },
  ];
  for (const ev of neutral) feed(f.effects, ev);
  assert.equal(f.effects.combo(), 3);
  assert.equal(f.effects.maxCombo(), 3);
});

test('AC3 combo label: none below 2, 二连斩 .. 十二连斩, 连斩不断 from 13', () => {
  assert.equal(comboLabel(0), '');
  assert.equal(comboLabel(1), '');
  assert.equal(comboLabel(2), '二连斩');
  assert.equal(comboLabel(5), '五连斩');
  assert.equal(comboLabel(10), '十连斩');
  assert.equal(comboLabel(11), '十一连斩');
  assert.equal(comboLabel(12), '十二连斩');
  assert.equal(comboLabel(13), '连斩不断');
  assert.equal(comboLabel(999), '连斩不断');
});
