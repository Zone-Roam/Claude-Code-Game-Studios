// Story round-flow/014: Huang Zhong's column select and its exclusion with Guan Yu
// (design/gdd/round-flow.md rule 5a; ADR-0003 intents; TR-round-flow-012).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_SHOW_MS } from '../../../src/core/constants.mjs';
import { playRound, fakeSelectSkills, cardIntent } from '../../helpers/round-fakes.mjs';

const DT = 20;
const FILLED_COL = 2;
const COL_2 = Object.freeze({ type: 'cell', row: 5, col: FILLED_COL });
const COL_4 = Object.freeze({ type: 'cell', row: 5, col: 4 });

function selectRound() {
  const sk = fakeSelectSkills({ ready: ['guan_yu', 'huang_zhong'], rows: [4], cols: [FILLED_COL] });
  return Object.assign({ sk }, playRound({ skills: sk.impl }, { loadout: ['guan_yu', 'huang_zhong'] }));
}

test('AC1: in row select, tapping Huang Zhong cancels; no column select, his charge kept, no skill', () => {
  // Arrange
  const { round, sk, calls } = selectRound();
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  round.frame(DT, [cardIntent('huang_zhong')]);
  // Assert
  assert.equal(round.selecting(), null);
  assert.deepEqual(sk.s.charge, { guan_yu: 1, huang_zhong: 1 });
  assert.deepEqual(calls('skills.tapCard').map((c) => c[1]), ['guan_yu']);
  assert.deepEqual(round.tokens(), []);
});

test('AC2: in column select, tapping a column with blocks fires Huang Zhong: charge 0, skill 950 ms, select ends, board.tap not called', () => {
  // Arrange
  const { round, sk, calls } = selectRound();
  round.frame(DT, [cardIntent('huang_zhong')]);
  const entered = [round.selecting(), round.tokens().length, calls('board.clearSelection').length];
  // Act
  round.frame(DT, [COL_2]);
  // Assert
  assert.deepEqual(entered, ['col', 0, 1]);
  assert.equal(sk.s.charge.huang_zhong, 0);
  assert.deepEqual(round.tokens(), [{ reason: 'skill', remainingMs: SKILL_SHOW_MS }]);
  assert.equal(round.selecting(), null);
  assert.deepEqual(calls('skills.cutCol').map((c) => c[1]), [FILLED_COL]);
  assert.equal(calls('board.tap').length, 0);
});

test('column select: an empty column does nothing; tapping Guan Yu cancels without entering row select', () => {
  // Arrange
  const { round, sk, calls } = selectRound();
  round.frame(DT, [cardIntent('huang_zhong')]);
  // Act
  round.frame(DT, [COL_4]);
  const afterEmpty = round.selecting();
  round.frame(DT, [cardIntent('guan_yu')]);
  // Assert
  assert.equal(afterEmpty, 'col');
  assert.equal(round.selecting(), null);
  assert.deepEqual(sk.s.charge, { guan_yu: 1, huang_zhong: 1 });
  assert.equal(calls('skills.cutCol').length + calls('board.tap').length, 0);
});
