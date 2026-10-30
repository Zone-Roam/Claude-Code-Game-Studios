// Story round-flow/008: the settle point — win before lose, reshuffle, dead board at hp 0
// (design/gdd/round-flow.md rules 6.5, 6.6, 7; ADR-0002 section 3 step 5; TR-round-flow-006, -016).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESHUFFLE_SHOW_MS, HOST_ATTACK_MS } from '../../../src/core/constants.mjs';
import { playRound, feed, sequence, fakePressure, CELL } from '../../helpers/round-fakes.mjs';

const DT = 20;
const MATCH_DAO = Object.freeze({ type: 'match', kind: 'dao' });
const RESHUFFLE = Object.freeze({ type: 'reshuffle', fallback: false });
const BOSS = Object.freeze({ id: 'ch09', mode: 'boss' });

test('dead board after a match: outcome first, then reshuffle holds 400 ms, taps dropped, then another settle point', () => {
  // Arrange
  const { round, log, calls } = playRound({ board: { tap: () => MATCH_DAO, ensurePlayable: sequence([RESHUFFLE, null]) } });
  // Act
  round.frame(DT, [CELL]);
  const names = log.map((entry) => entry[0]);
  const tokensAfterTap = round.tokens();
  feed(round, RESHUFFLE_SHOW_MS / DT - 1, DT, () => round.frame(0, [CELL]));
  const outcomesBefore = calls('pressure.outcome').length;
  round.frame(DT, []);
  // Assert
  assert.ok(names.indexOf('pressure.outcome') < names.indexOf('board.ensurePlayable'));
  assert.deepEqual(tokensAfterTap, [{ reason: 'reshuffle', remainingMs: RESHUFFLE_SHOW_MS }]);
  assert.equal(calls('board.tap').length, 1);
  assert.equal(calls('pressure.tick').length, 1);
  assert.equal(calls('pressure.outcome').length, outcomesBefore + 1);
  assert.deepEqual(round.tokens(), []);
});

test('boss hp at 0 and a dead board: the settle point wins at once and never reshuffles', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 1, steps: 0, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl, board: { tap: () => MATCH_DAO, ensurePlayable: () => RESHUFFLE } },
    { chapter: BOSS });
  // Act
  round.frame(DT, [CELL]);
  // Assert
  assert.equal(round.state(), 'end');
  assert.equal(round.result().win, true);
  assert.equal(calls('board.ensurePlayable').length, 0);
});

test('win and lose both met (board empty, hearts 0): the round takes the one outcome() answer, a win', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 0, hp: 5, steps: 0, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl, board: { isEmpty: () => true } }, { chapter: BOSS });
  // Act
  round.frame(DT, []);
  // Assert
  assert.equal(calls('pressure.outcome').length, 1);
  assert.equal(round.result().win, true);
  assert.equal(round.result().reason, null);
});

test('boss hearts 1, attack: state stays play for the 600 ms show, the settle point after it ends the round 城破', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 1, hp: 5, steps: 8, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl }, { chapter: BOSS });
  round.frame(DT, []);
  const outcomes = calls('pressure.outcome').length;
  const states = [];
  // Act
  feed(round, HOST_ATTACK_MS / DT - 1, DT, () => states.push(round.state()));
  const outcomesDuringShow = calls('pressure.outcome').length - outcomes;
  round.frame(DT, []);
  // Assert
  assert.equal(p.s.hearts, 0);
  assert.ok(states.every((s) => s === 'play'));
  assert.equal(outcomesDuringShow, 0);
  assert.equal(round.state(), 'end');
  assert.equal(round.result().reason, '城破');
});
