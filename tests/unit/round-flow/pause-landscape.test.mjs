// Story round-flow/011: the pause stamp, landscape and the back key (rule 11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_HIGHLIGHT_MS } from '../../../src/core/constants.mjs';
import { createRound } from '../../../src/rules/round-flow.mjs';
import {
  playRound, fakeSystems, feed, buttonIntent, PAUSE_STAMP, TEST_CHAPTER, TEST_SEED, TEST_CONSTANTS,
} from '../../helpers/round-fakes.mjs';

const DT = 20;
const BEFORE_PAUSE_MS = 200;
const PAUSED_MS = 5000;
const RESUME = buttonIntent('pause', 'resume');
const reasons = (round) => round.tokens().map((t) => t.reason);

test('AC1: effect 200 ms in, 5 s on the pause card: no end, no settle point; ends after the remaining foreground time', () => {
  // Arrange
  const { round, calls } = playRound();
  const ends = [];
  round.acquire('effect', EFFECT_HIGHLIGHT_MS, (token) => {
    ends.push(round.gameTime());
    round.release(token);
  });
  feed(round, BEFORE_PAUSE_MS / DT, DT);
  // Act
  round.frame(DT, [PAUSE_STAMP]);
  feed(round, PAUSED_MS / DT, DT);
  const duringPause = { ends: ends.length, outcome: calls('pressure.outcome').length, ensure: calls('board.ensurePlayable').length };
  round.frame(DT, [RESUME]);
  const remaining = EFFECT_HIGHLIGHT_MS - BEFORE_PAUSE_MS;
  feed(round, remaining / DT - 1, DT);
  const justBefore = ends.length;
  round.frame(DT, []);
  // Assert
  assert.deepEqual(duringPause, { ends: 0, outcome: 0, ensure: 0 });
  assert.equal(justBefore, 0);
  assert.equal(ends.length, 1);
});

test('AC2: board locked by an effect token, the pause stamp still acquires pause and shows the pause card', () => {
  // Arrange
  const { round } = playRound();
  round.acquire('effect');
  // Act
  round.frame(DT, [PAUSE_STAMP]);
  // Assert
  assert.deepEqual(reasons(round), ['effect', 'pause']);
  assert.equal(round.overlay(), 'pause');
  assert.deepEqual(round.buttons(), ['resume', 'catalog']);
});

test('AC3: turned sideways in play holds pause with the landscape card (no buttons); upright shows the pause card', () => {
  // Arrange
  const { round } = playRound();
  // Act
  round.setLandscape(true);
  const sideways = [reasons(round), round.overlay(), round.buttons()];
  round.frame(DT, [RESUME]);
  const afterTap = reasons(round);
  round.setLandscape(false);
  // Assert
  assert.deepEqual(sideways, [['pause'], 'landscape', []]);
  assert.deepEqual(afterTap, ['pause']);
  assert.equal(round.overlay(), 'pause');
});

test('landscape and background together: back in front the landscape card shows, then the pause card upright', () => {
  // Arrange
  const { round } = playRound();
  // Act
  round.onHidden();
  round.setLandscape(true);
  round.onVisible();
  const first = round.overlay();
  round.setLandscape(false);
  // Assert
  assert.equal(first, 'landscape');
  assert.equal(round.overlay(), 'pause');
});

test('AC4: a skill acquired in the same frame does not stop the pause stamp', () => {
  // Arrange
  const { round } = playRound({ skills: { tapCard: (general, ctx) => ctx.acquire('skill') } });
  // Act
  round.frame(DT, [{ type: 'card', general: 'zhangfei' }, PAUSE_STAMP]);
  // Assert
  assert.deepEqual(reasons(round), ['skill', 'pause']);
});

test('pause stamp right after the round starts works; stamping twice or the back key holds one pause token', () => {
  // Arrange
  const { round } = playRound();
  // Act
  round.frame(DT, [PAUSE_STAMP, PAUSE_STAMP]);
  round.onBack();
  // Assert
  assert.deepEqual(reasons(round), ['pause']);
});

test('outside play the pause stamp, landscape and back key acquire nothing', () => {
  // Arrange
  const fakes = fakeSystems();
  const round = createRound({
    chapter: TEST_CHAPTER, seed: TEST_SEED, constants: TEST_CONSTANTS, progress: fakes.progress, systems: fakes.systems,
  });
  // Act
  round.frame(DT, [PAUSE_STAMP]);
  round.setLandscape(true);
  round.onBack();
  // Assert
  assert.deepEqual(round.tokens(), []);
  assert.equal(round.overlay(), 'open');
});
