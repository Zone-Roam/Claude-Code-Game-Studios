// Story board-link/009: pushRowFromTop, addPairs, placeBlocks (T1-T5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, ROADBLOCK, EMPTY_CELL } from '../../../src/core/constants.mjs';
import { createStream } from '../../../src/core/rng.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// Press-mode board, 5 x 6: rows 1-5 filled with pairs, bottom row empty.
const PRESS = [
  'dao  gu   gu   ying ying',
  'ma   dun  dun  ma   shu',
  'qi   qi   jiu  jiu  shu',
  'huo  gong gong huo  dao',
  'shui .    .    shui .',
  '.    .    .    .    .',
];

// Full 5 x 6 board with exactly three empty cells (1,2)-(1,4), a roadblock at
// (1,1), another at (5,5), and one buried card under (2,1). Every kind even.
const THREE_EMPTY = [
  'jm     .    .    .    dao',
  'dao/qi gu   gu   dun  dun',
  'qi     cheng ying ying jiu',
  'jiu    shu  shu  huo  huo',
  'gong   gong shui shui jm',
  'cheng  ma   ma   dun  dun',
];

function evenCounts(board) {
  return UNIT_KINDS.every((k) => board.count(k) % 2 === 0);
}

test('T1 pushRowFromTop with a single dao in the row is refused and leaves the board unchanged', () => {
  const board = boardFromPicture(PRESS);
  board.tap(3, 2);
  const before = board.cells();

  const result = board.pushRowFromTop(['dao', 'qi', 'qi', EMPTY_CELL, EMPTY_CELL]);

  assert.deepEqual(result, { ok: false });
  assert.deepEqual(board.cells(), before);
  assert.deepEqual(board.selection(), { r: 3, c: 2 });
});

test('T2 pushRowFromTop with a unit on the bottom row is refused and leaves the board unchanged', () => {
  const picture = PRESS.slice(0, 5).concat(['.    .    ma   .    .']);
  picture[1] = 'ma   dun  dun  .    shu'; // keep ma even: the bottom ma replaces (2,4)
  const board = boardFromPicture(picture);
  const before = board.cells();

  const result = board.pushRowFromTop(['qi', 'qi', EMPTY_CELL, 'dao', 'dao']);

  assert.deepEqual(result, { ok: false });
  assert.deepEqual(board.cells(), before);
});

test('T3 pushRowFromTop on an empty bottom row moves every block down one row and the selection from (3,2) to (4,2)', () => {
  const board = boardFromPicture(PRESS);
  board.tap(3, 2);
  const before = board.cells();
  const row = ['qi', 'qi', EMPTY_CELL, 'dao', 'dao'];

  const result = board.pushRowFromTop(row);

  assert.deepEqual(result, { type: 'push', row, empty: false, dropped: [] });
  for (const cell of board.cells()) {
    const expected = cell.r === 1 ? row[cell.c - 1] : before[(cell.r - 2) * 5 + (cell.c - 1)].top;
    assert.equal(cell.top, expected, 'cell ' + cell.r + ',' + cell.c);
  }
  assert.deepEqual(board.selection(), { r: 4, c: 2 });
  assert.ok(evenCounts(board));
});

test('pushRowFromTop with only a roadblock on the bottom row succeeds and lists its column in dropped', () => {
  const picture = PRESS.slice(0, 5).concat(['.    .    .    jm   .']);
  const board = boardFromPicture(picture);

  const result = board.pushRowFromTop([EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL, EMPTY_CELL]);

  assert.deepEqual(result.dropped, [4]);
  assert.equal(result.empty, true);
  assert.equal(board.get(6, 4), 'shui'); // (5,4) moved down over the dropped roadblock
  assert.equal(board.get(6, 2), EMPTY_CELL);
  assert.equal(board.get(6, 1), 'shui');
});

test('T4 addPairs([dao, gu]) with three empty cells places one pair on empty cells only, counts stay even', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const board = boardFromPicture(THREE_EMPTY, { streams: { add: createStream(seed, 'add') } });
    const pairsBefore = board.pairsLeft();

    const result = board.addPairs(['dao', 'gu']);

    assert.equal(result.type, 'add');
    assert.equal(result.placed, 1, 'seed ' + seed);
    assert.equal(result.cells.length, 2);
    const keys = result.cells.map((p) => p.r + ',' + p.c);
    assert.notEqual(keys[0], keys[1]);
    for (const p of result.cells) {
      assert.equal(p.kind, 'dao');
      assert.ok(['1,2', '1,3', '1,4'].indexOf(p.r + ',' + p.c) !== -1, 'not an empty cell: ' + p.r + ',' + p.c);
      assert.equal(board.depthAt(p.r, p.c), 0);
    }
    assert.equal(board.get(1, 1), ROADBLOCK);
    assert.equal(board.pairsLeft(), pairsBefore + 1);
    assert.equal(board.count('dao'), 4);
    assert.equal(board.count('gu'), 2);
    assert.ok(evenCounts(board));
  }
});

test('T5 placeBlocks(2) with one empty cell places a single roadblock there', () => {
  const picture = THREE_EMPTY.slice();
  picture[0] = 'jm     shu  shu  .    dao'; // only (1,4) stays empty
  const board = boardFromPicture(picture);
  assert.ok(evenCounts(board));

  const result = board.placeBlocks(2, board.rng('wave'));

  assert.deepEqual(result, { type: 'blocks', cells: [{ r: 1, c: 4 }] });
  assert.equal(board.get(1, 4), ROADBLOCK);
  assert.equal(board.cells().filter((cell) => cell.top === ROADBLOCK).length, 3);
});
