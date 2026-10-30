// Story board-link/002: dealing, the under layer and read-only queries (T1-T5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, EMPTY_CELL, STACK_DEPTH } from '../../../src/core/constants.mjs';
import { createBoard } from '../../../src/rules/board-link.mjs';
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
    assert.ok(cell.under.length <= STACK_DEPTH);
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
