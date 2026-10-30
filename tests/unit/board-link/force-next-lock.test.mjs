// Story board-link/006: Zhao Yun stand-by (setForceNext / forceNext) and board lock (T1-T4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromPicture, dealtBoard, CH05_DECK } from '../../helpers/board-fixtures.mjs';

// 马 at (3,3) is boxed in by 鼓 on all four sides; the other 马 sits at (3,5).
// The 鼓 pair (2,3)/(4,3) connects round the left of the box.
const BOXED = [
  '. .  .  .  .  .',
  '. .  gu .  .  .',
  '. gu ma gu ma .',
  '. .  gu .  .  .',
  '. .  .  .  .  .',
  '. .  jm .  .  .',
];

test('T1 stand-by: an unconnected same-kind pair matches forced on a 2-point straight line', () => {
  const board = boardFromPicture(BOXED);
  assert.equal(board.findPath({ r: 3, c: 3 }, { r: 3, c: 5 }), null, 'fixture: pair is blocked');
  board.setForceNext(true);
  assert.equal(board.tap(3, 3), null);
  const ev = board.tap(3, 5);
  assert.deepEqual(ev, {
    type: 'match', kind: 'ma', a: { r: 3, c: 3 }, b: { r: 3, c: 5 },
    path: [{ r: 3, c: 3 }, { r: 3, c: 5 }], forced: true, broken: [], revealed: [],
  });
  assert.equal(board.forceNext(), false, 'the pair uses the stand-by up');
  assert.equal(board.get(3, 3), null);
  assert.equal(board.get(3, 5), null);
  assert.equal(board.selection(), null);
});

test('T2 stand-by: a connected same-kind pair still matches forced, on its normal path', () => {
  const board = boardFromPicture(BOXED);
  const normal = board.findPath({ r: 2, c: 3 }, { r: 4, c: 3 });
  assert.notEqual(normal, null, 'fixture: pair is connected');
  board.setForceNext(true);
  board.tap(2, 3);
  const ev = board.tap(4, 3);
  assert.equal(ev.type, 'match');
  assert.equal(ev.forced, true);
  assert.deepEqual(ev.path, normal, 'GDD rule 14: connected -> normal polyline');
  assert.equal(board.forceNext(), false);
});

test('T3 stand-by: a different-kind second tap moves the selection and keeps stand-by on', () => {
  const board = boardFromPicture(BOXED);
  board.setForceNext(true);
  board.tap(3, 3);
  assert.equal(board.tap(3, 4), null);
  assert.deepEqual(board.selection(), { r: 3, c: 4 });
  assert.equal(board.forceNext(), true);
  // Stand-by survives the change and is used by the next same-kind pair.
  const ev = board.tap(3, 2);
  assert.equal(ev.forced, true);
  assert.equal(board.forceNext(), false);
});

// Board lock is round-flow state (GDD rules 18, 130; round-flow rule 5): a locked
// board never receives taps. Round-flow is not implemented yet, so this stub is the
// minimal input entry that drops taps while locked and keeps no queue.
// TO RE-CHECK in the round-flow story: its real input entry drops (not buffers)
// taps while locked, and nothing is replayed on unlock.
function lockStub(board) {
  let locked = false;
  return {
    setLocked(on) { locked = on; },
    tap(r, c) { return locked ? null : board.tap(r, c); },
  };
}

test('T4 locked board: taps change nothing and are not replayed after unlock', () => {
  const board = boardFromPicture(BOXED);
  board.setForceNext(true);
  board.tap(2, 3);
  const before = { cells: board.cells(), selection: board.selection(), force: board.forceNext() };
  const input = lockStub(board);
  input.setLocked(true);
  assert.equal(input.tap(4, 3), null);
  assert.equal(input.tap(3, 3), null);
  assert.deepEqual(
    { cells: board.cells(), selection: board.selection(), force: board.forceNext() }, before);
  input.setLocked(false);
  assert.deepEqual(
    { cells: board.cells(), selection: board.selection(), force: board.forceNext() }, before,
    'unlocking replays nothing');
});

test('stand-by defaults off and deal (round start) turns it off', () => {
  const board = dealtBoard({ seed: 5, cols: 5, rows: 6, deck: CH05_DECK });
  assert.equal(board.forceNext(), false);
  board.setForceNext(true);
  assert.equal(board.forceNext(), true);
  board.deal({ deck: CH05_DECK });
  assert.equal(board.forceNext(), false);
});

test('without stand-by the blocked pair is still a miss', () => {
  const board = boardFromPicture(BOXED);
  board.setForceNext(true);
  board.setForceNext(false);
  board.tap(3, 3);
  assert.equal(board.tap(3, 5).type, 'miss');
});
