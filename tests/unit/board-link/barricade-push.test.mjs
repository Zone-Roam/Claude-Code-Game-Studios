// Story board-link/013: roadblocks in press-mode pushes and bottomOccupied (AC1-AC4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, ROADBLOCK, EMPTY_CELL } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// Press-mode board, 5 x 6: a roadblock at (3,2), bottom row empty, every kind even.
const PRESS = [
  'dao  gu   gu   ying ying',
  'ma   dun  dun  ma   .',
  '.    jm   jiu  jiu  .',
  'huo  gong gong huo  dao',
  'shui .    .    shui .',
  '.    .    .    .    .',
];

// Press-mode board, 5 x 8: the bottom row holds only a roadblock at (8,4);
// (7,4) is empty so nothing moves onto it.
const BOTTOM_BLOCK = [
  'dao  gu   gu   ying ying',
  'ma   dun  dun  ma   dao',
  '.    .    .    .    .',
  '.    .    .    .    .',
  '.    .    .    .    .',
  '.    jm   .    .    .',
  '.    .    .    .    .',
  '.    .    .    jm   .',
];

function evenCounts(board) {
  return UNIT_KINDS.every((k) => board.count(k) % 2 === 0);
}

test('AC1 a pushed row with a roadblock puts it on row 1 with nothing underneath and adds only the unit pairs', () => {
  const board = boardFromPicture(PRESS);
  const pairsBefore = board.pairsLeft();

  const result = board.pushRowFromTop(['qi', 'dao', ROADBLOCK, 'dao', 'qi']);

  assert.equal(result.type, 'push');
  assert.equal(board.get(1, 3), ROADBLOCK);
  assert.equal(board.depthAt(1, 3), 0);
  assert.equal(board.pairsLeft(), pairsBefore + 2);
  assert.ok(evenCounts(board));
});

test('AC2 a roadblock at (3,2) moves to (4,2) after one push', () => {
  const board = boardFromPicture(PRESS);

  const result = board.pushRowFromTop([EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL]);

  assert.equal(result.type, 'push');
  assert.equal(board.get(4, 2), ROADBLOCK);
  assert.notEqual(board.get(3, 2), ROADBLOCK);
});

test('AC3 a lone roadblock on the bottom row is dropped off the board, listed in dropped and not broken', () => {
  const board = boardFromPicture(BOTTOM_BLOCK);
  const blocksBefore = board.blocks().length;

  const result = board.pushRowFromTop([EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL]);

  assert.deepEqual(result, {
    type: 'push', row: [EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL],
    empty: true, dropped: [4],
  });
  assert.equal(board.get(8, 4), EMPTY_CELL);
  assert.equal(board.blocks().length, blocksBefore - 1);
  assert.deepEqual(board.blocks(), [{ r: 7, c: 2 }]);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'broken'), false);
});

test('AC4 a bottom row with a roadblock and a unit refuses the push and reads occupied; roadblocks alone do not', () => {
  const mixed = BOTTOM_BLOCK.slice();
  mixed[1] = 'ma   dun  dun  ma   .';
  mixed[7] = 'dao  .    .    jm   .';
  const board = boardFromPicture(mixed);
  const before = board.cells();

  const result = board.pushRowFromTop(['qi', 'qi', EMPTY_CELL, EMPTY_CELL, EMPTY_CELL]);

  assert.deepEqual(result, { ok: false });
  assert.deepEqual(board.cells(), before);
  assert.equal(board.bottomOccupied(), true);
  assert.equal(boardFromPicture(BOTTOM_BLOCK).bottomOccupied(), false);
});

test('a board holding only roadblocks is empty and the next push still moves them down', () => {
  const board = boardFromPicture([
    '. . . . .',
    '. jm . . .',
    '. . . . .',
    '. . . . .',
    '. . . . .',
    '. . . . .',
  ]);
  assert.equal(board.isEmpty(), true);

  const result = board.pushRowFromTop(['qi', 'qi', EMPTY_CELL, EMPTY_CELL, EMPTY_CELL]);

  assert.equal(result.type, 'push');
  assert.deepEqual(board.blocks(), [{ r: 3, c: 2 }]);
});
