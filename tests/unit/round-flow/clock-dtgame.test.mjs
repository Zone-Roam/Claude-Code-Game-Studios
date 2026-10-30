// Story round-flow/001: the game clock dt_game and the round skeleton.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { MAX_STEP_MS } from '../../../src/core/constants.mjs';
import {
  playRound, feed, fakeSystems, TEST_CHAPTER, TEST_SEED, TEST_CONSTANTS,
} from '../../helpers/round-fakes.mjs';

test('play with no tokens: 60 frames of 16.7 ms advance gameTime by 1002 +/- 1', () => {
  // Arrange
  const { round } = playRound();
  // Act
  feed(round, 60, 16.7);
  // Assert
  assert.ok(Math.abs(round.gameTime() - 1002) <= 1, `gameTime ${round.gameTime()}`);
});

test('play: a frame with dtReal = -5 leaves gameTime unchanged', () => {
  // Arrange
  const { round } = playRound();
  feed(round, 3, 16.7);
  const before = round.gameTime();
  // Act
  round.frame(-5, []);
  // Assert
  assert.equal(round.gameTime(), before);
});

test('play: a frame with dtReal = 600 advances gameTime by MAX_STEP_MS (250)', () => {
  // Arrange
  const { round } = playRound();
  // Act
  round.frame(600, []);
  // Assert
  assert.equal(MAX_STEP_MS, 250);
  assert.equal(round.gameTime(), 250);
});

test('open state: frames do not advance gameTime', () => {
  // Arrange
  const fakes = fakeSystems();
  const round = createRound({ chapter: TEST_CHAPTER, seed: TEST_SEED, constants: TEST_CONSTANTS, systems: fakes.systems });
  // Act
  feed(round, 10, 16.7);
  // Assert
  assert.equal(round.state(), 'open');
  assert.equal(round.gameTime(), 0);
});

test('assembly: board, then pressure, then effects and skills; ctx.gameTime is a live function', () => {
  // Arrange / Act
  const { round, log, ctxs } = playRound();
  feed(round, 2, 10);
  // Assert
  assert.deepEqual(log.slice(0, 4).map((entry) => entry[0]),
    ['createBoard', 'createPressure', 'createEffects', 'createSkills']);
  assert.deepEqual(log[0][1], TEST_CHAPTER);
  assert.equal(log[0][2].seed, TEST_SEED);
  assert.equal(typeof ctxs.pressure.gameTime, 'function');
  assert.equal(ctxs.pressure.gameTime(), 20);
  assert.equal(ctxs.pressure.pressure, undefined);
  assert.ok(ctxs.effects.pressure && ctxs.skills.pressure);
  assert.deepEqual(Object.keys(round.systems()).sort(), ['board', 'effects', 'pressure', 'skills']);
});

test('createRound without systems throws (no default systems in Core)', () => {
  // Arrange / Act / Assert
  assert.throws(() => createRound({ chapter: TEST_CHAPTER, seed: TEST_SEED, constants: TEST_CONSTANTS }), TypeError);
});

test('createRound rejects BG_GAP_MS not greater than MAX_STEP_MS', () => {
  // Arrange
  const fakes = fakeSystems();
  // Act / Assert
  assert.throws(() => createRound({
    chapter: TEST_CHAPTER, seed: TEST_SEED, systems: fakes.systems, constants: { MAX_STEP_MS: 250, BG_GAP_MS: 250 },
  }), RangeError);
});
