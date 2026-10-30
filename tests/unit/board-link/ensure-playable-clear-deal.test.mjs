// Story board-link/011: ensurePlayable level 4 (break roadblocks, clear) and the
// silent reshuffle after deal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, ROADBLOCK, EMPTY_CELL } from '../../../src/core/constants.mjs';
import { createBoard } from '../../../src/rules/board-link.mjs';
import { boardFromPicture, DEAD_FULL } from '../../helpers/board-fixtures.mjs';

// Level 3 board with roadblocks: the last pair stacked at (4,4), roadblocks elsewhere.
const STACKED_WITH_BLOCKS = [
  '. .  . .       .',
  '. jm . .       .',
  '. .  . .       .',
  '. .  . dao/dao .',
  '. .  . .       jm',
  '. .  . .       .',
];

// Level 4 board: the last two 刀; the one at (3,3) is walled in by four
// roadblocks, nothing is buried.
const WALLED_IN = [
  '. .  .   .  .',
  '. .  jm  .  .',
  '. jm dao jm .',
  '. .  jm  .  .',
  '. .  .   .  .',
  '. .  .   .  dao',
];

// I1 already broken (one 刀, one 旗): no level can make a pair, so level 4
// breaks the roadblock and clears what is left.
const BROKEN_I1 = [
  'dao . .  . .',
  '.   . .  . .',
  '.   . jm . .',
  '.   . .  . .',
  '.   . .  . .',
  '.   . .  . qi',
];

// Seed 1506 deals this deck on a 5x6 board with no playable pair (found by a
// one-off search over seeds with the raw deal; kept as data). DEAD_DEAL_1506 is
// that raw deal, before the silent reshuffle.
const DEAD_DEAL_SEED = 1506;
const DEAD_DEAL_DECK = Object.freeze({
  huo: 4, ying: 4, ma: 4, gong: 4, shui: 2, cheng: 2, dao: 2, gu: 2, dun: 2, shu: 2, qi: 2, jiu: 2,
});
const DEAD_DEAL_1506 = Object.freeze([
  'huo  ma   cheng qi       shui',
  'shu  gu   shui  ying     ma',
  'jiu  dun  shu   dao      ying/dun',
  'ma   huo  ying  gong     huo',
  'ying gong gu    cheng    gong',
  'dao  jiu  gong  huo/ma   qi',
]);

function roadblocks(board) {
  return board.cells().filter((x) => x.top === ROADBLOCK).map((x) => ({ r: x.r, c: x.c }));
}

function kindCounts(board) {
  const out = {};
  for (const k of UNIT_KINDS) out[k] = board.count(k);
  return out;
}

function shape(board) {
  return board.cells().map((x) => ({
    r: x.r, c: x.c, under: x.under.length,
    top: x.top === EMPTY_CELL || x.top === ROADBLOCK ? x.top : 'unit',
  }));
}

test('AC1 level 2 with a roadblock: roadblock stays, reshuffle {fallback: true}, playable', () => {
  const stuck = { shuffle: (cards) => cards };
  const board = boardFromPicture(DEAD_FULL, { streams: { shuffle: stuck } });
  const before = roadblocks(board);
  assert.deepEqual(before, [{ r: 3, c: 3 }]);
  assert.deepEqual(board.ensurePlayable(), { type: 'reshuffle', fallback: true });
  assert.deepEqual(roadblocks(board), before);
  assert.equal(board.hasPlayablePair(), true);
});

test('AC1 level 3 with roadblocks: roadblocks stay, reshuffle {fallback: true}, playable', () => {
  const board = boardFromPicture(STACKED_WITH_BLOCKS);
  const before = roadblocks(board);
  assert.equal(before.length, 2);
  assert.deepEqual(board.ensurePlayable(), { type: 'reshuffle', fallback: true });
  assert.deepEqual(roadblocks(board), before);
  assert.equal(board.get(1, 1), 'dao');
  assert.equal(board.hasPlayablePair(), true);
});

test('AC1 level 4 walled-in pair: every roadblock breaks, clear.blocks lists them, pair playable', () => {
  const board = boardFromPicture(WALLED_IN);
  board.tap(6, 5);
  const ev = board.ensurePlayable();
  assert.deepEqual(ev, {
    type: 'clear', source: 'reshuffle', cells: [], buried: 0,
    blocks: [{ r: 2, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 4, c: 3 }],
    revealed: [], pairs: 0,
  });
  assert.deepEqual(roadblocks(board), []);
  assert.equal(board.get(3, 3), 'dao');
  assert.equal(board.get(6, 5), 'dao');
  assert.equal(board.hasPlayablePair(), true);
  assert.equal(board.selection(), null);
});

test('level 4 last resort: still dead after breaking roadblocks, every unit is cleared', () => {
  const board = boardFromPicture(BROKEN_I1);
  const ev = board.ensurePlayable();
  assert.deepEqual(ev, {
    type: 'clear', source: 'reshuffle', cells: [{ r: 1, c: 1 }, { r: 6, c: 5 }], buried: 0,
    blocks: [{ r: 3, c: 3 }], revealed: [], pairs: 1,
  });
  assert.equal(board.cells().every((x) => x.top === EMPTY_CELL && x.under.length === 0), true);
  assert.equal(board.ensurePlayable(), null);
});

test('AC2 dead right after deal: deal reshuffles silently and returns no reshuffle result', () => {
  const raw = boardFromPicture(DEAD_DEAL_1506);
  assert.equal(raw.hasPlayablePair(), false);
  const board = createBoard({ seed: DEAD_DEAL_SEED, cols: 5, rows: 6 });
  const result = board.deal({ deck: DEAD_DEAL_DECK });
  assert.equal(result, undefined);
  assert.equal(board.hasPlayablePair(), true);
  assert.deepEqual(shape(board), shape(raw));
  assert.deepEqual(kindCounts(board), kindCounts(raw));
  assert.notDeepEqual(board.cells(), raw.cells());
  assert.equal(board.ensurePlayable(), null);
});
