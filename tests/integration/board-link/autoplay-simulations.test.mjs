// Story board-link/015: 1000 fixed-seed auto-play games per case, checking
// invariants I1, I2 and I3 at every settle point (TR-board-link-002/004/005).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS, ROADBLOCK, EMPTY_CELL } from '../../../src/core/constants.mjs';
import { createStream } from '../../../src/core/rng.mjs';
import { createBoard } from '../../../src/rules/board-link.mjs';
import { CH05_DECK } from '../../helpers/board-fixtures.mjs';
import {
  playGame, deckWeights, drawPairs, guanYuTargets, occupiedRows,
} from '../../helpers/autoplay.mjs';

const GAMES = 1000;
const EVERY = 5;
// AC 2 names the 400-step cap; cases 1 and 3 use the same cap as a safety net.
const MAX_STEPS = 400;

// Press decks: chapter 1 (5 columns, 20 units) and a 6-column variant (24 units).
const PRESS_DECK_6 = Object.freeze({ dao: 6, qi: 6, jiu: 4, gu: 4, dun: 4 });
const PRESS_DECK_5 = Object.freeze({ dao: 6, qi: 6, jiu: 4, gu: 4 });
// stackDepth 3 (user decision 2026-10-30 "往后逐步加深"): 5x7 board, 35 on top and
// 45 buried, up to 3 under one cell, all 12 kinds (effects 火 马 水 included).
const DEEP3_DECK = Object.freeze({
  huo: 2, ying: 10, ma: 2, gong: 10, shui: 2, cheng: 6, dao: 8, gu: 6, dun: 8, shu: 10, qi: 8, jiu: 8,
});

// --- interjections (each returns its event, null when not applicable) -----

function clearKindOp(board, chooser) {
  const present = UNIT_KINDS.filter((k) => board.count(k) > 0);
  return board.clearKind(present[chooser.int(present.length)], 'effect');
}

function guanYuBottomRowOp(board) {
  // Guan Yu may only pick a row holding something; "bottom row" = the lowest such row.
  const rows = occupiedRows(board);
  return board.clearCells(guanYuTargets(board, rows[rows.length - 1]), 'skill');
}

function guanYuRandomRowOp(board, chooser) {
  const rows = occupiedRows(board);
  return board.clearCells(guanYuTargets(board, rows[chooser.int(rows.length)]), 'skill');
}

function pushThreePairsOp(weights) {
  return (board) => {
    if (board.bottomOccupied()) return null;
    const wave = board.rng('wave');
    const row = [];
    for (const kind of drawPairs(wave, weights, 3)) row.push(kind, kind);
    return board.pushRowFromTop(wave.shuffle(row));
  };
}

function pushTwoPairsAndSlotOp(weights) {
  return (board) => {
    if (board.bottomOccupied()) return null;
    const wave = board.rng('wave');
    const row = [];
    for (const kind of drawPairs(wave, weights, 2)) row.push(kind, kind);
    row.push(wave.int(2) === 0 ? EMPTY_CELL : ROADBLOCK);
    return board.pushRowFromTop(wave.shuffle(row));
  };
}

function addPairsOp(weights) {
  return (board) => board.addPairs(drawPairs(board.rng('add'), weights, 2));
}

function sweepOp(board) {
  return board.shuffleTopRows(board.rng('wave'));
}

function placeBlocksOp(board) {
  return board.placeBlocks(2, board.rng('wave'));
}

// --- cases -----------------------------------------------------------------

const CASES = {
  press6: {
    seedBase: 150000,
    make(seed) {
      const board = createBoard({ seed, cols: 6, rows: 8 });
      board.deal({ deck: PRESS_DECK_6, mode: 'press', startRows: 4 });
      return board;
    },
    interjections: [clearKindOp, guanYuBottomRowOp, pushThreePairsOp(deckWeights(PRESS_DECK_6)),
      addPairsOp(deckWeights(PRESS_DECK_6))],
  },
  press5: {
    seedBase: 250000,
    make(seed) {
      const board = createBoard({ seed, cols: 5, rows: 8 });
      board.deal({ deck: PRESS_DECK_5, mode: 'press', startRows: 4 });
      return board;
    },
    interjections: [clearKindOp, guanYuBottomRowOp, pushTwoPairsAndSlotOp(deckWeights(PRESS_DECK_5)),
      addPairsOp(deckWeights(PRESS_DECK_5))],
  },
  stacked: {
    seedBase: 350000,
    make(seed) {
      const board = createBoard({ seed, cols: 5, rows: 6 });
      board.deal({ deck: CH05_DECK, mode: 'boss' });
      return board;
    },
    interjections: [clearKindOp, guanYuRandomRowOp, addPairsOp(deckWeights(CH05_DECK)), sweepOp,
      placeBlocksOp],
  },
  deep3: {
    seedBase: 450000,
    make(seed) {
      const board = createBoard({ seed, cols: 5, rows: 7 });
      board.deal({ deck: DEEP3_DECK, mode: 'boss', stackDepth: 3 });
      return board;
    },
    interjections: [clearKindOp, guanYuRandomRowOp, addPairsOp(deckWeights(DEEP3_DECK)), sweepOp,
      placeBlocksOp],
  },
};

function playCase(spec, seed) {
  const board = spec.make(seed);
  return playGame({
    board,
    chooser: createStream(seed, 'autoplay'),
    interjections: spec.interjections,
    every: EVERY,
    maxSteps: MAX_STEPS,
  });
}

// Plays GAMES seeds and returns every failure plus totals.
function runCase(spec) {
  const failures = [];
  let maxSteps = 0;
  let totalSteps = 0;
  const seen = {};
  for (let i = 0; i < GAMES; i++) {
    const seed = spec.seedBase + i;
    const result = playCase(spec, seed);
    maxSteps = Math.max(maxSteps, result.steps);
    totalSteps += result.steps;
    for (const t of result.trace) seen[t] = (seen[t] || 0) + 1;
    if (result.violations.length > 0 || !result.cleared) {
      failures.push('seed ' + seed + ' (' + result.steps + ' steps, cleared=' + result.cleared + '): ' +
        result.violations.slice(0, 3).join('; '));
    }
  }
  return { failures, maxSteps, totalSteps, seen };
}

function assertCase(t, spec, expectedEvents) {
  // Arrange: spec; Act
  const out = runCase(spec);
  t.diagnostic('max steps ' + out.maxSteps + ', mean ' + (out.totalSteps / GAMES).toFixed(1) +
    ', events ' + JSON.stringify(out.seen));
  // Assert
  assert.deepEqual(out.failures.slice(0, 10), [], out.failures.length + ' of ' + GAMES + ' games failed');
  assert.ok(out.maxSteps <= MAX_STEPS);
  for (const type of expectedEvents) {
    assert.ok(out.seen[type] > 0, 'interjection ' + type + ' never ran');
  }
}

test('AC1 1000 press games, 6 columns: I1 and I2 hold at every settle point and every game clears', (t) => {
  assertCase(t, CASES.press6, ['clear', 'push', 'add']);
});

test('AC2 1000 press games, 5 columns with null/jm slots: I1, I2, I3 hold, every game clears within 400 steps', (t) => {
  assertCase(t, CASES.press5, ['clear', 'push', 'add']);
});

test('AC3 1000 stacked 5x6 games (deck 44) with Guan Yu rows, sweeps and roadblocks: I1, I2, I3 hold and every game clears', (t) => {
  assertCase(t, CASES.stacked, ['clear', 'add', 'sweep', 'blocks']);
});

test('AC4 1000 stackDepth-3 5x7 games (deck 80) with Guan Yu rows, sweeps and roadblocks: I1, I2, I3 and the 3-card cap hold, every game clears', (t) => {
  // Arrange: the deal really stacks 3 deep somewhere in most games.
  let threeDeep = 0;
  for (let i = 0; i < 50; i++) {
    const board = CASES.deep3.make(CASES.deep3.seedBase + i);
    assert.equal(board.stackDepth(), 3);
    if (board.cells().some((cell) => cell.under.length === 3)) threeDeep++;
  }
  assert.ok(threeDeep >= 25, threeDeep + ' of 50 deals reach depth 3');
  assertCase(t, CASES.deep3, ['clear', 'add', 'sweep', 'blocks']);
});

test('the same seed replays the same game event for event (TR-board-link-002)', () => {
  for (const name of Object.keys(CASES)) {
    const spec = CASES[name];
    for (let i = 0; i < 20; i++) {
      const seed = spec.seedBase + i;
      const first = playCase(spec, seed);
      const second = playCase(spec, seed);
      assert.deepEqual(second.trace, first.trace, name + ' seed ' + seed);
      assert.equal(second.steps, first.steps);
    }
  }
});

test('Guan Yu minimal targets never ask for an odd cut on a stacked board (depth 1 and 3)', () => {
  for (const spec of [CASES.stacked, CASES.deep3]) {
    for (const seed of [424242, 424243, 424244]) {
      // Arrange
      const board = spec.make(seed);
      for (let r = 1; r <= board.rows; r++) {
        const before = UNIT_KINDS.map((k) => board.count(k));
        // Act: plan only (a refused clearCells leaves the board unchanged)
        const targets = guanYuTargets(board, r);
        const probe = spec.make(seed);
        const result = probe.clearCells(targets, 'skill');
        // Assert
        assert.notEqual(result.ok, false, 'seed ' + seed + ' row ' + r);
        assert.deepEqual(UNIT_KINDS.map((k) => board.count(k)), before);
        assert.ok(UNIT_KINDS.every((k) => probe.count(k) % 2 === 0));
      }
    }
  }
});
