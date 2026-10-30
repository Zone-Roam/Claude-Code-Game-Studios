// Story board-link/004: turn-point tie-break (T1) and the brute-force oracle (T2, T3).
// The oracle is a breadth-first search over (cell, direction, turns) written
// here from scratch; it shares no code with findPath. Dev-only; never shipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CELL, ROADBLOCK, MAX_TURNS } from '../../../src/core/constants.mjs';
import { createStream } from '../../../src/core/rng.mjs';
import { boardFromPicture, dealtBoard, pairedDeck } from '../../helpers/board-fixtures.mjs';

const ORACLE_SEED = 20261030;
const MIN_PAIRS = 100000;
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// Bucket key = turns * LEN_SLOTS + length; any path on an 8x10 grid is shorter.
const LEN_SLOTS = 64;

test('T1 GDD example: (2,1)-(4,3) with both corners open takes corner (2,3) (smaller row)', () => {
  const board = boardFromPicture([
    'gu gu gu gu gu gu',
    'ma .  .  gu gu gu',
    '.  gu .  gu gu gu',
    '.  .  ma gu gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
  ]);
  const expected = [{ r: 2, c: 1 }, { r: 2, c: 3 }, { r: 4, c: 3 }];
  assert.deepEqual(board.findPath({ r: 2, c: 1 }, { r: 4, c: 3 }), expected);
  // Same rule from the other end: corner (2,3) still beats (4,1).
  assert.deepEqual(board.findPath({ r: 4, c: 3 }, { r: 2, c: 1 }), expected.slice().reverse());
});

test('T1b two-turn tie: first turn point from the first unit decides, row-major', () => {
  // (4,4) to (2,2), corners (2,4) and (4,2) blocked. Two length-4 routes:
  // via (4,3),(2,3) and via (3,4),(3,2). First turn point (3,4) < (4,3).
  const board = boardFromPicture([
    'gu gu gu gu gu gu',
    'gu ma .  gu gu gu',
    'gu .  .  .  gu gu',
    'gu gu .  ma gu gu',
    'gu gu gu gu gu gu',
    'gu gu gu gu gu gu',
  ]);
  assert.deepEqual(board.findPath({ r: 4, c: 4 }, { r: 2, c: 2 }),
    [{ r: 4, c: 4 }, { r: 3, c: 4 }, { r: 3, c: 2 }, { r: 2, c: 2 }]);
  // From the other end the first turn point (2,3) < (3,2).
  assert.deepEqual(board.findPath({ r: 2, c: 2 }, { r: 4, c: 4 }),
    [{ r: 2, c: 2 }, { r: 2, c: 3 }, { r: 4, c: 3 }, { r: 4, c: 4 }]);
});

// Copies the top layer of the whole grid (outer ring included) into rows of values.
function snapshot(board) {
  const grid = [];
  for (let r = 0; r <= board.rows + 1; r++) {
    const row = [];
    for (let c = 0; c <= board.cols + 1; c++) row.push(board.get(r, c));
    grid.push(row);
  }
  return grid;
}

// Oracle: from source cell (sr, sc), the best (turns, length) to reach every
// occupied cell with at most MAX_TURNS turns, crossing only empty cells.
// Returns a map "r,c" -> [turns, length]. Bucket queue in (turns, length) order.
function oracleFrom(grid, sr, sc) {
  const H = grid.length;
  const W = grid[0].length;
  const seen = new Set();
  const reached = new Map();
  const buckets = [];
  for (let i = 0; i < (MAX_TURNS + 1) * LEN_SLOTS; i++) buckets.push([]);
  const push = (r, c, d, turns, len) => buckets[turns * LEN_SLOTS + len].push([r, c, d, turns, len]);
  for (let d = 0; d < 4; d++) push(sr, sc, d, 0, 0);
  for (let key = 0; key < buckets.length; key++) {
    for (const state of buckets[key]) {
      const r = state[0];
      const c = state[1];
      const d = state[2];
      const turns = state[3];
      const len = state[4];
      const id = r + ',' + c + ',' + d + ',' + turns;
      if (seen.has(id)) continue;
      seen.add(id);
      const nr = r + DIRS[d][0];
      const nc = c + DIRS[d][1];
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
      if (grid[nr][nc] !== EMPTY_CELL) {
        const cell = nr + ',' + nc;
        if (!reached.has(cell)) reached.set(cell, [turns, len + 1]);
        continue;
      }
      // Standing on an empty cell, keep heading d or turn by 90 degrees.
      for (let nd = 0; nd < 4; nd++) {
        const reverse = DIRS[nd][0] === -DIRS[d][0] && DIRS[nd][1] === -DIRS[d][1];
        if (reverse) continue;
        const nt = nd === d ? turns : turns + 1;
        if (nt <= MAX_TURNS) push(nr, nc, nd, nt, len + 1);
      }
    }
  }
  return reached;
}

// Checks a returned polyline cell by cell; returns [turns, length].
function checkPath(grid, path, a, b) {
  assert.deepEqual(path[0], a);
  assert.deepEqual(path[path.length - 1], b);
  assert.ok(path.length >= 2 && path.length <= MAX_TURNS + 2, 'point count 2..4');
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1];
    const q = path[i];
    assert.ok((p.r === q.r) !== (p.c === q.c), 'segment is horizontal or vertical');
    if (i >= 2) {
      const o = path[i - 2];
      assert.ok((o.r === p.r) !== (p.r === q.r), 'each inner point is a real turn');
    }
    const dr = Math.sign(q.r - p.r);
    const dc = Math.sign(q.c - p.c);
    let r = p.r;
    let c = p.c;
    while (r !== q.r || c !== q.c) {
      r += dr;
      c += dc;
      len++;
      const end = r === b.r && c === b.c && i === path.length - 1;
      if (!end) assert.equal(grid[r][c], EMPTY_CELL, 'path crosses only empty cells');
    }
  }
  return [path.length - 2, len];
}

// Random board: dealt deck (with buried cards), then cells emptied and
// roadblocks placed at random. Buried cards stay under emptied cells.
function randomBoard(stream, index) {
  const cols = 5 + stream.int(2);
  const rows = 6 + stream.int(3);
  const cells = cols * rows;
  const total = cells + (cells % 2) + 2 * stream.int(Math.floor(cells / 2));
  const board = dealtBoard({
    seed: 'oracle-' + index, cols, rows, deck: pairedDeck(total, 2 + stream.int(7)),
  });
  const emptyPct = 15 + stream.int(60);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const roll = stream.int(100);
      if (roll < emptyPct) board.set(r, c, EMPTY_CELL);
      else if (roll < emptyPct + 6) board.set(r, c, ROADBLOCK);
    }
  }
  return board;
}

test('T2+T3 oracle: >= 100,000 same-kind pairs agree on connectivity and best (turns, length)', () => {
  const stream = createStream(ORACLE_SEED, 'oracle');
  let pairs = 0;
  let connected = 0;
  let buried = 0;
  let boards = 0;
  while (pairs < MIN_PAIRS) {
    const board = randomBoard(stream, boards++);
    buried += board.buriedCount();
    const grid = snapshot(board);
    const units = [];
    for (let r = 1; r <= board.rows; r++) {
      for (let c = 1; c <= board.cols; c++) {
        if (grid[r][c] !== EMPTY_CELL && grid[r][c] !== ROADBLOCK) units.push({ r, c });
      }
    }
    for (let i = 0; i < units.length; i++) {
      const a = units[i];
      const reached = oracleFrom(grid, a.r, a.c);
      for (let j = i + 1; j < units.length; j++) {
        const b = units[j];
        if (grid[a.r][a.c] !== grid[b.r][b.c]) continue;
        pairs++;
        const want = reached.has(b.r + ',' + b.c) ? reached.get(b.r + ',' + b.c) : null;
        const path = board.findPath(a, b);
        const where = 'board ' + (boards - 1) + ' pair ' + JSON.stringify([a, b]);
        if (want === null) {
          assert.equal(path, null, 'oracle says not connected: ' + where);
          continue;
        }
        assert.notEqual(path, null, 'oracle says connected: ' + where);
        connected++;
        assert.deepEqual(checkPath(grid, path, a, b), want, 'best (turns, length): ' + where);
      }
    }
  }
  assert.ok(pairs >= MIN_PAIRS);
  // The sample really covers both outcomes and boards with buried cards.
  assert.ok(connected > 0 && connected < pairs, 'sample has connected and unconnected pairs');
  assert.ok(buried > 0, 'sample boards hold buried cards');
});
