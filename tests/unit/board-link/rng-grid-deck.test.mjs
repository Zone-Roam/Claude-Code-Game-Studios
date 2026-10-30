// Story board-link/001: random streams, grid, deck validation (T1-T6; T7 is in tests/unit/core/rng.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, deckValid } from '../../../src/rules/board-link.mjs';
import { BOARD_COLS } from '../../../src/core/constants.mjs';

const SEED = 424242;
const N = 30;

function take(stream) {
  const out = [];
  for (let i = 0; i < N; i++) out.push(stream.next());
  return out;
}

/** A board that burned the shuffle stream `count` times, as dead-board reshuffles would. */
function boardAfterShuffles(count) {
  const board = createBoard({ seed: SEED, rows: 6 });
  for (let i = 0; i < count; i++) board.rng('shuffle').shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  return board;
}

test('T1 wave, add and deal streams are identical whether 0 or 3 reshuffles happened', () => {
  const a = boardAfterShuffles(0);
  const b = boardAfterShuffles(3);
  assert.deepEqual(take(a.rng('wave')), take(b.rng('wave')));
  assert.deepEqual(take(a.rng('add')), take(b.rng('add')));
  assert.deepEqual(take(a.rng('deal')), take(b.rng('deal')));
});

test('T2 reshuffling consumes the shuffle stream, and the four streams differ', () => {
  const a = boardAfterShuffles(0);
  const b = boardAfterShuffles(3);
  assert.notDeepEqual(take(a.rng('shuffle')), take(b.rng('shuffle')));
  const c = boardAfterShuffles(0);
  const firsts = ['deal', 'shuffle', 'wave', 'add'].map((n) => c.rng(n).next());
  assert.equal(new Set(firsts).size, 4);
  assert.throws(() => c.rng('other'), RangeError);
});

/** Even counts spread over the first kinds (14 each at most), summing to total. */
function deckOf(total) {
  const deck = {};
  let left = total;
  for (const k of ['huo', 'ying', 'ma', 'gong', 'shui']) {
    const n = Math.min(left, 14);
    deck[k] = n;
    left -= n;
  }
  assert.equal(left, 0);
  return deck;
}

test('T3 deckValid rejects totals 28 and 62 on a 5x6 board', () => {
  assert.equal(deckValid(deckOf(28), { cols: 5, rows: 6 }), false);
  assert.equal(deckValid(deckOf(62), { cols: 5, rows: 6 }), false);
});

test('T4 deckValid accepts totals 30 and 60 on a 5x6 board', () => {
  assert.equal(deckValid(deckOf(30), { cols: 5, rows: 6 }), true);
  assert.equal(deckValid(deckOf(60), { cols: 5, rows: 6 }), true);
});

test('T5 deckValid rejects any odd kind count even when the total is in range', () => {
  const deck = { huo: 15, ying: 15, ma: 14 };
  assert.equal(deck.huo + deck.ying + deck.ma, 44);
  assert.equal(deckValid(deck, { cols: 5, rows: 6 }), false);
  assert.equal(deckValid({ huo: 30, zzz: 14 }, { cols: 5, rows: 6 }), false);
});

test('T6 omitted cols means 6 columns on the board and in deckValid', () => {
  const board = createBoard({ seed: SEED, rows: 6 });
  assert.equal(BOARD_COLS, 6);
  assert.equal(board.cols, 6);
  // 6x6 = 36 cells: 34 is too few, 36 is enough.
  assert.equal(deckValid(deckOf(34), { rows: 6 }), false);
  assert.equal(deckValid(deckOf(36), { rows: 6 }), true);
});

test('grid has an always-empty outer ring and (row, col) addressing', () => {
  const board = createBoard({ seed: SEED, cols: 5, rows: 6 });
  board.set(6, 5, 'huo');
  assert.equal(board.get(6, 5), 'huo');
  assert.equal(board.get(7, 6), null);
  assert.throws(() => board.set(0, 3, 'huo'), RangeError);
  assert.throws(() => board.get(8, 0), RangeError);
  assert.throws(() => createBoard({ seed: 1, cols: 7, rows: 6 }), RangeError);
});

test('press mode requires sum == cols * startRows', () => {
  const shape = { cols: 5, rows: 8, mode: 'press', startRows: 4 };
  assert.equal(deckValid({ huo: 10, ying: 10 }, shape), true);
  assert.equal(deckValid({ huo: 10, ying: 12 }, shape), false);
});
