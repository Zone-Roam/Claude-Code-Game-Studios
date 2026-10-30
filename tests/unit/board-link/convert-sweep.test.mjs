// Story board-link/014: convertBlocks and shuffleTopRows (AC1-AC4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// 5 x 6: (2,1) shu on top of dao, (4,5) shu, a roadblock at (3,3), (1,2) empty.
// Every kind count is even.
const CHAIN = [
  'gu   .    gu   ma   ma',
  'shu/dao dun dun qi  qi',
  'ying ying jm   gong gong',
  'jiu  jiu  huo  huo  shu',
  'dao  .    .    .    .',
  '.    .    .    .    .',
];

// 5 x 6: four shu, all on the top layer.
const FOUR_SHU = [
  'shu  shu  shu  shu  .',
  'gu   gu   .    .    .',
  '.    .    .    .    .',
  '.    .    .    .    .',
  '.    .    .    .    .',
  '.    .    .    .    .',
];

// 5 x 6: row 1 empty; rows 2 and 3 hold units, buried cards and a roadblock;
// row 4 has units that must not move.
const SWEEP = [
  '.    .      .    .      .',
  'dao  gu/ma  .    ying   qi',
  'gu   jm     dao/ma ying qi',
  'huo  huo    shui shui   .',
  '.    .      .    .      .',
  '.    .      .    .      .',
];

// Every cell's top and buried cards, for "board unchanged" checks.
function snapshot(board) {
  return board.cells();
}

function counts(board) {
  const out = {};
  for (const k of UNIT_KINDS) out[k] = board.count(k);
  return out;
}

function evenCounts(board) {
  return UNIT_KINDS.every((k) => board.count(k) % 2 === 0);
}

// Deterministic stand-in for a random stream: shuffling reverses the array.
const REVERSE = { shuffle: (a) => a.reverse(), int: () => 0 };

test('AC1 convertBlocks turns two top-layer shu into ying, keeps the buried dao and keeps I1', () => {
  const board = boardFromPicture(CHAIN);
  board.tap(2, 1);
  const before = counts(board);

  const result = board.convertBlocks([{ r: 2, c: 1 }, { r: 4, c: 5 }], 'ying');

  assert.deepEqual(result, {
    type: 'convert', kind: 'ying',
    cells: [{ r: 2, c: 1, from: 'shu' }, { r: 4, c: 5, from: 'shu' }],
  });
  assert.equal(board.get(2, 1), 'ying');
  assert.equal(board.get(4, 5), 'ying');
  assert.deepEqual(board.cells().find((p) => p.r === 2 && p.c === 1).under, ['dao']);
  assert.equal(board.count('shu'), before.shu - 2);
  assert.equal(board.count('ying'), before.ying + 2);
  assert.ok(evenCounts(board));
  assert.equal(board.selection(), null);
});

test('AC2 convertBlocks with a roadblock or an empty target is refused and the board is unchanged', () => {
  for (const bad of [{ r: 3, c: 3 }, { r: 1, c: 2 }]) {
    const board = boardFromPicture(CHAIN);
    const before = snapshot(board);

    const result = board.convertBlocks([{ r: 2, c: 1 }, bad], 'ying');

    assert.deepEqual(result, { ok: false });
    assert.deepEqual(snapshot(board), before);
  }
});

test('AC3 convertBlocks on one of four shu would break I1, so it is refused and the board is unchanged', () => {
  const board = boardFromPicture(FOUR_SHU);
  const before = snapshot(board);

  const result = board.convertBlocks([{ r: 1, c: 1 }], 'gu');

  assert.deepEqual(result, { ok: false });
  assert.deepEqual(snapshot(board), before);
  assert.ok(evenCounts(board));
});

test('AC4 shuffleTopRows permutes only the top units of rows 2 and 3; buried cards and roadblocks stay', () => {
  const board = boardFromPicture(SWEEP);
  board.tap(2, 1);
  const before = snapshot(board);
  const countsBefore = counts(board);

  const result = board.shuffleTopRows(REVERSE);

  const swept = [[2, 1], [2, 2], [2, 4], [2, 5], [3, 1], [3, 3], [3, 4], [3, 5]];
  const oldKinds = swept.map(([r, c]) => before.find((p) => p.r === r && p.c === c).top);
  const newKinds = oldKinds.slice().reverse();
  assert.deepEqual(result, {
    type: 'sweep',
    cells: swept.map(([r, c], i) => ({ r, c, kind: newKinds[i] })),
  });
  const after = snapshot(board);
  for (let i = 0; i < before.length; i++) {
    const p = before[i];
    const q = after[i];
    assert.deepEqual(q.under, p.under, 'buried cards stay at (' + p.r + ',' + p.c + ')');
    if (!swept.some(([r, c]) => r === p.r && c === p.c)) assert.equal(q.top, p.top);
  }
  assert.equal(board.get(3, 2), 'jm');
  assert.deepEqual(counts(board), countsBefore);
  assert.equal(board.selection(), null);
});

test('shuffleTopRows with a single unit row sweeps only that row; with no unit it returns an empty sweep', () => {
  const one = boardFromPicture([
    '.    .    .    .    .',
    '.    .    .    .    .',
    '.    .    .    .    .',
    'dao  gu   jm   gu   dao',
    '.    .    .    .    .',
    '.    .    .    .    .',
  ]);
  assert.deepEqual(one.shuffleTopRows(REVERSE).cells.map((p) => [p.r, p.c, p.kind]),
    [[4, 1, 'dao'], [4, 2, 'gu'], [4, 4, 'gu'], [4, 5, 'dao']]);

  const none = boardFromPicture([
    '.    .    jm   .    .',
    '.    .    .    .    .',
    '.    .    .    .    .',
    '.    .    .    .    .',
    '.    .    .    .    .',
    '.    .    .    .    .',
  ]);
  assert.deepEqual(none.shuffleTopRows(REVERSE), { type: 'sweep', cells: [] });
});

test('convertBlocks refuses an out-of-range cell, a repeated cell or an unknown kind', () => {
  const board = boardFromPicture(CHAIN);
  const before = snapshot(board);

  assert.deepEqual(board.convertBlocks([{ r: 2, c: 1 }, { r: 0, c: 1 }], 'ying'), { ok: false });
  assert.deepEqual(board.convertBlocks([{ r: 2, c: 1 }, { r: 2, c: 1 }], 'ying'), { ok: false });
  assert.deepEqual(board.convertBlocks([{ r: 2, c: 1 }, { r: 4, c: 5 }], 'jm'), { ok: false });
  assert.deepEqual(snapshot(board), before);
});

test('convertBlocks on a target already of kind lists from = kind and leaves it as it is', () => {
  const board = boardFromPicture(CHAIN);

  const result = board.convertBlocks([{ r: 3, c: 1 }, { r: 3, c: 2 }], 'ying');

  assert.deepEqual(result.cells, [{ r: 3, c: 1, from: 'ying' }, { r: 3, c: 2, from: 'ying' }]);
  assert.equal(board.get(3, 1), 'ying');
  assert.ok(evenCounts(board));
});
