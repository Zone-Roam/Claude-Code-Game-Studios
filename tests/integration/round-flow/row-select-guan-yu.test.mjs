// Story round-flow/013: Guan Yu's row select input routing
// (design/gdd/round-flow.md rule 5a; ADR-0003 intents cell / card / offBoard; TR-round-flow-012).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_SHOW_MS } from '../../../src/core/constants.mjs';
import { playRound, fakePressure, fakeSelectSkills, cardIntent, OFF_BOARD } from '../../helpers/round-fakes.mjs';

const DT = 20;
const BOSS = Object.freeze({ id: 'ch09', mode: 'boss' });
const SELECTABLE_ROW = 4;
const ROW_4 = Object.freeze({ type: 'cell', row: SELECTABLE_ROW, col: 0 });
const ROW_2 = Object.freeze({ type: 'cell', row: 2, col: 3 });

function selectRound() {
  const sk = fakeSelectSkills({ ready: ['guan_yu', 'zhao_yun'], rows: [SELECTABLE_ROW] });
  const p = fakePressure({ mode: 'boss', hp: 5, steps: 0, stepsMax: 8 });
  const r = playRound({ skills: sk.impl, pressure: p.impl }, { chapter: BOSS, loadout: ['guan_yu', 'zhao_yun'] });
  return Object.assign({ sk, p }, r);
}

test('AC1: tapping a ready Guan Yu enters row select: no token, charge kept, clock runs, no step, selection cleared', () => {
  // Arrange
  const { round, sk, p, calls } = selectRound();
  // Act
  round.frame(DT, [cardIntent('guan_yu')]);
  // Assert
  assert.equal(round.selecting(), 'row');
  assert.deepEqual(round.tokens(), []);
  assert.equal(sk.s.charge.guan_yu, 1);
  assert.equal(round.gameTime(), DT);
  assert.equal(p.s.steps, 0);
  assert.equal(calls('board.clearSelection').length, 1);
  assert.equal(round.boardLocked(), false);
});

test('AC2: tapping any cell of a selectable row fires Guan Yu: charge 0, skill token 950 ms, select ends, board.tap not called', () => {
  // Arrange
  const { round, sk, calls } = selectRound();
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  round.frame(DT, [ROW_4]);
  // Assert
  assert.equal(sk.s.charge.guan_yu, 0);
  assert.deepEqual(round.tokens(), [{ reason: 'skill', remainingMs: SKILL_SHOW_MS }]);
  assert.equal(round.selecting(), null);
  assert.deepEqual(calls('skills.cutRow').map((c) => c[1]), [SELECTABLE_ROW]);
  assert.equal(calls('board.tap').length, 0);
});

test('AC3: tapping a row that is not selectable does nothing and stays in row select', () => {
  // Arrange
  const { round, sk, calls } = selectRound();
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  round.frame(DT, [ROW_2]);
  // Assert
  assert.equal(round.selecting(), 'row');
  assert.equal(sk.s.charge.guan_yu, 1);
  assert.equal(calls('skills.cutRow').length, 0);
  assert.equal(calls('board.tap').length, 0);
  assert.deepEqual(round.tokens(), []);
});

const CANCELS = [['Guan Yu again', cardIntent('guan_yu')], ['ready Zhao Yun', cardIntent('zhao_yun')], ['off the board', OFF_BOARD]];
for (const [name, intent] of CANCELS) {
  test(`AC4: tapping ${name} cancels row select; no charge spent and nothing else fires`, () => {
    // Arrange
    const { round, sk, calls } = selectRound();
    round.frame(DT, [cardIntent('guan_yu')]);
    // Act
    round.frame(DT, [intent]);
    // Assert
    assert.equal(round.selecting(), null);
    assert.deepEqual(sk.s.charge, { guan_yu: 1, zhao_yun: 1 });
    assert.equal(calls('skills.tapCard').length, 1);
    assert.deepEqual(round.tokens(), []);
  });
}

test('offBoard outside a select is ignored; a cell tap after a cancel goes to board.tap again', () => {
  // Arrange
  const { round, calls } = selectRound();
  // Act
  round.frame(DT, [OFF_BOARD]);
  round.frame(DT, [cardIntent('guan_yu'), OFF_BOARD, ROW_2]);
  // Assert
  assert.equal(round.selecting(), null);
  assert.deepEqual(calls('board.tap').map((c) => c.slice(1)), [[2, 3]]);
});
