// Story board-link/003: connectivity, turn count and polyline points (T1-T4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// Length of a polyline in cells stepped through (formula path_choice).
function lengthOf(path) {
  let n = 0;
  for (let i = 1; i < path.length; i++) {
    n += Math.abs(path[i].r - path[i - 1].r) + Math.abs(path[i].c - path[i - 1].c);
  }
  return n;
}

test('T1 same row, nothing between -> 2-point path (0 turns)', () => {
  const board = boardFromPicture([
    'gu gu gu gu gu gu',
    'ma .  .  .  ma gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
  ]);
  const path = board.findPath({ r: 2, c: 1 }, { r: 2, c: 5 });
  assert.deepEqual(path, [{ r: 2, c: 1 }, { r: 2, c: 5 }]);
});

test('T2 needs one turn -> 3-point path through the empty corner', () => {
  // (2,2) to (4,4): corner (2,4) is open, corner (4,2) is blocked.
  const board = boardFromPicture([
    'gu gu gu gu gu gu',
    'gu ma .  .  gu gu',
    'gu gu gu .  gu gu',
    'gu gu dao ma gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
  ]);
  const path = board.findPath({ r: 2, c: 2 }, { r: 4, c: 4 });
  assert.deepEqual(path, [{ r: 2, c: 2 }, { r: 2, c: 4 }, { r: 4, c: 4 }]);
  assert.equal(path.length - 2, 1);
});

test('T3 only joinable round the outer ring -> 4-point path with ring coordinates', () => {
  // Both units sit in row 1 with blocks (incl. a roadblock) between them and
  // below them; the only way is up through row 0 and back down.
  const board = boardFromPicture([
    'ma jm gu gu ma gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
  ]);
  const path = board.findPath({ r: 1, c: 1 }, { r: 1, c: 5 });
  assert.deepEqual(path, [{ r: 1, c: 1 }, { r: 0, c: 1 }, { r: 0, c: 5 }, { r: 1, c: 5 }]);
  const ring = path.slice(1, -1).every((p) =>
    p.r === 0 || p.c === 0 || p.r === board.rows + 1 || p.c === board.cols + 1);
  assert.ok(ring, 'turn points lie on the outer ring');
});

test('T4 GDD example: (2,1)-(2,4) takes row 1 (length 5), not the outer ring (length 7)', () => {
  // (2,2),(2,3) hold other blocks; row 1 cols 1-4 empty; ring row 0 also open.
  const board = boardFromPicture([
    '.  .  .  .  gu gu',
    'ma dao dao ma gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
  ]);
  const path = board.findPath({ r: 2, c: 1 }, { r: 2, c: 4 });
  assert.deepEqual(path, [{ r: 2, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 4 }, { r: 2, c: 4 }]);
  assert.equal(lengthOf(path), 5);
  // The ring route really exists: close row 1 and it is the one returned.
  board.set(1, 2, 'gu');
  const ring = board.findPath({ r: 2, c: 1 }, { r: 2, c: 4 });
  assert.deepEqual(ring, [{ r: 2, c: 1 }, { r: 0, c: 1 }, { r: 0, c: 4 }, { r: 2, c: 4 }]);
  assert.equal(lengthOf(ring), 7);
});
