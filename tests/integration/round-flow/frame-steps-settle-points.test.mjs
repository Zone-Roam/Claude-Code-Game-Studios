// Story round-flow/005: frame steps 2 -> 3 -> 3b -> 4 -> 5 and the settle points
// (design/gdd/round-flow.md rules 6.5-6.7; ADR-0002 section 3; TR-round-flow-004, -016).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_HIGHLIGHT_MS, HOST_ATTACK_MS, RESHUFFLE_SHOW_MS } from '../../../src/core/constants.mjs';
import { playRound, feed, sequence, fakePressure, fakeEffects, CELL } from '../../helpers/round-fakes.mjs';

const DT = 20;
const MATCH_DAO = Object.freeze({ type: 'match', kind: 'dao' });
const MATCH_HUO = Object.freeze({ type: 'match', kind: 'huo' });
const MISS = Object.freeze({ type: 'miss', kind: 'dao' });
const BOSS = Object.freeze({ id: 'ch09', mode: 'boss' });
const FOOD = Object.freeze({ id: 'ch05', mode: 'food' });

test('boss, last heart taken: a tap in the hostAttack last frame is dropped; that frame ends the round 城破', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 1, hp: 5, steps: 8, stepsMax: 8 });
  const { round, calls } = playRound({ pressure: p.impl, board: { tap: () => MATCH_DAO } }, { chapter: BOSS });
  round.frame(DT, []); // tick: attack, hearts 1 -> 0, hostAttack held
  feed(round, HOST_ATTACK_MS / DT - 1, DT);
  assert.equal(round.state(), 'play');
  // Act
  round.frame(DT, [CELL]);
  // Assert
  assert.equal(calls('board.tap').length, 0);
  assert.equal(calls('pressure.onMatch').length, 0);
  assert.equal(round.state(), 'end');
  assert.equal(round.result().reason, '城破');
  assert.deepEqual(round.result().metrics, { heartsLost: 1 });
});

test('boss steps full, effect clears the last units: step 3b decides win, no tick, no attack, no reinforcements', () => {
  // Arrange
  let empty = false;
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 5, steps: 8, stepsMax: 8 });
  const { round, calls } = playRound({
    pressure: p.impl,
    effects: fakeEffects({ huo: 'ying' }),
    board: { tap: () => MATCH_HUO, clearKind: () => { empty = true; }, isEmpty: () => empty },
  }, { chapter: BOSS });
  // Act
  round.frame(DT, [CELL]);
  feed(round, EFFECT_HIGHLIGHT_MS / DT, DT);
  // Assert
  assert.equal(round.state(), 'end');
  assert.equal(round.result().win, true);
  assert.equal(calls('pressure.tick').length, 0);
  assert.equal(calls('board.addPairs').length, 0);
  assert.equal(p.s.hearts, 3);
});

test('holding any token: frames pass without a tick', () => {
  // Arrange
  const { round, calls } = playRound();
  const skill = round.acquire('skill');
  // Act
  feed(round, 10, DT);
  round.release(skill);
  round.acquire('pause');
  feed(round, 10, DT);
  // Assert
  assert.equal(calls('pressure.tick').length, 0);
  assert.equal(round.gameTime(), 0);
});

test('food 1, stalled frame with a miss then a board-clearing match: the miss ends the round, the match is dropped', () => {
  // Arrange
  const p = fakePressure({ mode: 'food', food: 1 });
  const { round, calls } = playRound({ pressure: p.impl, board: { tap: sequence([MISS, MATCH_DAO]) } }, { chapter: FOOD });
  // Act
  round.frame(600, [CELL, CELL]);
  // Assert
  assert.equal(calls('board.tap').length, 1);
  assert.equal(round.state(), 'end');
  assert.equal(round.result().reason, '粮草断绝');
  assert.equal(calls('pressure.tick').length, 0);
});

test('step order: tap settle point, token clock, 3b reshuffle skips the tick of that frame', () => {
  // Arrange
  const { round, log, calls } = playRound({
    effects: fakeEffects({ huo: 'ying' }),
    board: { tap: () => MATCH_HUO, ensurePlayable: sequence([{ type: 'reshuffle', fallback: false }, null]) },
  });
  round.frame(DT, [CELL]);
  feed(round, EFFECT_HIGHLIGHT_MS / DT - 1, DT);
  const before = log.length;
  // Act
  round.frame(DT, []);
  // Assert
  const names = log.slice(before).map((entry) => entry[0]);
  assert.deepEqual(names, ['board.clearKind', 'pressure.onClear', 'pressure.outcome', 'board.ensurePlayable']);
  assert.deepEqual(round.tokens(), [{ reason: 'reshuffle', remainingMs: RESHUFFLE_SHOW_MS }]);
  assert.equal(calls('pressure.tick').length, 0);
});

test('3b undecided and no reshuffle: the same frame goes on to tick and the step-5 settle point', () => {
  // Arrange
  const { round, log } = playRound({ effects: fakeEffects({ huo: 'ying' }), board: { tap: () => MATCH_HUO } });
  round.frame(DT, [CELL]);
  feed(round, EFFECT_HIGHLIGHT_MS / DT - 1, DT);
  const before = log.length;
  // Act
  round.frame(DT, []);
  // Assert
  const names = log.slice(before).map((entry) => entry[0]);
  assert.deepEqual(names, ['board.clearKind', 'pressure.onClear', 'pressure.outcome', 'board.ensurePlayable',
    'pressure.tick', 'pressure.outcome']);
});
