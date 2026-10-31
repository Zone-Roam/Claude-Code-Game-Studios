// Gravity press (2026-10-31, user decision for 压阵): the board settles downwards,
// generated waves split pairs across consecutive rows, rows drop onto the column
// stacks, and a push that finds the top row occupied is 破城.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPressure, buildSplitWaveTable } from '../../../src/rules/battle-pressure.mjs';
import { EMPTY_CELL } from '../../../src/core/constants.mjs';
import { createStream } from '../../../src/core/rng.mjs';
import { boardFromPicture, dealtBoard } from '../../helpers/board-fixtures.mjs';

const FIXTURE_INTERVAL = 7000; // test fixture, not a chapter value
const DECK = { dao: 6, qi: 6, jiu: 4, gu: 4 }; // 20 units = 5 cols x 4 start rows
const POOL = [['dao', 3], ['qi', 3], ['jiu', 2], ['gu', 2]];

function rig(chapter, board) {
  const events = [];
  const ctx = { chapter, board, constants: {}, emit: (e) => events.push(e), acquire() {}, release() {} };
  const pressure = createPressure(ctx);
  return { pressure, board, events, of: (type) => events.filter((e) => e.type === type) };
}

function gravityChapter(press) {
  return { id: 'test-gravity', mode: 'press', deck: DECK,
    press: Object.assign({ startRows: 4, waves: 6, interval: FIXTURE_INTERVAL, gravity: true }, press) };
}

function startBoard(seed) {
  return dealtBoard({ seed: seed || 5, cols: 5, rows: 8, deck: DECK, mode: 'press', startRows: 4 });
}

function tickFor(pressure, ms) {
  for (let t = 0; t < ms; t += 10) pressure.tick(10);
}

function oddKinds(counts) {
  return Object.keys(counts).filter((k) => counts[k] % 2 === 1).sort();
}

test('gravity press: the dealt start rows settle to the bottom when the round is built', () => {
  const r = rig(gravityChapter(), startBoard());
  for (let row = 1; row <= 4; row++) for (let c = 1; c <= 5; c++) assert.equal(r.board.get(row, c), EMPTY_CELL);
  for (let row = 5; row <= 8; row++) for (let c = 1; c <= 5; c++) assert.notEqual(r.board.get(row, c), EMPTY_CELL);
});

test('split wave table: two halves stay open between waves, all close on the last wave, kinds even overall', () => {
  const table = buildSplitWaveTable({ waves: 6 }, 5, POOL, createStream(9, 'wave'));
  assert.equal(table.length, 6);
  const counts = {};
  table.forEach((row, w) => {
    assert.equal(row.length, 5);
    assert.equal(row.filter((v) => v === EMPTY_CELL).length, 1);
    for (const v of row) if (v !== EMPTY_CELL) counts[v] = (counts[v] || 0) + 1;
    assert.equal(oddKinds(counts).length, w < 5 ? 2 : 0, 'open halves after wave ' + (w + 1));
  });
});

test('split wave table: a middle wave holds four different kinds (no pair inside the row)', () => {
  const table = buildSplitWaveTable({ waves: 6 }, 5, POOL, createStream(9, 'wave'));
  for (let w = 1; w < 5; w++) {
    const units = table[w].filter((v) => v !== EMPTY_CELL);
    assert.equal(new Set(units).size, 4, 'wave ' + (w + 1) + ': ' + table[w].join(','));
  }
});

test('split wave table: no unit sits in the column where the row before has the same kind', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const table = buildSplitWaveTable({ waves: 6 }, 5, POOL, createStream(seed, 'wave'));
    for (let w = 1; w < table.length; w++) {
      for (let c = 0; c < 5; c++) {
        const v = table[w][c];
        if (v === EMPTY_CELL) continue;
        assert.notEqual(table[w - 1][c], v, 'seed ' + seed + ' wave ' + (w + 1) + ' col ' + (c + 1));
      }
    }
  }
});

test('split wave table: same seed, same table; waveList is used as written', () => {
  const a = buildSplitWaveTable({ waves: 6 }, 5, POOL, createStream(4, 'wave'));
  const b = buildSplitWaveTable({ waves: 6 }, 5, POOL, createStream(4, 'wave'));
  assert.deepEqual(a, b);
  const list = [['dao', 'dao', EMPTY_CELL, 'jm', EMPTY_CELL]];
  assert.deepEqual(buildSplitWaveTable({ waves: 1, waveList: list }, 5, POOL, createStream(4, 'wave')), list);
});

test('gravity press push: the wave row drops onto the stacks; nothing shifts down', () => {
  const r = rig(gravityChapter(), startBoard());
  const row = r.pressure.waveTable()[0];
  const bottom = [];
  for (let c = 1; c <= 5; c++) bottom.push(r.board.get(8, c));
  tickFor(r.pressure, FIXTURE_INTERVAL);
  const push = r.of('push');
  assert.equal(push.length, 1);
  const expected = [];
  row.forEach((v, i) => { if (v !== EMPTY_CELL) expected.push({ r: 4, c: i + 1, kind: v }); });
  assert.deepEqual(push[0].cells, expected);
  for (let c = 1; c <= 5; c++) assert.equal(r.board.get(8, c), bottom[c - 1]);
  assert.equal(r.pressure.hud().wave, 1);
});

test('gravity press breach: a push that finds the top row occupied is 破城; a full bottom row alone is not', () => {
  const r = rig(gravityChapter(), startBoard());
  assert.equal(r.board.bottomOccupied(), true);
  tickFor(r.pressure, FIXTURE_INTERVAL);
  assert.deepEqual(r.pressure.outcome(), { result: null, reason: null });
  assert.equal(r.pressure.hud().danger, false);
  r.board.set(1, 3, 'gu');
  assert.equal(r.pressure.hud().danger, true);
  assert.equal(r.pressure.canScare(), true);
  tickFor(r.pressure, FIXTURE_INTERVAL);
  assert.equal(r.of('push').length, 1);
  assert.deepEqual(r.pressure.outcome(), { result: 'lose', reason: '破城' });
});

test('gravity press settleBoard: after a clear the columns fall and the fall is returned; null when settled', () => {
  const r = rig(gravityChapter(), startBoard());
  assert.equal(r.pressure.settleBoard(), null);
  const above = r.board.get(5, 2);
  r.board.set(6, 2, EMPTY_CELL);
  r.board.set(7, 2, EMPTY_CELL);
  const fall = r.pressure.settleBoard();
  assert.equal(fall.type, 'fall');
  assert.equal(r.board.get(7, 2), above);
  assert.equal(r.board.get(5, 2), EMPTY_CELL);
});

test('gravity press: a settled board with no linkable pair and waves left gets the next row at once', () => {
  const pic = ['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', 'dao qi . . .'];
  const r = rig(gravityChapter(), boardFromPicture(pic));
  r.pressure.settleBoard();
  r.pressure.tick(10);
  assert.equal(r.of('push').length, 1);
  assert.equal(r.pressure.hud().wave, 1);
});

test('gravity press: a board with a linkable pair waits for the timer', () => {
  const pic = ['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', 'dao dao . . .'];
  const r = rig(gravityChapter(), boardFromPicture(pic));
  r.pressure.settleBoard();
  tickFor(r.pressure, FIXTURE_INTERVAL - 10);
  assert.equal(r.of('push').length, 0);
});

test('gravity press holdReshuffle: true while waves are left, false after the last push', () => {
  const r = rig(gravityChapter({ waves: 1 }), startBoard());
  assert.equal(r.pressure.holdReshuffle(), true);
  tickFor(r.pressure, FIXTURE_INTERVAL);
  assert.equal(r.pressure.holdReshuffle(), false);
});

test('press without gravity: no settling, no hold, push and breach as before', () => {
  const pic = ['dao . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .', 'dao . . . .'];
  const board = boardFromPicture(pic);
  const r = rig({ id: 'plain', mode: 'press', deck: DECK, press: { startRows: 4, waves: 2, interval: FIXTURE_INTERVAL } }, board);
  assert.equal(r.pressure.settleBoard(), null);
  assert.equal(board.get(1, 1), 'dao');
  assert.equal(r.pressure.holdReshuffle(), false);
  assert.equal(r.pressure.hud().danger, true);
  tickFor(r.pressure, FIXTURE_INTERVAL);
  assert.deepEqual(r.pressure.outcome(), { result: 'lose', reason: '破城' });
});
