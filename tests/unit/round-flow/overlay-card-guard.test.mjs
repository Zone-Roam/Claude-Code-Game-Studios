// Story round-flow/016: overlay-card buttons ignore taps for CARD_GUARD_MS
// (design/gdd/round-flow.md rule 9, Formulas card_guard; ADR-0002 section 2; TR-round-flow-009).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { CARD_GUARD_MS, ENDING_WIN_MS, BG_GAP_MS } from '../../../src/core/constants.mjs';
import {
  fakeSystems, playRound, feed, fakePicker, buttonIntent, PAUSE_STAMP, TEST_CHAPTER, TEST_SEED, TEST_CONSTANTS,
} from '../../helpers/round-fakes.mjs';

const STEP = 100; // 3 frames = 300 ms (too early), 6 frames = 600 ms (accepted)
const GUARDED = Object.freeze(Object.assign({}, TEST_CONSTANTS, { CARD_GUARD_MS }));
const START = buttonIntent('open', 'start');
const SLOT_2 = Object.freeze(Object.assign(buttonIntent('open', 'slot'), { slot: 2 }));

function openRound(picker) {
  const fakes = fakeSystems();
  return createRound({
    chapter: TEST_CHAPTER, seed: TEST_SEED, constants: GUARDED, progress: fakes.progress, systems: fakes.systems, picker,
  });
}

function exits(round) {
  return round.drainEvents().filter((ev) => ev.type === 'exit').map((ev) => ev.to);
}

test('CARD_GUARD_MS defaults to 500', () => {
  assert.equal(CARD_GUARD_MS, 500);
});

test('AC1: 开讲 tapped 300 ms after the open card appears does nothing; at 600 ms it starts', () => {
  // Arrange
  const round = openRound();
  // Act
  feed(round, 3, STEP);
  round.frame(0, [START]);
  const early = round.state();
  feed(round, 3, STEP);
  round.frame(0, [START]);
  // Assert
  assert.equal(early, 'open');
  assert.equal(round.state(), 'play');
});

test('AC2: a skill slot tapped at 300 ms does nothing; at 600 ms it expands the choice (when there are more generals than slots)', () => {
  // Arrange
  const many = fakePicker(['zhang_fei', 'guan_yu', null], true);
  const few = fakePicker(['zhang_fei', 'guan_yu'], false);
  const rounds = [openRound(many.impl), openRound(few.impl)];
  // Act
  const early = rounds.map((round) => {
    feed(round, 3, STEP);
    round.frame(0, [SLOT_2]);
    return round.state();
  });
  const pressesEarly = [many.s.presses, few.s.presses];
  for (const round of rounds) {
    feed(round, 3, STEP);
    round.frame(0, [SLOT_2]);
  }
  // Assert
  assert.deepEqual(early, ['open', 'open']);
  assert.deepEqual(pressesEarly, [0, 0]);
  assert.equal(many.s.expanded, 2);
  assert.equal(few.s.expanded, null);
});

test('AC3: the lose card: 再来一回 at 300 ms does nothing; at 600 ms it exits', () => {
  // Arrange
  const { round } = playRound({ pressure: { outcome: () => ({ result: 'lose', reason: '城破' }) } }, { constants: GUARDED });
  round.frame(STEP, []);
  round.endingDone();
  round.drainEvents();
  // Act
  feed(round, 3, STEP);
  round.frame(0, [buttonIntent('lose', 'retry')]);
  const early = exits(round);
  feed(round, 3, STEP);
  round.frame(0, [buttonIntent('lose', 'retry')]);
  // Assert
  assert.equal(round.overlay(), 'lose');
  assert.deepEqual(early, []);
  assert.deepEqual(exits(round), ['retry']);
});

test('AC4: the win card: its buttons appear at settle; 300 ms after that nothing, 600 ms after it exits', () => {
  // Arrange
  const { round } = playRound({ pressure: { outcome: () => ({ result: 'win', reason: null }) } }, { constants: GUARDED });
  round.frame(STEP, []);
  feed(round, ENDING_WIN_MS / STEP, STEP); // the ending show; the card has no buttons yet
  round.endingDone();
  round.drainEvents();
  // Act
  feed(round, 3, STEP);
  round.frame(0, [buttonIntent('win', 'catalog')]);
  const early = exits(round);
  feed(round, 3, STEP);
  round.frame(0, [buttonIntent('win', 'catalog')]);
  // Assert
  assert.deepEqual(early, []);
  assert.deepEqual(exits(round), ['catalog']);
});

test('pause card: the pause stamp works at once; 接着讲 at 400 ms is dropped, at 500 ms (pause held) it resumes', () => {
  // Arrange
  const { round } = playRound(undefined, { constants: GUARDED });
  // Act
  round.frame(STEP, [PAUSE_STAMP]);
  const stamped = round.overlay();
  feed(round, 4, STEP);
  round.frame(0, [buttonIntent('pause', 'resume')]);
  const early = round.tokens().length;
  feed(round, 1, STEP);
  round.frame(0, [buttonIntent('pause', 'resume')]);
  // Assert
  assert.equal(stamped, 'pause');
  assert.equal(early, 1);
  assert.deepEqual(round.tokens(), []);
});

test('接着讲 card: a background gap frame counts 0; 500 ms of foreground frames after it, 接着讲 works', () => {
  // Arrange
  const { round } = playRound(undefined, { constants: GUARDED });
  round.frame(STEP, []);
  // Act
  round.frame(BG_GAP_MS + 1, []);
  feed(round, 4, STEP);
  round.frame(0, [buttonIntent('resume', 'resume')]);
  const early = round.overlay();
  feed(round, 1, STEP);
  round.frame(0, [buttonIntent('resume', 'resume')]);
  // Assert
  assert.equal(early, 'resume');
  assert.equal(round.overlay(), null);
  assert.deepEqual(round.tokens(), []);
});
