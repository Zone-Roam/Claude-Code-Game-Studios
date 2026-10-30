// Story board-link/010: ensurePlayable levels 1-3 (T1-T5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, ROADBLOCK, EMPTY_CELL, RESHUFFLE_TRIES } from '../../../src/core/constants.mjs';
import { boardFromPicture, DEAD_FULL } from '../../helpers/board-fixtures.mjs';

// Only (4,4) holds anything: 刀 on top, 刀 buried.
const LAST_PAIR_STACKED = [
  '. . . .       . .',
  '. . . .       . .',
  '. . . .       . .',
  '. . . dao/dao . .',
  '. . . .       . .',
  '. . . .       . .',
];

// 马 (1,1) and (1,4) connect straight across the empty row.
const PLAYABLE = [
  'ma  .   .   ma  gu',
  'gu  dao/jiu jm qi  qi',
  'dao .   .   .   jiu',
  '.   .   .   .   .',
  '.   .   .   .   .',
  '.   .   .   .   .',
];

function kindCounts(board) {
  const out = {};
  for (const k of UNIT_KINDS) out[k] = board.count(k);
  return out;
}

// Stack shape: which cells hold a unit, a roadblock or nothing, and how deep.
function shape(board) {
  return board.cells().map((x) => ({
    r: x.r, c: x.c, under: x.under.length,
    top: x.top === EMPTY_CELL || x.top === ROADBLOCK ? x.top : 'unit',
  }));
}

test('DEAD_FULL fixture is full, dead and keeps I1', () => {
  const board = boardFromPicture(DEAD_FULL);
  assert.equal(board.cells().every((x) => x.top !== EMPTY_CELL), true);
  assert.equal(board.hasPlayablePair(), false);
  for (const k of UNIT_KINDS) assert.equal(board.count(k) % 2, 0, k);
});

test('T1 dead full board with buried cards: reshuffle leaves a playable pair', () => {
  const board = boardFromPicture(DEAD_FULL);
  const ev = board.ensurePlayable();
  assert.equal(ev.type, 'reshuffle');
  assert.equal(typeof ev.fallback, 'boolean');
  assert.deepEqual(Object.keys(ev).sort(), ['fallback', 'type']);
  assert.equal(board.hasPlayablePair(), true);
});

test('T2 reshuffle keeps kind counts, stack depths and roadblocks; clears the selection', () => {
  const board = boardFromPicture(DEAD_FULL);
  const counts = kindCounts(board);
  const before = shape(board);
  board.tap(1, 1);
  assert.deepEqual(board.selection(), { r: 1, c: 1 });
  board.ensurePlayable();
  assert.deepEqual(kindCounts(board), counts);
  assert.deepEqual(shape(board), before);
  assert.equal(board.get(3, 3), ROADBLOCK);
  assert.equal(board.selection(), null);
});

test('T3 last pair stacked in one cell: buried 刀 moves to the first empty cell', () => {
  const board = boardFromPicture(LAST_PAIR_STACKED);
  assert.deepEqual(board.ensurePlayable(), { type: 'reshuffle', fallback: true });
  assert.equal(board.get(1, 1), 'dao');
  assert.equal(board.get(4, 4), 'dao');
  assert.equal(board.buriedCount(), 0);
  assert.notEqual(board.findPath({ r: 1, c: 1 }, { r: 4, c: 4 }), null);
  assert.equal(board.hasPlayablePair(), true);
});

test('T4 board with a playable pair: null and nothing changes', () => {
  const board = boardFromPicture(PLAYABLE);
  board.tap(2, 1);
  const before = board.cells();
  assert.equal(board.ensurePlayable(), null);
  assert.deepEqual(board.cells(), before);
  assert.deepEqual(board.selection(), { r: 2, c: 1 });
});

test('T5 shuffle stream stuck on one permutation: deterministic swap after RESHUFFLE_TRIES tries', () => {
  let calls = 0;
  const stuck = { shuffle: (cards) => { calls++; return cards; } };
  const board = boardFromPicture(DEAD_FULL, { streams: { shuffle: stuck } });
  const counts = kindCounts(board);
  const before = shape(board);
  assert.deepEqual(board.ensurePlayable(), { type: 'reshuffle', fallback: true });
  assert.equal(calls, RESHUFFLE_TRIES);
  // p = (1,1) 盾, q = (1,2) (adjacent); r = the 盾 buried under (1,2): q's 酒 goes under.
  const q = board.cells()[1];
  assert.deepEqual(q, { r: 1, c: 2, top: 'dun', under: ['jiu'] });
  assert.notEqual(board.findPath({ r: 1, c: 1 }, { r: 1, c: 2 }), null);
  assert.equal(board.hasPlayablePair(), true);
  assert.deepEqual(shape(board), before);
  assert.deepEqual(kindCounts(board), counts);
});

test('empty board: null', () => {
  const board = boardFromPicture(['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .']);
  assert.equal(board.ensurePlayable(), null);
});

test('createBoard refuses an unknown injected stream name', () => {
  assert.throws(() => boardFromPicture(DEAD_FULL, { streams: { dice: {} } }), RangeError);
});
