// Story round-flow/010: background, implicit background and 接着讲 (rules 3, 10, 11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BG_GAP_MS, MAX_STEP_MS } from '../../../src/core/constants.mjs';
import { createRound } from '../../../src/rules/round-flow.mjs';
import {
  playRound, fakeSystems, feed, buttonIntent, PAUSE_STAMP, CELL, TEST_CHAPTER, TEST_SEED, TEST_CONSTANTS,
} from '../../helpers/round-fakes.mjs';

const DT = 16;
const LONG_GAP = 4000;
const RESUME = buttonIntent('resume', 'resume');
const reasons = (round) => round.tokens().map((t) => t.reason);

test('AC1: in play a 4000 ms frame keeps gameTime, holds background and shows the 接着讲 card; its taps are unread', () => {
  // Arrange
  const { round, calls } = playRound();
  feed(round, 3, DT);
  const before = round.gameTime();
  round.drainEvents();
  // Act
  round.frame(LONG_GAP, [CELL]);
  // Assert
  assert.equal(round.gameTime(), before);
  assert.deepEqual(round.tokens(), [{ reason: 'background', remainingMs: null }]);
  assert.equal(round.overlay(), 'resume');
  assert.deepEqual(round.buttons(), ['resume']);
  assert.equal(calls('board.tap').length, 0);
  assert.equal(calls('pressure.tick').length, 3);
  assert.deepEqual(round.drainEvents().filter((e) => e.type === 'tokenStart').map((e) => e.reason), ['background']);
});

test('AC2: background acquired twice (hidden twice, then a long gap) is returned by one 接着讲', () => {
  // Arrange
  const { round } = playRound();
  // Act
  round.onHidden();
  round.onHidden();
  round.frame(LONG_GAP, []);
  round.onVisible();
  const held = reasons(round);
  round.frame(DT, [RESUME]);
  // Assert
  assert.deepEqual(held, ['background']);
  assert.deepEqual(round.tokens(), []);
  assert.equal(round.overlay(), null);
});

test('after 接着讲 the clock moves again; the first frame back is capped at MAX_STEP_MS', () => {
  // Arrange
  const { round } = playRound();
  round.onHidden();
  round.frame(DT, [RESUME]);
  const before = round.gameTime();
  // Act
  round.frame(BG_GAP_MS, []);
  // Assert
  assert.equal(round.gameTime() - before, MAX_STEP_MS);
});

test('AC3: in open, hidden then visible (and a long gap) acquires nothing and shows no 接着讲 card', () => {
  // Arrange
  const fakes = fakeSystems();
  const round = createRound({
    chapter: TEST_CHAPTER, seed: TEST_SEED, constants: TEST_CONSTANTS, progress: fakes.progress, systems: fakes.systems,
  });
  // Act
  round.onHidden();
  round.frame(LONG_GAP, []);
  round.onVisible();
  // Assert
  assert.deepEqual(round.tokens(), []);
  assert.equal(round.state(), 'open');
  assert.equal(round.overlay(), 'open');
});

test('in end and settle, hidden acquires nothing and the state and card stay', () => {
  // Arrange
  const { round } = playRound({ pressure: { outcome: () => ({ result: 'win', reason: null }) } });
  round.frame(DT, []);
  // Act
  round.onHidden();
  const inEnd = [round.state(), round.overlay(), round.tokens().length];
  round.endingDone();
  round.onHidden();
  round.frame(LONG_GAP, []);
  // Assert
  assert.deepEqual(inEnd, ['end', 'win', 0]);
  assert.deepEqual([round.state(), round.overlay(), round.tokens().length], ['settle', 'win', 0]);
});

test('AC4: pause card open, background and back: the pause card stays with both buttons; 接着讲 returns both', () => {
  // Arrange
  const { round } = playRound();
  round.frame(DT, [PAUSE_STAMP]);
  // Act
  round.onHidden();
  round.frame(LONG_GAP, []);
  round.onVisible();
  const card = [round.overlay(), round.buttons(), reasons(round)];
  round.frame(DT, [buttonIntent('pause', 'resume')]);
  // Assert
  assert.deepEqual(card, ['pause', ['resume', 'catalog'], ['pause', 'background']]);
  assert.deepEqual(round.tokens(), []);
});

test('a button the current card does not show is ignored (回书目 on the 接着讲 card, 接着讲 with no card)', () => {
  // Arrange
  const { round } = playRound();
  round.frame(DT, [RESUME]);
  round.onHidden();
  // Act
  round.frame(DT, [buttonIntent('resume', 'catalog')]);
  // Assert
  assert.deepEqual(reasons(round), ['background']);
  assert.equal(round.drainEvents().some((e) => e.type === 'exit'), false);
});
