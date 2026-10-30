// Story clear-effects/002: the 380 ms effect token and the clear at token end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, EFFECT_HIGHLIGHT_MS } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeEffects, tapPair } from '../../helpers/effects-fakes.mjs';

const FIRE = [{ r: 5, c: 1 }, { r: 5, c: 2 }];

// Six 营 on top; 火 pair at (5,1)-(5,2).
const SIX_YING = [
  'ying ying ying . . .',
  'ying ying ying . . .',
  '.    .    .    . . .',
  '.    .    .    . . .',
  'huo  huo  .    . . .',
  '.    .    .    . . .',
];

// Four 营 on top ((1,1) over 刀, (2,3) over 盾, (3,3) over 营, (6,6)), one 营
// under 鼓 at (4,2): 4 top + 2 buried. 火 pair at (5,1)-(5,2).
const YING_4_2 = [
  'ying/dao qi qi       qi qi qi',
  'qi       qi ying/dun qi qi qi',
  '.        .  ying/ying . . .',
  '.     gu/ying .      .  .  .',
  'huo      huo .       .  .  .',
  'dao      dun gu      .  .  ying',
];

// 营 only buried (under 刀 at (1,1) and (1,2)).
const BURIED_ONLY = [
  'dao/ying dao/ying . . . .',
  '.        .        . . . .',
  '.        .        . . . .',
  '.        .        . . . .',
  'huo      huo      . . . .',
  '.        .        . . . .',
];

// 马 at (1,1) and (6,6), each walled in; 弓: two on top, two buried.
const FORCED_MA = [
  'ma   dao  . . .       .',
  'dao  .    . . .       .',
  'gong gong . . .       .',
  '.    .    . . qi/gong qi/gong',
  '.    .    . . .       qi',
  '.    .    . . qi      ma',
];

// Three 营 (odd: I1 already broken).
const ODD_YING = [
  'ying ying ying . . .',
  '.    .    .    . . .',
  '.    .    .    . . .',
  '.    .    .    . . .',
  'huo  huo  .    . . .',
  '.    .    .    . . .',
];

function evenCounts(board) {
  return UNIT_KINDS.every((k) => board.count(k) % 2 === 0);
}

test('AC1 火 with six 营: 380 ms effect token, nothing cleared early, all 营 gone at token end, I1 holds', () => {
  const board = boardFromPicture(SIX_YING);
  const f = fakeEffects(board);
  const token = f.effects.onMatch(tapPair(board, FIRE[0], FIRE[1]));
  assert.equal(f.tokens.length, 1);
  assert.equal(token, f.tokens[0]);
  assert.equal(token.reason, 'effect');
  assert.equal(token.durationMs, EFFECT_HIGHLIGHT_MS);
  assert.equal(EFFECT_HIGHLIGHT_MS, 380);
  assert.equal(token.detail.kind, 'ying');
  assert.equal(token.detail.cells.length, 6);
  assert.equal(board.count('ying'), 6, 'clearKind is not called before the token ends');
  assert.equal(f.gameTime(), 5000, 'gameTime untouched while the token is held');

  token.onEnd(token);
  assert.equal(board.count('ying'), 0);
  assert.ok(evenCounts(board));
  assert.deepEqual(f.calls.map((c) => c[0]), ['acquire', 'dispatch', 'release']);
  assert.equal(f.calls[1][1].type, 'clear');
  assert.equal(f.calls[1][1].source, 'effect');
  assert.equal(f.calls[1][1].pairs, 3);
  assert.equal(f.calls[2][1], token, 'the same token is released');
  assert.equal(f.gameTime(), 5000);
});

test('AC2 4 top + 2 buried 营: all gone, pairs = 3, cards under cleared tops flipped up', () => {
  const board = boardFromPicture(YING_4_2);
  const f = fakeEffects(board);
  const token = f.effects.onMatch(tapPair(board, FIRE[0], FIRE[1]));
  assert.deepEqual(token.detail.cells, [{ r: 1, c: 1 }, { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 6, c: 6 }]);
  assert.deepEqual(token.detail.covers, [{ r: 3, c: 3 }, { r: 4, c: 2 }]);
  token.onEnd(token);
  const clear = f.calls[1][1];
  assert.equal(board.count('ying'), 0);
  assert.equal(clear.pairs, 3);
  assert.equal(clear.buried, 2);
  assert.deepEqual(clear.revealed, [{ r: 1, c: 1, kind: 'dao' }, { r: 2, c: 3, kind: 'dun' }]);
  assert.equal(board.get(1, 1), 'dao');
  assert.equal(board.get(2, 3), 'dun');
  assert.ok(evenCounts(board));
});

test('AC3 营 only buried: token still taken, two buried cards cleared, pairs = 1, no targetGone', () => {
  const board = boardFromPicture(BURIED_ONLY);
  const f = fakeEffects(board);
  const token = f.effects.onMatch(tapPair(board, FIRE[0], FIRE[1]));
  assert.equal(token.reason, 'effect');
  assert.deepEqual(token.detail.cells, []);
  assert.deepEqual(token.detail.covers, [{ r: 1, c: 1 }, { r: 1, c: 2 }]);
  token.onEnd(token);
  const clear = f.calls[1][1];
  assert.deepEqual(clear.cells, []);
  assert.equal(clear.buried, 2);
  assert.equal(clear.pairs, 1);
  assert.equal(board.count('ying'), 0);
  assert.ok(f.calls.every((c) => !(c[0] === 'emit' && c[1].type === 'targetGone')));
});

test('AC4 Zhao Yun forced 马 pair triggers 铁骑冲阵: every 弓, buried included, is cleared', () => {
  const board = boardFromPicture(FORCED_MA);
  board.setForceNext(true);
  const f = fakeEffects(board);
  const ev = tapPair(board, { r: 1, c: 1 }, { r: 6, c: 6 });
  assert.equal(ev.type, 'match');
  assert.equal(ev.forced, true);
  assert.equal(f.effects.combo(), 0);
  const token = f.effects.onMatch(ev);
  assert.equal(f.effects.combo(), 1, 'the forced pair adds 1 to the combo');
  assert.equal(token.detail.kind, 'gong');
  token.onEnd(token);
  assert.equal(board.count('gong'), 0);
  assert.equal(f.calls[1][1].pairs, 2);
  assert.equal(f.effects.combo(), 1, 'the effect clear does not add to the combo');
});

test('clearKind refusing (odd target count, I1 already broken) dispatches nothing but still releases', () => {
  const board = boardFromPicture(ODD_YING);
  const f = fakeEffects(board);
  const token = f.effects.onMatch(tapPair(board, FIRE[0], FIRE[1]));
  token.onEnd(token);
  assert.deepEqual(f.calls.map((c) => c[0]), ['acquire', 'release']);
  assert.equal(board.count('ying'), 3, 'board unchanged');
});
