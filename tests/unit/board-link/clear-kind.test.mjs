// Story board-link/007: clearKind, clearSelection, buriedCells (T1-T6 + edge cases).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// 营 on top at (1,1) over 刀, (2,3) over 盾, (3,3) over 营, (6,6) alone;
// one more 营 buried under 鼓 at (4,2). 4 top + 2 buried = 6 营; every kind even.
const YING = [
  'ying/dao qi qi       qi qi qi',
  'qi       qi ying/dun qi qi qi',
  '.        .  ying/ying . . .',
  '.     gu/ying .      .  .  .',
  '.        .  .        .  .  .',
  'dao      dun gu      .  .  ying',
];

// 营 on both sides of a roadblock.
const ROADBLOCK_BOARD = [
  'ying jm ying . . .',
  '.    .  .    . . .',
  '.    .  .    . . .',
  '.    .  .    . . .',
  '.    .  .    . . .',
  '.    .  .    . . .',
];

// No 鼓 on top; 鼓 buried at (4,1) and (2,5); 刀 buried at (3,2) (not 鼓).
const BURIED_GU = [
  'qi qi    qi    qi qi    qi',
  '.  .     .     .  ma/gu ma',
  '.  dun/dao dun . .      .',
  'jiu/gu jiu . . .        .',
  '.  .     .     .  .     dao',
  '.  .     .     .  .     .',
];

function cellAt(board, r, c) {
  return board.cells().filter((x) => x.r === r && x.c === c)[0];
}

function evenCounts(board) {
  return UNIT_KINDS.every((k) => board.count(k) % 2 === 0);
}

test('T1 clearKind removes all 营, top and buried, and reports 4 cells, 2 buried, 3 pairs', () => {
  const board = boardFromPicture(YING);
  const ev = board.clearKind('ying', 'effect');
  assert.equal(ev.type, 'clear');
  assert.equal(ev.source, 'effect');
  assert.equal(ev.kind, 'ying');
  assert.deepEqual(ev.cells, [{ r: 1, c: 1 }, { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 6, c: 6 }]);
  assert.equal(ev.buried, 2);
  assert.equal(ev.pairs, 3);
  assert.equal(board.count('ying'), 0, 'no 营 left on either layer');
  assert.ok(evenCounts(board), 'I1 holds after the clear');
});

test('T2 a 营-on-营 cell ends empty; other cleared cells flip up the card below', () => {
  const board = boardFromPicture(YING);
  const ev = board.clearKind('ying', 'effect');
  assert.deepEqual(ev.revealed, [{ r: 1, c: 1, kind: 'dao' }, { r: 2, c: 3, kind: 'dun' }]);
  assert.deepEqual(cellAt(board, 3, 3), { r: 3, c: 3, top: null, under: [] });
  assert.deepEqual(cellAt(board, 1, 1), { r: 1, c: 1, top: 'dao', under: [] });
  assert.deepEqual(cellAt(board, 2, 3), { r: 2, c: 3, top: 'dun', under: [] });
  assert.deepEqual(cellAt(board, 6, 6), { r: 6, c: 6, top: null, under: [] });
  assert.deepEqual(cellAt(board, 4, 2), { r: 4, c: 2, top: 'gu', under: [] },
    'a buried 营 under another kind is removed without touching the top card');
});

test('T3 clearKind next to a roadblock leaves the roadblock standing', () => {
  const board = boardFromPicture(ROADBLOCK_BOARD);
  const ev = board.clearKind('ying', 'skill');
  assert.equal(board.get(1, 2), 'jm');
  assert.equal(ev.blocks, undefined, 'clearKind reports no broken roadblocks');
  assert.equal(ev.pairs, 1);
});

test('T4 clearKind that clears the selected cell (2,3) empties the selection', () => {
  const board = boardFromPicture(YING);
  board.tap(2, 3);
  assert.deepEqual(board.selection(), { r: 2, c: 3 });
  board.clearKind('ying', 'effect');
  assert.equal(board.selection(), null, 'cleared even though 盾 flipped up in that cell');
});

test('T5 clearSelection empties the selection', () => {
  const board = boardFromPicture(YING);
  board.tap(2, 3);
  board.clearSelection();
  assert.equal(board.selection(), null);
});

test('T6 buriedCells returns the cells hiding a kind absent from the top, row-major', () => {
  const board = boardFromPicture(BURIED_GU);
  assert.equal(board.cells().filter((x) => x.top === 'gu').length, 0);
  assert.deepEqual(board.buriedCells('gu'), [{ r: 2, c: 5 }, { r: 4, c: 1 }]);
});

test('clearKind keeps a selection on a cell it does not clear', () => {
  const board = boardFromPicture(YING);
  board.tap(1, 2);
  board.clearKind('ying', 'effect');
  assert.deepEqual(board.selection(), { r: 1, c: 2 });
});

test('clearKind on a kind left only buried: cells empty, buried counted, pairs computed', () => {
  const board = boardFromPicture(BURIED_GU);
  const ev = board.clearKind('gu', 'skill');
  assert.deepEqual(ev, {
    type: 'clear', source: 'skill', kind: 'gu', cells: [], buried: 2, revealed: [], pairs: 1,
  });
  assert.equal(board.get(2, 5), 'ma');
  assert.equal(board.get(4, 1), 'jiu');
  assert.equal(board.buriedCount(), 1, 'only the buried 刀 is left');
});

test('clearKind refuses with {ok:false} and leaves the board unchanged when the kind count is odd', () => {
  const board = boardFromPicture([
    'ying ying ying . . .',
    '.    .    .    . . .',
    '.    .    .    . . .',
    '.    .    .    . . .',
    '.    .    .    . . .',
    '.    .    .    . . .',
  ]);
  const before = board.cells();
  assert.deepEqual(board.clearKind('ying', 'effect'), { ok: false });
  assert.deepEqual(board.cells(), before);
});

test('clearKind and buriedCells throw RangeError for a non-unit kind', () => {
  const board = boardFromPicture(ROADBLOCK_BOARD);
  assert.throws(() => board.clearKind('jm', 'effect'), RangeError);
  assert.throws(() => board.buriedCells('jm'), RangeError);
});
