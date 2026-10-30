// Story board-link/002: dealing, the under layer and read-only queries (T1-T5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, EMPTY_CELL, STACK_DEPTH_DEFAULT, STACK_DEPTH_MAX } from '../../../src/core/constants.mjs';
import { createBoard, deckValid, isStackDepth } from '../../../src/rules/board-link.mjs';
import { CH05_DECK, pairedDeck, dealtBoard } from '../../helpers/board-fixtures.mjs';

const SEED = 20261030;
const CH05 = { seed: SEED, cols: 5, rows: 6, deck: CH05_DECK, mode: 'boss' };
const PRESS = { seed: SEED, cols: 5, rows: 8, deck: pairedDeck(20, 5), mode: 'press', startRows: 4 };

test('T1 same seed and chapter deal identical boards, buried cards included', () => {
  const a = dealtBoard(CH05);
  const b = dealtBoard(CH05);
  assert.deepEqual(a.cells(), b.cells());
  assert.ok(a.buriedCount() > 0);
  // A different seed gives a different layout, so the equality above is not vacuous.
  assert.notDeepEqual(dealtBoard(Object.assign({}, CH05, { seed: SEED + 1 })).cells(), a.cells());
});

test('T2 press startRows=4 fills rows 1-4, leaves 5-8 empty, buries nothing; pairsLeft = 10', () => {
  const board = dealtBoard(PRESS);
  for (const cell of board.cells()) {
    if (cell.r <= 4) assert.notEqual(cell.top, EMPTY_CELL, 'row ' + cell.r + ' col ' + cell.c);
    else assert.equal(cell.top, EMPTY_CELL, 'row ' + cell.r + ' col ' + cell.c);
    assert.equal(board.depthAt(cell.r, cell.c), 0);
  }
  assert.equal(board.buriedCount(), 0);
  assert.equal(board.pairsLeft(), 10);
});

test('T3 chapter 5 full board: 30 top cells filled, 14 buried, at most 1 per cell', () => {
  const board = dealtBoard(CH05);
  const cells = board.cells();
  assert.equal(cells.length, 30);
  let buried = 0;
  for (const cell of cells) {
    assert.notEqual(cell.top, EMPTY_CELL);
    assert.ok(cell.under.length <= STACK_DEPTH_DEFAULT);
    assert.equal(board.depthAt(cell.r, cell.c), cell.under.length);
    buried += cell.under.length;
  }
  assert.equal(buried, 14);
  assert.equal(board.buriedCount(), 14);
  assert.equal(board.depthAt(0, 0), 0);
});

test('T4 chapter 5 full board: pairsLeft = 22', () => {
  assert.equal(dealtBoard(CH05).pairsLeft(), 22);
});

test('T5 chapter 5 full board: every kind (top + under) is even and matches the deck', () => {
  const board = dealtBoard(CH05);
  for (const kind of UNIT_KINDS) {
    const n = board.count(kind);
    assert.equal(n % 2, 0, kind);
    assert.equal(n, CH05_DECK[kind] === undefined ? 0 : CH05_DECK[kind], kind);
  }
});

test('deal refuses an invalid deck and leaves queries read-only', () => {
  const board = createBoard({ seed: SEED, cols: 5, rows: 6 });
  assert.throws(() => board.deal({ deck: pairedDeck(28, 5) }), RangeError);
  assert.throws(() => board.deal({ deck: { huo: 15, ying: 15, ma: 14 } }), RangeError);
  assert.throws(() => board.deal({ deck: pairedDeck(20, 5), mode: 'press' }), RangeError);
  assert.throws(() => board.count('jm'), RangeError);
  board.deal({ deck: CH05_DECK });
  const snapshot = board.cells();
  snapshot[0].top = 'zzz';
  snapshot[0].under.push('zzz');
  assert.deepEqual(board.cells(), dealtBoard(CH05).cells());
});

// --- per-chapter stackDepth (user decision 2026-10-30 "往后逐步加深") ---------

// 30 cells; 30 + 60 = 90 cards fill every stack to depth 2, 30 + 90 = 120 to depth 3.
const DEEP2_FULL = { seed: SEED, cols: 5, rows: 6, deck: pairedDeck(90, 9), mode: 'boss', stackDepth: 2 };
const DEEP3 = { seed: SEED, cols: 5, rows: 6, deck: pairedDeck(80, 10), mode: 'boss', stackDepth: 3 };

test('stackDepth defaults to 1 and is 1..3', () => {
  assert.equal(STACK_DEPTH_DEFAULT, 1);
  assert.equal(STACK_DEPTH_MAX, 3);
  assert.equal(createBoard({ seed: SEED, cols: 5, rows: 6 }).stackDepth(), 1);
  assert.equal(dealtBoard(CH05).stackDepth(), 1);
  assert.equal(createBoard({ seed: SEED, cols: 5, rows: 6, stackDepth: 3 }).stackDepth(), 3);
  for (const bad of [0, 4, 1.5, '2', null]) {
    assert.equal(isStackDepth(bad), false, String(bad));
    assert.throws(() => createBoard({ seed: SEED, cols: 5, rows: 6, stackDepth: bad }), RangeError);
    assert.throws(() => createBoard({ seed: SEED, cols: 5, rows: 6 }).deal({ deck: CH05_DECK, stackDepth: bad }), RangeError);
  }
});

test('deckValid: cols x rows <= sum <= cols x rows x (1 + stackDepth)', () => {
  const size = { cols: 5, rows: 6 };
  for (const depth of [1, 2, 3]) {
    const b = Object.assign({ stackDepth: depth }, size);
    assert.equal(deckValid(pairedDeck(30, 5), b), true, 'min, depth ' + depth);
    assert.equal(deckValid(pairedDeck(28, 5), b), false, 'below min, depth ' + depth);
    assert.equal(deckValid(pairedDeck(30 * (1 + depth), 10), b), true, 'max, depth ' + depth);
    assert.equal(deckValid(pairedDeck(30 * (1 + depth) + 2, 10), b), false, 'over max, depth ' + depth);
  }
  assert.equal(deckValid(pairedDeck(62, 10), size), false, 'omitted stackDepth means 1');
  assert.equal(deckValid(pairedDeck(40, 10), Object.assign({ stackDepth: 4 }, size)), false);
  // Press mode ignores stackDepth.
  assert.equal(deckValid(pairedDeck(20, 5), { cols: 5, rows: 8, mode: 'press', startRows: 4, stackDepth: 3 }), true);
});

test('stackDepth 2 at full capacity: every cell holds exactly 2 buried cards', () => {
  const board = dealtBoard(DEEP2_FULL);
  assert.equal(board.stackDepth(), 2);
  for (const cell of board.cells()) assert.equal(board.depthAt(cell.r, cell.c), 2);
  assert.equal(board.buriedCount(), 60);
  assert.equal(board.pairsLeft(), 45);
  assert.throws(() => createBoard({ seed: SEED, cols: 5, rows: 6 })
    .deal({ deck: pairedDeck(92, 9), mode: 'boss', stackDepth: 2 }), RangeError);
});

test('stackDepth 3: 50 extras, depths 0..3 with some cells at 3, kinds even, deterministic', () => {
  const board = dealtBoard(DEEP3);
  const depths = board.cells().map((cell) => board.depthAt(cell.r, cell.c));
  assert.ok(depths.every((d) => d >= 0 && d <= 3));
  assert.ok(depths.some((d) => d === 3), 'some cell reaches the cap');
  assert.equal(depths.reduce((a, b) => a + b, 0), 50);
  assert.equal(board.buriedCount(), 50);
  for (const kind of UNIT_KINDS) assert.equal(board.count(kind), DEEP3.deck[kind] || 0, kind);
  assert.deepEqual(dealtBoard(DEEP3).cells(), board.cells());
});

test('a deal names its own stackDepth; a later deal without one keeps the cap', () => {
  const board = createBoard({ seed: SEED, cols: 5, rows: 6 });
  board.deal({ deck: pairedDeck(80, 10), mode: 'boss', stackDepth: 3 });
  assert.equal(board.stackDepth(), 3);
  board.deal({ deck: pairedDeck(80, 10), mode: 'boss' });
  assert.equal(board.stackDepth(), 3);
  board.deal({ deck: CH05_DECK, mode: 'boss', stackDepth: 1 });
  assert.equal(board.stackDepth(), 1);
  assert.ok(board.cells().every((cell) => cell.under.length <= 1));
});
