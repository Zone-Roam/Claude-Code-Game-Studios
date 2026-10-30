// Story board-link/005: tap state machine, match, miss and reveal (T1-T6 + edge cases).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS } from '../../../src/core/constants.mjs';
import {
  boardFromPicture, dealtBoard, withoutBuried, CH05_DECK,
} from '../../helpers/board-fixtures.mjs';

// (2,3): 刀 on top, 鼓 buried. (2,5): another 刀, straight line through empty (2,4).
const STACKED = [
  'gu gu gu     gu  gu  gu',
  'ma ma dao/gu .   dao ma',
  'qi qi qi     qi  qi  qi',
  'qi qi qi     qi  qi  qi',
  'qi qi qi     qi  qi  qi',
  'qi qi qi     qi  qi  qi',
];

// 马 at (3,3) is boxed in by 鼓 on all four sides; the other 马 sits at (3,5).
const BOXED = [
  '. .  .  .  .  .',
  '. .  gu .  .  .',
  '. gu ma gu ma .',
  '. .  gu .  .  .',
  '. .  .  .  .  .',
  '. .  jm .  .  .',
];

function cellAt(board, r, c) {
  return board.cells().filter((x) => x.r === r && x.c === c)[0];
}

test('T1 matching 刀 over 鼓 reveals 鼓 in place', () => {
  const board = boardFromPicture(STACKED);
  assert.equal(board.tap(2, 3), null);
  const ev = board.tap(2, 5);
  assert.deepEqual(ev, {
    type: 'match', kind: 'dao', a: { r: 2, c: 3 }, b: { r: 2, c: 5 },
    path: [{ r: 2, c: 3 }, { r: 2, c: 5 }], forced: false, broken: [],
    revealed: [{ r: 2, c: 3, kind: 'gu' }],
  });
  assert.equal(board.get(2, 3), 'gu');
  assert.equal(board.depthAt(2, 3), 0, 'I3: the revealed card leaves nothing below');
  assert.equal(board.get(2, 5), null);
  assert.equal(board.selection(), null);
});

test('T2 tapping a stacked cell selects its top card, not the buried one', () => {
  const board = boardFromPicture(STACKED);
  board.tap(2, 3);
  assert.deepEqual(board.selection(), { r: 2, c: 3 });
  assert.equal(cellAt(board, 2, 3).top, 'dao');
});

test('T3 buried cards never change connectivity (dealt board and a holed picture)', () => {
  const holed = boardFromPicture([
    'gu/dao .     ma     .  gu    .',
    '.      dao   .      .  .     ma/gu',
    'ma     .     jm     .  dao/ma .',
    '.      .     .      gu .     .',
    'dao    .     gu/dao .  .     ma',
    '.      ma    .      .  .     dao',
  ]);
  const dealt = dealtBoard({ seed: 5, cols: 5, rows: 6, deck: CH05_DECK, mode: 'boss' });
  for (const board of [holed, dealt]) {
    const bare = withoutBuried(board);
    assert.ok(board.buriedCount() > 0);
    assert.equal(bare.buriedCount(), 0);
    const tops = board.cells().filter((x) => UNIT_KINDS.indexOf(x.top) !== -1);
    let pairs = 0;
    for (const p of tops) {
      for (const q of tops) {
        if (p === q || p.top !== q.top) continue;
        pairs++;
        assert.deepEqual(board.findPath(p, q), bare.findPath(p, q), JSON.stringify([p, q]));
      }
    }
    assert.ok(pairs > 0);
  }
});

test('T4 same kind but blocked -> miss, selection moves to the second, board unchanged', () => {
  const board = boardFromPicture(BOXED);
  const before = board.cells();
  board.tap(3, 3);
  const ev = board.tap(3, 5);
  assert.deepEqual(ev, { type: 'miss', kind: 'ma', a: { r: 3, c: 3 }, b: { r: 3, c: 5 } });
  assert.deepEqual(board.selection(), { r: 3, c: 5 });
  assert.deepEqual(board.cells(), before);
});

test('T5 with a selection, tapping an empty cell or the outer ring cancels it', () => {
  const board = boardFromPicture(BOXED);
  board.tap(3, 3);
  assert.equal(board.tap(1, 1), null);
  assert.equal(board.selection(), null);

  board.tap(3, 3);
  assert.equal(board.tap(0, 3), null);
  assert.equal(board.selection(), null);
});

test('T6 without a selection, tapping an empty cell, the outer ring or a roadblock changes nothing', () => {
  const board = boardFromPicture(BOXED);
  const before = board.cells();
  for (const p of [[1, 1], [7, 7], [6, 3]]) {
    assert.equal(board.tap(p[0], p[1]), null);
    assert.equal(board.selection(), null);
    assert.deepEqual(board.cells(), before);
  }
});

test('edge: tapping the selected cell again cancels; a roadblock keeps the selection', () => {
  const board = boardFromPicture(BOXED);
  board.tap(3, 3);
  assert.equal(board.tap(3, 3), null);
  assert.equal(board.selection(), null);
  board.tap(3, 3);
  assert.equal(board.tap(6, 3), null);
  assert.deepEqual(board.selection(), { r: 3, c: 3 });
});

test('edge: a unit of another kind takes over the selection without an event', () => {
  const board = boardFromPicture(BOXED);
  board.tap(3, 3);
  assert.equal(board.tap(2, 3), null);
  assert.deepEqual(board.selection(), { r: 2, c: 3 });
});

test('edge: taps apply in order; the revealed card is selectable at once', () => {
  const board = boardFromPicture(STACKED);
  board.tap(2, 3);
  board.tap(2, 5);
  board.tap(2, 3);
  assert.deepEqual(board.selection(), { r: 2, c: 3 });
  assert.equal(cellAt(board, 2, 3).top, 'gu');
});

test('edge: events are plain data and deal() clears the selection', () => {
  const board = boardFromPicture(STACKED);
  board.tap(2, 3);
  const ev = board.tap(2, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(ev)), ev);

  const dealt = dealtBoard({ seed: 5, cols: 5, rows: 6, deck: CH05_DECK, mode: 'boss' });
  dealt.tap(1, 1);
  dealt.deal({ deck: CH05_DECK, mode: 'boss' });
  assert.equal(dealt.selection(), null);
});

test('edge: tap off the grid and bad bury calls throw RangeError', () => {
  const board = boardFromPicture(BOXED);
  assert.throws(() => board.tap(8, 1), RangeError);
  assert.throws(() => board.bury(1, 1, 'gu'), RangeError, 'empty top (I3)');
  assert.throws(() => board.bury(6, 3, 'gu'), RangeError, 'roadblock top (I3)');
  assert.throws(() => board.bury(0, 1, 'gu'), RangeError, 'outer ring');
  assert.throws(() => board.bury(3, 3, 'jm'), RangeError, 'not a unit kind');
  board.bury(3, 3, 'gu');
  assert.throws(() => board.bury(3, 3, 'gu'), RangeError, 'STACK_DEPTH');
});
