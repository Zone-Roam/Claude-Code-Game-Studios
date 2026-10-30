// Deeper stacks (user decision 2026-10-30 "往后逐步加深"; board-link rule 4,
// chapter `stackDepth` 1-3): reveal pops one card at a time, depthAt 0..3,
// clearKind / clearCells / rowContents / buriedCells and ensurePlayable level 3
// with two or three cards under one cell.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

const E = '. . . . .';
// (1,1): 刀 on top, then 鼓 (revealed next), then 旗 at the bottom.
const CHAIN = ['dao/gu/qi . dao gu qi', E, E, E, E, E];
// (1,1): 刀 on top, under it 鼓 (next), 旗, 鼓 (bottom).
const DEEP3 = ['dao/gu/qi/gu . dao . qi', E, E, E, E, E];

function evenCounts(board) {
  for (const kind of UNIT_KINDS) assert.equal(board.count(kind) % 2, 0, kind);
}

test('a 3-deep picture builds with stackDepth 3 and depthAt 3; bury past the cap throws', () => {
  const board = boardFromPicture(DEEP3);
  assert.equal(board.stackDepth(), 3);
  assert.equal(board.depthAt(1, 1), 3);
  assert.equal(board.buriedCount(), 3);
  assert.deepEqual(board.cells()[0].under, ['gu', 'qi', 'gu'], 'bottom first');
  assert.deepEqual(board.buriedCells('gu'), [{ r: 1, c: 1 }], 'top buried card only');
  assert.deepEqual(board.buriedCells('qi'), []);
  assert.throws(() => board.bury(1, 1, 'dao'), RangeError);
  evenCounts(board);
});

test('reveal pops one card at a time: 刀 -> 鼓 -> 旗, depth 2 -> 1 -> 0', () => {
  const board = boardFromPicture(CHAIN);
  assert.equal(board.depthAt(1, 1), 2);
  board.tap(1, 1);
  const first = board.tap(1, 3);
  assert.deepEqual(first.revealed, [{ r: 1, c: 1, kind: 'gu' }]);
  assert.equal(board.get(1, 1), 'gu');
  assert.equal(board.depthAt(1, 1), 1);
  board.tap(1, 1);
  const second = board.tap(1, 4);
  assert.equal(second.type, 'match');
  assert.deepEqual(second.revealed, [{ r: 1, c: 1, kind: 'qi' }]);
  assert.equal(board.depthAt(1, 1), 0);
  board.tap(1, 1);
  const third = board.tap(1, 5);
  assert.equal(third.type, 'match');
  assert.deepEqual(third.revealed, []);
  assert.equal(board.isEmpty(), true);
});

test('clearKind removes buried cards at any depth and keeps the rest in order', () => {
  const board = boardFromPicture(DEEP3);
  const ev = board.clearKind('gu', 'effect');
  assert.deepEqual(ev, { type: 'clear', source: 'effect', kind: 'gu', cells: [], buried: 2, revealed: [], pairs: 1 });
  assert.deepEqual(board.cells()[0].under, ['qi']);
  const dao = board.clearKind('dao', 'effect');
  assert.deepEqual(dao.revealed, [{ r: 1, c: 1, kind: 'qi' }]);
  assert.equal(board.depthAt(1, 1), 0);
  evenCounts(board);
});

test('clearCells: kinded under removes that kind from the middle of a stack', () => {
  const board = boardFromPicture(DEEP3);
  const ev = board.clearCells([{ r: 1, c: 1, layer: 'under', kind: 'qi' }, { r: 1, c: 5, layer: 'top' }], 'skill');
  assert.deepEqual(ev, { type: 'clear', source: 'skill', cells: [{ r: 1, c: 5 }], buried: 1, blocks: [], revealed: [], pairs: 1 });
  assert.equal(board.get(1, 1), 'dao');
  assert.deepEqual(board.cells()[0].under, ['gu', 'gu']);
  evenCounts(board);
});

test('clearCells: plain under takes only the next card; kinded under of an absent kind is ignored', () => {
  const board = boardFromPicture(DEEP3);
  assert.deepEqual(board.clearCells([{ r: 1, c: 1, layer: 'under' }], 'skill'), { ok: false }, 'one 鼓 alone is odd');
  const none = board.clearCells([{ r: 1, c: 1, layer: 'under', kind: 'ma' }], 'skill');
  assert.deepEqual(none, { type: 'clear', source: 'skill', cells: [], buried: 0, blocks: [], revealed: [], pairs: 0 });
  // Kinded first (the top-most 鼓), then plain under takes the next card left (旗).
  const ev = board.clearCells([
    { r: 1, c: 1, layer: 'under', kind: 'gu' }, { r: 1, c: 1, layer: 'under' }, { r: 1, c: 5, layer: 'top' },
  ], 'skill');
  assert.deepEqual(ev, { ok: false }, '鼓 x1 is odd');
  assert.equal(board.depthAt(1, 1), 3, 'refused call leaves the board unchanged');
  const pair = board.clearCells([
    { r: 1, c: 1, layer: 'under', kind: 'gu' }, { r: 1, c: 1, layer: 'under', kind: 'gu' }, { r: 1, c: 1, layer: 'under' },
  ], 'skill');
  // The repeated kinded target counts once: 鼓 (next) then plain under takes 旗 -> odd.
  assert.deepEqual(pair, { ok: false });
  assert.throws(() => board.clearCells([{ r: 1, c: 1, layer: 'under', kind: 'zzz' }], 'skill'), RangeError);
});

test('clearCells: stack clears a 3-deep cell; top + plain under still acts as stack', () => {
  const a = boardFromPicture(DEEP3);
  const ev = a.clearCells([{ r: 1, c: 1, layer: 'stack' }, { r: 1, c: 3, layer: 'top' }, { r: 1, c: 5, layer: 'top' }], 'skill');
  assert.equal(ev.buried, 3);
  assert.equal(ev.pairs, 3);
  assert.equal(a.isEmpty(), true);
  const b = boardFromPicture(DEEP3);
  const same = b.clearCells([{ r: 1, c: 1, layer: 'top' }, { r: 1, c: 1, layer: 'under' }, { r: 1, c: 3, layer: 'top' }, { r: 1, c: 5, layer: 'top' }], 'skill');
  assert.deepEqual(same, ev);
});

test('rowContents / colContents list every buried card of a deep stack, bottom first', () => {
  const board = boardFromPicture(DEEP3);
  assert.deepEqual(board.rowContents(1).buried, [
    { r: 1, c: 1, kind: 'gu' }, { r: 1, c: 1, kind: 'qi' }, { r: 1, c: 1, kind: 'gu' },
  ]);
  assert.equal(board.colContents(1).buried.length, 3);
});

test('ensurePlayable level 3 lifts every card of a deep stack onto empty cells', () => {
  // Only (3,3) holds anything: 刀 on top of 刀, 鼓, 鼓; the board is dead.
  const board = boardFromPicture([E, E, '. . dao/dao/gu/gu . .', E, E, E]);
  assert.equal(board.hasPlayablePair(), false);
  const ev = board.ensurePlayable();
  assert.equal(ev.type, 'reshuffle');
  assert.equal(board.hasPlayablePair(), true);
  assert.equal(board.buriedCount() + board.cells().filter((x) => x.top !== null).length, 4);
  evenCounts(board);
});
