// Story round-flow/007: tick driving, push and the boss phase change
// (design/gdd/round-flow.md rules 6.4, 6.6; ADR-0002 section 3 step 4; TR-round-flow-011).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_SHOW_MS, HOST_ATTACK_MS } from '../../../src/core/constants.mjs';
import { playRound, feed, fakePressure, CELL } from '../../helpers/round-fakes.mjs';

const DT = 20;
const MATCH_DAO = Object.freeze({ type: 'match', kind: 'dao' });
const BOSS = Object.freeze({ id: 'ch09', mode: 'boss' });

test('boss, 600 idle frames: tick is called 600 times and the boss never attacks', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 5, steps: 0, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl }, { chapter: BOSS });
  // Act
  feed(round, 600, 16.7);
  // Assert
  assert.equal(calls('pressure.tick').length, 600);
  assert.equal(p.s.heartsLost, 0);
  assert.ok(!round.drainEvents().some((ev) => ev.type === 'hostAttack'));
});

test('boss phase-1 hp 1 with a phase 2: the killing match does not end the round; phase holds 1400 ms then the clock resumes', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 1, hp2: 4, steps: 0, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl, board: { tap: () => MATCH_DAO } }, { chapter: BOSS });
  // Act
  round.frame(DT, [CELL]);
  const stateAfterTap = round.state();
  const tokensAfterTap = round.tokens();
  const frozenAt = round.gameTime();
  const times = [];
  feed(round, PHASE_SHOW_MS / DT - 1, DT, () => {
    times.push(round.gameTime());
    round.frame(0, [CELL]);
  });
  round.frame(DT, []);
  // Assert
  assert.equal(stateAfterTap, 'play');
  assert.deepEqual(tokensAfterTap, [{ reason: 'phase', remainingMs: PHASE_SHOW_MS }]);
  assert.ok(times.every((t) => t === frozenAt));
  assert.equal(calls('board.tap').length, 1);
  assert.equal(p.s.phase, 2);
  assert.equal(round.gameTime(), frozenAt + DT);
  assert.deepEqual(round.tokens(), []);
});

test('press push: board moves at once, no token, board unlocked, skills.onPush right after the push', () => {
  // Arrange
  const p = fakePressure({ mode: 'press', pushEveryMs: 100 });
  const { round, log } = playRound({ pressure: p.impl });
  // Act
  feed(round, 100 / DT, DT);
  // Assert
  const names = log.map((entry) => entry[0]);
  const push = names.indexOf('board.pushRowFromTop');
  assert.equal(p.s.pushes, 1);
  assert.equal(names[push + 1], 'skills.onPush');
  assert.deepEqual(round.tokens(), []);
  assert.equal(round.boardLocked(), false);
});

test('boss attack: heart and reinforcements land inside tick, then hostAttack is held 600 ms', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 5, steps: 8, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl }, { chapter: BOSS });
  // Act
  round.frame(DT, []);
  // Assert
  const events = round.drainEvents().map((ev) => ev.type);
  assert.equal(p.s.hearts, 2);
  assert.equal(calls('board.addPairs').length, 1);
  assert.ok(events.indexOf('hostAttack') < events.indexOf('tokenStart'));
  assert.deepEqual(round.tokens(), [{ reason: 'hostAttack', remainingMs: HOST_ATTACK_MS }]);
});
