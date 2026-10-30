// Story clear-effects/001: effect table, trigger rule, "target already gone".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_TARGETS } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeEffects, tapPair, plainMatch } from '../../helpers/effects-fakes.mjs';

// 水 pair at (5,1)-(5,2); no 城 on either layer.
const NO_CHENG = [
  'dao/gu dao ying ying . .',
  '.      .   .    .    . .',
  '.      .   .    .    . .',
  '.      .   .    .    . gu',
  'shui   shui .   .    . .',
  '.      .   .    .    . .',
];

// Four 火 and two 营 on top; row 3 holds a 马 pair, 弓 elsewhere.
const SKILL_BOARD = [
  'huo  huo  ying ying . .',
  'huo  huo  .    .    . .',
  'ma   ma   dao  dao  . .',
  'gong gong .    .    . .',
  '.    .    .    .    . .',
  '.    .    .    .    . .',
];

test('effect table: 火->营, 马->弓, 水->城, and no effect kind is a target', () => {
  assert.deepEqual(Object.assign({}, EFFECT_TARGETS), { huo: 'ying', ma: 'gong', shui: 'cheng' });
  const targets = Object.keys(EFFECT_TARGETS).map((k) => EFFECT_TARGETS[k]);
  for (const kind of Object.keys(EFFECT_TARGETS)) assert.equal(targets.indexOf(kind), -1);
});

test('AC1 水 pair with no 城 anywhere: pair cleared, targetGone {kind: cheng}, no token', () => {
  const board = boardFromPicture(NO_CHENG);
  const f = fakeEffects(board);
  const ev = tapPair(board, { r: 5, c: 1 }, { r: 5, c: 2 });
  assert.equal(ev.type, 'match');
  const out = f.effects.onMatch(ev);
  assert.deepEqual(out, { type: 'targetGone', kind: 'cheng' });
  assert.deepEqual(f.calls, [['emit', { type: 'targetGone', kind: 'cheng' }]]);
  assert.equal(f.tokens.length, 0, 'no effect token');
  assert.equal(board.count('shui'), 0, 'the 水 pair itself is gone');
});

test('a match of a non-effect kind does nothing', () => {
  const board = boardFromPicture(NO_CHENG);
  const f = fakeEffects(board);
  const out = f.effects.onMatch(tapPair(board, { r: 1, c: 3 }, { r: 1, c: 4 }));
  assert.equal(out, null);
  assert.deepEqual(f.calls, []);
});

test('AC2 Zhuge Liang clearing every 火 leaves 营 untouched (effects do not chain)', () => {
  const board = boardFromPicture(SKILL_BOARD);
  const f = fakeEffects(board);
  assert.equal(typeof f.effects.onClear, 'undefined', 'no entry point for clear events');
  const clear = board.clearKind('huo', 'skill');
  assert.equal(clear.type, 'clear');
  assert.equal(f.effects.onMatch(clear), null, 'a clear event never triggers');
  assert.equal(board.count('ying'), 2);
  assert.deepEqual(f.calls, []);
});

test('AC3 Guan Yu cutting a row with a 马 pair leaves 弓 untouched', () => {
  const board = boardFromPicture(SKILL_BOARD);
  const f = fakeEffects(board);
  const targets = [1, 2, 3, 4].map((c) => ({ r: 3, c, layer: 'stack' }));
  const clear = board.clearCells(targets, 'skill');
  assert.equal(clear.type, 'clear');
  assert.equal(board.count('ma'), 0);
  f.effects.onMatch(plainMatch());
  f.effects.onMatch(plainMatch());
  assert.equal(f.effects.onMatch(clear), null);
  f.effects.onMiss(clear);
  assert.equal(board.count('gong'), 2);
  assert.equal(f.effects.combo(), 2, 'a skill clear neither adds to nor breaks the combo');
  assert.deepEqual(f.calls, []);
});
