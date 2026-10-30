// Story round-flow/002: the token set and its foreground clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_HIGHLIGHT_MS, TOKEN_MAX_MS } from '../../../src/core/constants.mjs';
import { playRound, feed } from '../../helpers/round-fakes.mjs';

test('effect token 380 ms over 30 frames (500 ms): ends on frame 23; gameTime frozen 1-22, moves from 23', () => {
  // Arrange
  const { round } = playRound();
  const ends = [];
  let frame = 0;
  round.acquire('effect', EFFECT_HIGHLIGHT_MS, (token) => {
    ends.push(frame);
    round.release(token);
  });
  const timeAfter = [];
  // Act
  for (frame = 1; frame <= 30; frame++) {
    round.frame(500 / 30, []);
    timeAfter.push(round.gameTime());
  }
  // Assert
  assert.deepEqual(ends, [23]);
  assert.ok(timeAfter.slice(0, 22).every((t) => t === 0));
  assert.ok(timeAfter[22] > 0);
  assert.ok(timeAfter[29] > timeAfter[22]);
});

test('two tokens of different reasons: releasing one keeps the clock stopped and the board locked', () => {
  // Arrange
  const { round } = playRound();
  const effect = round.acquire('effect');
  round.acquire('tutorial');
  // Act
  round.release(effect);
  feed(round, 10, 16.7);
  // Assert
  assert.equal(round.gameTime(), 0);
  assert.equal(round.boardLocked(), true);
  assert.deepEqual(round.tokens(), [{ reason: 'tutorial', remainingMs: null }]);
});

test('an effect token never released is force-released at TOKEN_MAX_MS with one end notice and one warning', () => {
  // Arrange
  const warnings = [];
  const { round } = playRound(null, { warn: (msg, info) => warnings.push(info) });
  let notices = 0;
  round.acquire('effect', EFFECT_HIGHLIGHT_MS, () => { notices++; });
  const frames = Math.ceil(TOKEN_MAX_MS / 16.7);
  // Act
  feed(round, frames - 1, 16.7);
  const heldBefore = round.tokens().length;
  round.frame(16.7, []);
  // Assert
  assert.equal(heldBefore, 1);
  assert.deepEqual(round.tokens(), []);
  assert.equal(notices, 1);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].reason, 'effect');
});

test('a pause token held for 20 s of frames is never force-released', () => {
  // Arrange
  const { round } = playRound();
  round.acquire('pause');
  // Act
  feed(round, 80, 250);
  // Assert
  assert.deepEqual(round.tokens(), [{ reason: 'pause', remainingMs: null }]);
});

test('frame 0 match acquires the effect token: frame 0 does not count, it ends on frame 23', () => {
  // Arrange
  const ends = [];
  let frame = 0;
  const { round } = playRound({
    board: { tap: () => ({ type: 'match', kind: 'huo' }) },
    effects: {
      onMatch: (ev, ctx) => ctx.acquire('effect', EFFECT_HIGHLIGHT_MS, (token) => {
        ends.push(frame);
        ctx.release(token);
      }),
    },
  });
  // Act
  round.frame(16.7, [{ type: 'cell', row: 5, col: 2 }]);
  const remainingAfterFrame0 = round.tokens()[0].remainingMs;
  for (frame = 1; frame <= 30; frame++) round.frame(16.7, []);
  // Assert
  assert.equal(remainingAfterFrame0, EFFECT_HIGHLIGHT_MS);
  assert.deepEqual(ends, [23]);
});

test('release twice has no side effects; tokenStart/tokenEnd carry reason, durationMs, detail', () => {
  // Arrange
  const { round } = playRound();
  const token = round.acquire('skill', undefined, null, { general: 'zhang_fei' });
  // Act
  round.release(token);
  round.release(token);
  const events = round.drainEvents();
  // Assert
  assert.deepEqual(events, [
    { type: 'tokenStart', reason: 'skill', durationMs: 950, detail: { general: 'zhang_fei' } },
    { type: 'tokenEnd', reason: 'skill', durationMs: 950, detail: { general: 'zhang_fei' } },
  ]);
  assert.throws(() => round.acquire('nap'), RangeError);
});
