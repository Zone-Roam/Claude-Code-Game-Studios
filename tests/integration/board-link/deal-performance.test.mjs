// Story board-link/016: deal + first playable check performance (TR-board-link-009).
//
// PROXY ONLY. The AC budget (<= 200 ms for an 8x6 full board with a full under
// layer, 96 cards) is for the benchmark low-end Android phone, which is not
// chosen yet. These Node timings are a regression baseline on the dev PC; the
// on-device measurement is STILL OPEN and is recorded separately once the
// benchmark phone exists (production/qa/evidence/ or the story's notes).
//
// To keep the test stable, it asserts medians over many runs with budgets far
// tighter than the device budget (a PC runs this code roughly an order of
// magnitude faster than a 2020 budget phone), never a single worst run.
// performance.now() is allowed here: tests are not the rules layer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { UNIT_KINDS, RESHUFFLE_TRIES } from '../../../src/core/constants.mjs';
import { createBoard } from '../../../src/rules/board-link.mjs';

const ROWS = 8;
const COLS = 6;
// 12 kinds x 8 = 96 cards: 48 on top plus 48 buried (STACK_DEPTH 1), the
// largest deck deckValid allows. Many kinds make a dead deal (and so the
// silent reshuffle inside deal) as likely as it gets.
const FULL_DECK = Object.freeze(Object.fromEntries(UNIT_KINDS.map((k) => [k, 8])));

const WARMUP = 50;
const RUNS = 300;
// Device budget is 200 ms; the Node proxy asserts a 10x tighter median.
const DEAL_MEDIAN_BUDGET_MS = 20;
// ADR-0002: lower RESHUFFLE_TRIES when RESHUFFLE_TRIES failed permutations take > 16 ms in Node.
const RESHUFFLE_MEDIAN_BUDGET_MS = 16;

function stats(samples) {
  const s = samples.slice().sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { median: at(0.5), p95: at(0.95), max: s[s.length - 1] };
}

function fmt(st) {
  return `median ${st.median.toFixed(3)} ms, p95 ${st.p95.toFixed(3)} ms, max ${st.max.toFixed(3)} ms`;
}

// One timed deal: create the board, deal the full deck (deal runs the silent
// dead-board reshuffle itself), then the first playable check round flow makes.
function timeDeal(seed) {
  const t0 = performance.now();
  const board = createBoard({ seed, cols: COLS, rows: ROWS });
  board.deal({ deck: FULL_DECK, mode: 'boss' });
  const playable = board.hasPlayablePair();
  const ms = performance.now() - t0;
  assert.equal(playable, true, `seed ${seed}: board must be playable after deal`);
  assert.equal(board.pairsLeft(), 48, `seed ${seed}: all 96 cards on the board`);
  return ms;
}

test('deal + first playable check, 8x6 full board, 96 cards: Node proxy median <= 20 ms', () => {
  for (let i = 0; i < WARMUP; i++) timeDeal('warm-' + i);
  const samples = [];
  for (let i = 0; i < RUNS; i++) samples.push(timeDeal('perf-' + i));
  const st = stats(samples);
  console.log(`[board-link/016] deal + first check x${RUNS}: ${fmt(st)} ` +
    '(Node proxy; device budget 200 ms on the benchmark Android phone is NOT yet measured)');
  assert.ok(st.median <= DEAL_MEDIAN_BUDGET_MS,
    `deal median ${st.median.toFixed(3)} ms exceeds proxy budget ${DEAL_MEDIAN_BUDGET_MS} ms`);
});

// A full 8x6 board whose top layer has no playable pair: kind index
// (r + 2c) mod 12 gives different kinds to orthogonal neighbours and distinct
// kinds along each edge, so no two same-kind units connect even through the
// outer ring. Each cell buries a copy of its top kind, so every count is even.
// The injected shuffle stream never moves a card, so all RESHUFFLE_TRIES
// permutations fail and each runs a full (negative) hasPlayablePair scan: the
// worst case of reshuffle level 1. Level 2 (one deterministic swap) then fixes it.
function deadBoard() {
  const board = createBoard({ seed: 1, cols: COLS, rows: ROWS, streams: { shuffle: { shuffle() {} } } });
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const kind = UNIT_KINDS[(r + 2 * c) % UNIT_KINDS.length];
      board.set(r, c, kind);
      board.bury(r, c, kind);
    }
  }
  return board;
}

test('RESHUFFLE_TRIES failed permutations on a dead 8x6 full board: Node median <= 16 ms', () => {
  const probe = deadBoard();
  assert.equal(probe.hasPlayablePair(), false, 'fixture must start dead');

  const timeOnce = () => {
    const board = deadBoard();
    const t0 = performance.now();
    const result = board.ensurePlayable();
    const ms = performance.now() - t0;
    // Level 1 failed all RESHUFFLE_TRIES times, level 2 fixed it: bounded, no loop.
    assert.deepEqual(result, { type: 'reshuffle', fallback: true });
    assert.equal(board.hasPlayablePair(), true);
    return ms;
  };
  for (let i = 0; i < 10; i++) timeOnce();
  const samples = [];
  for (let i = 0; i < 100; i++) samples.push(timeOnce());
  const st = stats(samples);
  console.log(`[board-link/016] ${RESHUFFLE_TRIES} failed permutations + level-2 swap x100: ${fmt(st)} ` +
    '(Node proxy; ADR-0002 says lower RESHUFFLE_TRIES if this exceeds 16 ms)');
  assert.ok(st.median <= RESHUFFLE_MEDIAN_BUDGET_MS,
    `worst-case reshuffle median ${st.median.toFixed(3)} ms exceeds ${RESHUFFLE_MEDIAN_BUDGET_MS} ms; lower RESHUFFLE_TRIES`);
});
