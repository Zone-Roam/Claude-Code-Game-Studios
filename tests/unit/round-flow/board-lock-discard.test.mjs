// Story round-flow/004: the board lock and the "at frame start or now" discard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_HIGHLIGHT_MS } from '../../../src/core/constants.mjs';
import { playRound, feed } from '../../helpers/round-fakes.mjs';

const CELL = { type: 'cell', row: 5, col: 1 };

test('holding an effect token: a board tap is dropped and never replayed after release', () => {
  // Arrange
  const { round, calls } = playRound();
  const token = round.acquire('effect');
  // Act
  round.frame(16.7, [CELL]);
  round.release(token);
  feed(round, 5, 16.7);
  // Assert
  assert.equal(calls('board.tap').length, 0);
  assert.equal(round.boardLocked(), false);
});

test('effect token with 10 ms left: a tap in its last frame is dropped; the token ends that frame', () => {
  // Arrange
  const { round, calls } = playRound();
  let ended = 0;
  round.acquire('effect', EFFECT_HIGHLIGHT_MS, (token) => { ended++; round.release(token); });
  round.frame(EFFECT_HIGHLIGHT_MS - 10, []);
  // Act
  round.frame(16.7, [CELL]);
  feed(round, 5, 16.7);
  // Assert
  assert.equal(ended, 1);
  assert.deepEqual(round.tokens(), []);
  assert.equal(calls('board.tap').length, 0);
});

test('Zhang Fei and Zhao Yun ready, no tokens: two card taps in one frame release only Zhang Fei', () => {
  // Arrange
  const { round, calls } = playRound({
    skills: { tapCard: (general, ctx) => ctx.acquire('skill') },
  });
  // Act
  round.frame(16.7, [{ type: 'card', general: 'zhang_fei' }, { type: 'card', general: 'zhao_yun' }]);
  // Assert
  assert.deepEqual(calls('skills.tapCard'), [['skills.tapCard', 'zhang_fei']]);
  assert.deepEqual(round.tokens().map((t) => t.reason), ['skill']);
});

test('boardLocked: false in play with no tokens; true outside play', () => {
  // Arrange
  const { round, calls } = playRound({ pressure: { outcome: () => ({ result: 'lose', reason: '破城' }) } });
  const lockedInPlay = round.boardLocked();
  // Act
  round.frame(16.7, []);
  round.frame(16.7, [CELL]);
  // Assert
  assert.equal(lockedInPlay, false);
  assert.equal(round.state(), 'end');
  assert.equal(round.boardLocked(), true);
  assert.equal(calls('board.tap').length, 0);
});

test('unlocked board: a cell tap reaches board.tap and a match goes effects -> skills -> pressure -> view', () => {
  // Arrange
  const match = { type: 'match', kind: 'dao' };
  const { round, log } = playRound({ board: { tap: () => match } });
  // Act
  round.frame(16.7, [CELL]);
  // Assert
  const names = log.map((entry) => entry[0]).filter((n) => n.indexOf('.') !== -1 && n !== 'pressure.tick' && n !== 'pressure.outcome' && n !== 'board.ensurePlayable');
  assert.deepEqual(names, ['board.tap', 'effects.onMatch', 'skills.onMatch', 'pressure.onMatch']);
  assert.deepEqual(round.drainEvents(), [match]);
});
