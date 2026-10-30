// Story round-flow/009: entering end, the RoundResult and progress.settle
// (design/gdd/round-flow.md rule 8; ADR-0002 section 3; TR-round-flow-006, -013, -014, -015).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playRound, feed, fakePressure } from '../../helpers/round-fakes.mjs';

const BOSS = Object.freeze({ id: 'ch09', mode: 'boss' });
const FOOD = Object.freeze({ id: 'ch05', mode: 'food' });
const PRESS = Object.freeze({ id: 'ch01', mode: 'press' });
const KEYS = ['attempt', 'bossPhase', 'chapterId', 'gameTimeMs', 'loadout', 'maxCombo', 'metrics', 'mode',
  'reason', 'skillsUsed', 'win'];

test('boss lost in phase 2: bossPhase is 2', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 0, hp: 3, phase: 2 });
  const { round } = playRound({ pressure: p.impl }, { chapter: BOSS });
  // Act
  round.frame(16.7, []);
  // Assert
  assert.equal(round.result().win, false);
  assert.equal(round.result().bossPhase, 2);
});

test('food round ends: bossPhase is null and hud() is not read', () => {
  // Arrange
  const p = fakePressure({ mode: 'food', food: 0 });
  const { round, calls } = playRound({ pressure: p.impl }, { chapter: FOOD });
  // Act
  round.frame(16.7, []);
  // Assert
  assert.equal(round.result().bossPhase, null);
  assert.equal(calls('pressure.hud').length, 0);
});

test('win: settle gets a full RoundResult in the end frame, reason null, typed fields from the injected systems', () => {
  // Arrange
  const outcome = { stars: 3 };
  const { round, calls } = playRound({
    pressure: { outcome: () => ({ result: 'win', reason: null }), metrics: () => ({ dangerMs: 1200 }) },
    effects: { maxCombo: () => 4 },
    skills: { skillsUsed: () => ({ zhang_fei: 2, guan_yu: 9 }) },
    progress: { settle: () => outcome },
  }, { chapter: PRESS, attempt: 3, loadout: ['zhang_fei', 'zhao_yun'] });
  // Act
  round.frame(16.7, []);
  round.frame(16.7, []);
  // Assert
  const settles = calls('progress.settle');
  assert.equal(settles.length, 1);
  const result = settles[0][1];
  assert.deepEqual(Object.keys(result).sort(), KEYS);
  assert.deepEqual(result, {
    chapterId: 'ch01', mode: 'press', win: true, reason: null, gameTimeMs: 16, maxCombo: 4, attempt: 3,
    loadout: ['zhang_fei', 'zhao_yun'], skillsUsed: { zhang_fei: 2, zhao_yun: 0 }, bossPhase: null,
    metrics: { dangerMs: 1200 },
  });
  assert.equal(round.result(), result);
  assert.equal(round.settleOutcome(), outcome);
});

test('metrics shape follows the mode: food {foodLeft, misses}, boss {heartsLost}', () => {
  // Arrange
  const food = playRound({ pressure: fakePressure({ mode: 'food', food: 0 }).impl }, { chapter: FOOD });
  const boss = playRound({ pressure: fakePressure({ mode: 'boss', hearts: 0 }).impl }, { chapter: BOSS });
  // Act
  food.round.frame(16.7, []);
  boss.round.frame(16.7, []);
  // Assert
  assert.deepEqual(Object.keys(food.round.result().metrics).sort(), ['foodLeft', 'misses']);
  assert.deepEqual(Object.keys(boss.round.result().metrics), ['heartsLost']);
  assert.equal(food.round.result().reason, '粮草断绝');
  assert.equal(typeof food.round.result().gameTimeMs, 'number');
});

test('after end: more frames and endingDone never call settle again; state is end in the settle frame', () => {
  // Arrange
  const { round, calls } = playRound({ pressure: { outcome: () => ({ result: 'lose', reason: '破城' }) } });
  let stateAtSettle = null;
  // Act
  round.frame(16.7, []);
  stateAtSettle = round.state();
  feed(round, 5, 16.7);
  round.endingDone();
  feed(round, 5, 16.7);
  // Assert
  assert.equal(stateAtSettle, 'end');
  assert.equal(calls('progress.settle').length, 1);
  assert.equal(round.result().reason, '破城');
  assert.equal(round.result().attempt, 1);
});
