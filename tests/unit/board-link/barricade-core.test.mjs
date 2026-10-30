// Story board-link/012: roadblocks block lines, cannot be tapped, break when a
// player pair is matched next to them; blocks() and isEmpty() queries (AC1-AC4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROADBLOCK, EMPTY_CELL } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// 刀 (3,1) and 刀 (3,3) with a roadblock at (3,2) between them; every other
// cell is a unit, so no detour through other rows or the outer ring is open.
const WALLED = [
  'huo   ying ma    gong shui',
  'cheng shu  qi    jiu  huo',
  'dao   jm   dao   ying ma',
  'gong  shui cheng shu  qi',
  'jiu   huo  ying  ma   gong',
  'shui  cheng shu  qi   jiu',
];

// 刀 (3,3) and 刀 (5,5) connect through the corner (3,5). Roadblock (3,2) is
// left of (3,3); roadblock (4,4) is diagonal to both 刀.
const ADJACENT = [
  'gu . .  . .',
  '.  . .  . .',
  '.  jm dao . .',
  '.  . .  jm .',
  '.  . .  . dao',
  'gu . .  . .',
];

// 刀 (2,1) and 刀 (2,3) connect over the outer ring; roadblock (2,2) touches
// both, roadblock (3,3) touches only (2,3).
const SHARED = [
  '.   . .   . .',
  'dao jm dao . .',
  '.   . jm  . .',
  '.   . .   . .',
  '.   . .   . .',
  'gu  . .   . gu',
];

test('AC1 a roadblock on the only line between a pair blocks it: miss', () => {
  const board = boardFromPicture(WALLED);
  assert.equal(board.tap(3, 1), null);
  assert.deepEqual(board.tap(3, 3), {
    type: 'miss', kind: 'dao', a: { r: 3, c: 1 }, b: { r: 3, c: 3 },
  });
  assert.deepEqual(board.selection(), { r: 3, c: 3 }, 'a miss moves the selection');
  assert.deepEqual(board.blocks(), [{ r: 3, c: 2 }], 'a miss breaks nothing');

  const open = boardFromPicture(WALLED);
  open.set(3, 2, EMPTY_CELL);
  open.tap(3, 1);
  assert.equal(open.tap(3, 3).type, 'match', 'control: the same pair matches once (3,2) is empty');
});

test('AC2 tapping a roadblock keeps the selection and returns no event', () => {
  const board = boardFromPicture(ADJACENT);
  board.tap(3, 3);
  assert.equal(board.tap(3, 2), null);
  assert.deepEqual(board.selection(), { r: 3, c: 3 }, 'A stays selected');
  assert.equal(board.get(3, 2), ROADBLOCK);

  const idle = boardFromPicture(ADJACENT);
  assert.equal(idle.tap(4, 4), null);
  assert.equal(idle.selection(), null, 'nothing selected: tapping a roadblock does nothing');
});

test('AC3 a player match breaks orthogonally adjacent roadblocks, not diagonal ones', () => {
  const board = boardFromPicture(ADJACENT);
  board.tap(3, 3);
  const ev = board.tap(5, 5);
  assert.equal(ev.type, 'match');
  assert.equal(ev.forced, false);
  assert.deepEqual(ev.broken, [{ r: 3, c: 2 }]);
  assert.equal(board.get(3, 2), EMPTY_CELL, '(3,2) is empty');
  assert.equal(board.get(4, 4), ROADBLOCK, 'diagonal (4,4) does not break');
  assert.deepEqual(board.blocks(), [{ r: 4, c: 4 }]);
});

test('AC3 edge: a roadblock next to both cells breaks once; output is row-major', () => {
  const board = boardFromPicture(SHARED);
  board.tap(2, 1);
  const ev = board.tap(2, 3);
  assert.equal(ev.type, 'match');
  assert.deepEqual(ev.broken, [{ r: 2, c: 2 }, { r: 3, c: 3 }]);
  assert.deepEqual(board.blocks(), []);
});

test('AC3 edge: a Zhao Yun forced match breaks no roadblock', () => {
  const board = boardFromPicture(ADJACENT);
  board.setForceNext(true);
  board.tap(3, 3);
  const ev = board.tap(5, 5);
  assert.equal(ev.forced, true);
  assert.deepEqual(ev.broken, []);
  assert.deepEqual(board.blocks(), [{ r: 3, c: 2 }, { r: 4, c: 4 }]);
});

test('AC4 a board with only two roadblocks is empty and has no pairs left', () => {
  const board = boardFromPicture([
    '. . .  . .',
    '. jm . . .',
    '. . .  . .',
    '. . .  jm .',
    '. . .  . .',
    '. . .  . .',
  ]);
  assert.equal(board.isEmpty(), true);
  assert.equal(board.pairsLeft(), 0);
  assert.deepEqual(board.blocks(), [{ r: 2, c: 2 }, { r: 4, c: 4 }]);
  assert.equal(board.ensurePlayable(), null, 'nothing to reshuffle');
});

test('AC4 edge: isEmpty turns true when the last pair goes and roadblocks remain', () => {
  const board = boardFromPicture(ADJACENT);
  board.tap(1, 1);
  board.tap(6, 1);
  assert.equal(board.isEmpty(), false, 'the 刀 pair is still there');
  board.tap(3, 3);
  board.tap(5, 5);
  assert.equal(board.isEmpty(), true);
  assert.equal(board.pairsLeft(), 0);
  assert.deepEqual(board.blocks(), [{ r: 4, c: 4 }]);
});

test('blocks() returns fresh objects', () => {
  const board = boardFromPicture(ADJACENT);
  board.blocks()[0].r = 9;
  assert.deepEqual(board.blocks(), [{ r: 3, c: 2 }, { r: 4, c: 4 }]);
});
