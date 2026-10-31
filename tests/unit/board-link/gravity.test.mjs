// Gravity press (2026-10-31, user decision): columns settle downwards, press rows
// drop onto the column stacks, and the top row decides the breach. Boards are 5 x 6.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CELL } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

const E = EMPTY_CELL;

function picture(board) {
  const lines = [];
  for (let r = 1; r <= board.rows; r++) {
    const row = [];
    for (let c = 1; c <= board.cols; c++) {
      const v = board.get(r, c);
      row.push(v === EMPTY_CELL ? '.' : v);
    }
    lines.push(row.join(' '));
  }
  return lines;
}

test('gravity: units and roadblocks fall to the bottom of their column, order kept', () => {
  const board = boardFromPicture([
    'dao . qi . .',
    '.   gu . . .',
    'jm  .  . . .',
    '.   .  . . .',
    '.   .  . . .',
    '.   .  jiu . .',
  ]);
  const ev = board.gravity();
  assert.deepEqual(picture(board), [
    '. . . . .',
    '. . . . .',
    '. . . . .',
    '. . . . .',
    'dao . qi . .',
    'jm gu jiu . .',
  ]);
  assert.equal(ev.type, 'fall');
  assert.deepEqual(ev.moves, [
    { from: { r: 3, c: 1 }, to: { r: 6, c: 1 }, kind: 'jm' },
    { from: { r: 1, c: 1 }, to: { r: 5, c: 1 }, kind: 'dao' },
    { from: { r: 2, c: 2 }, to: { r: 6, c: 2 }, kind: 'gu' },
    { from: { r: 1, c: 3 }, to: { r: 5, c: 3 }, kind: 'qi' },
  ]);
});

test('gravity: a settled board returns null and changes nothing', () => {
  const settled = ['. . . . .', '. . . . .', '. . . . .', '. . . . .', 'dao . . . .', 'dao gu gu . .'];
  const board = boardFromPicture(settled);
  assert.equal(board.gravity(), null);
  assert.deepEqual(picture(board), settled);
});

test('gravity: the selection follows its tile', () => {
  const board = boardFromPicture([
    'dao . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', 'gu dao . . .',
  ]);
  board.tap(1, 1);
  board.gravity();
  assert.deepEqual(board.selection(), { r: 5, c: 1 });
});

test('dropRow: each entry lands on its column stack; kinds need not pair inside the row', () => {
  const board = boardFromPicture([
    '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. gu . . .', 'dao gu . . .',
  ]);
  const ev = board.dropRow(['qi', 'jiu', E, E, 'dao']);
  assert.deepEqual(picture(board), [
    '. . . . .', '. . . . .', '. . . . .', '. jiu . . .', 'qi gu . . .', 'dao gu . . dao',
  ]);
  assert.equal(ev.type, 'push');
  assert.deepEqual(ev.cells, [{ r: 5, c: 1, kind: 'qi' }, { r: 4, c: 2, kind: 'jiu' }, { r: 6, c: 5, kind: 'dao' }]);
  assert.equal(ev.empty, false);
});

test('dropRow: refused when a receiving column is full; an empty entry over a full column is fine', () => {
  const full = ['dao . . . .', 'gu . . . .', 'qi . . . .', 'jiu . . . .', 'dun . . . .', 'ma . . . .'];
  const board = boardFromPicture(full);
  assert.deepEqual(board.dropRow(['qi', E, E, E, E]), { ok: false });
  assert.deepEqual(picture(board), full);
  assert.equal(board.dropRow([E, 'qi', E, E, E]).type, 'push');
});

test('topOccupied: true when row 1 holds a unit or a roadblock', () => {
  const rest = ['. . . . .', '. . . . .', '. . . . .', '. . . . .', 'dao dao . . .'];
  assert.equal(boardFromPicture(['. . . . .'].concat(rest)).topOccupied(), false);
  assert.equal(boardFromPicture(['gu . . . gu'].concat(rest)).topOccupied(), true);
  assert.equal(boardFromPicture(['jm . . . .'].concat(rest)).topOccupied(), true);
});

test('pairsLeft: an unpaired half on the board rounds down', () => {
  const board = boardFromPicture(['dao qi dao . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .']);
  assert.equal(board.pairsLeft(), 1);
});
