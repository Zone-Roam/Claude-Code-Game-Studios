// Story round-flow/015: pause, push, a lost city and 回书目 while selecting
// (design/gdd/round-flow.md rule 5a "被打断" and Edge Cases; ADR-0002 section 3 step 4; TR-round-flow-012).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playRound, feed, fakePressure, fakeSelectSkills, cardIntent, buttonIntent, PAUSE_STAMP } from '../../helpers/round-fakes.mjs';

const DT = 20;
const PUSH_EVERY_MS = 100;
const ROW_4 = Object.freeze({ type: 'cell', row: 4, col: 0 });

// Press mode; `breaks` decides whether the first push fills the bottom row (lose, 城破).
// skills.onPush records what ctx.selecting() says when it is called.
function pressRound(breaks) {
  const sk = fakeSelectSkills({ ready: ['guan_yu', 'huang_zhong', 'zhang_fei'], rows: [4], cols: [2] });
  const p = fakePressure({ mode: 'press', pushEveryMs: PUSH_EVERY_MS });
  const seen = [];
  const pressure = Object.assign({}, p.impl, {
    outcome: () => (breaks && p.s.pushes > 0 ? { result: 'lose', reason: '城破' } : { result: null, reason: null }),
  });
  const skills = Object.assign({}, sk.impl, { onPush: (ctx) => seen.push(ctx.selecting()) });
  const r = playRound({ skills, pressure }, { loadout: ['zhang_fei', 'guan_yu', 'huang_zhong'] });
  return Object.assign({ sk, p, seen }, r);
}

test('AC1: in row select, the pause stamp then 接着讲 keeps row select; the row can still be chosen', () => {
  // Arrange
  const { round, sk } = pressRound(false);
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  round.frame(DT, [PAUSE_STAMP]);
  const paused = [round.selecting(), round.boardLocked()];
  round.frame(DT, [buttonIntent('pause', 'resume')]);
  const resumed = round.selecting();
  round.frame(DT, [ROW_4]);
  // Assert
  assert.deepEqual(paused, ['row', true]);
  assert.equal(resumed, 'row');
  assert.equal(sk.s.charge.guan_yu, 0);
});

test('AC2: in row select, a push that fills the bottom row ends the round (城破); the select is void and the charge kept', () => {
  // Arrange
  const { round, sk, p } = pressRound(true);
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  feed(round, PUSH_EVERY_MS / DT, DT);
  // Assert
  assert.equal(p.s.pushes, 1);
  assert.equal(round.state(), 'end');
  assert.equal(round.result().reason, '城破');
  assert.equal(round.selecting(), null);
  assert.equal(sk.s.charge.guan_yu, 1);
});

test('row select: a push that does not break cancels it (row numbers moved); skills.onPush sees no select', () => {
  // Arrange
  const { round, sk, seen } = pressRound(false);
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  feed(round, PUSH_EVERY_MS / DT, DT);
  // Assert
  assert.equal(round.state(), 'play');
  assert.equal(round.selecting(), null);
  assert.deepEqual(seen, [null]);
  assert.equal(sk.s.charge.guan_yu, 1);
});

test('AC3: in column select, a push with an empty bottom row keeps the select; skills.onPush redraws (sees col), no cancel', () => {
  // Arrange
  const { round, seen, calls } = pressRound(false);
  round.frame(DT, [cardIntent('huang_zhong')]);
  // Act
  feed(round, PUSH_EVERY_MS / DT, DT);
  // Assert
  assert.equal(round.state(), 'play');
  assert.equal(round.selecting(), 'col');
  assert.equal(calls('skills.onPush').length, 1);
  assert.deepEqual(seen, ['col']);
});

test('AC4: in column select, a push that fills the bottom row ends the round; the select is void and the charge kept', () => {
  // Arrange
  const { round, sk } = pressRound(true);
  round.frame(DT, [cardIntent('huang_zhong')]);
  // Act
  feed(round, PUSH_EVERY_MS / DT, DT);
  // Assert
  assert.equal(round.state(), 'end');
  assert.equal(round.selecting(), null);
  assert.equal(sk.s.charge.huang_zhong, 1);
});

test('edge: row then Zhang Fei in one frame: Guan Yu fires, the second tap is dropped (a token is held now)', () => {
  // Arrange
  const { round, sk } = pressRound(false);
  round.frame(DT, [cardIntent('guan_yu')]);
  // Act
  round.frame(DT, [ROW_4, cardIntent('zhang_fei')]);
  // Assert
  assert.deepEqual(sk.s.charge, { guan_yu: 0, huang_zhong: 1, zhang_fei: 1 });
  assert.deepEqual(round.tokens().map((t) => t.reason), ['skill']);
});

test('edge: row select, pause stamp, then 回书目: the select is void', () => {
  // Arrange
  const { round, sk } = pressRound(false);
  round.frame(DT, [cardIntent('guan_yu')]);
  round.frame(DT, [PAUSE_STAMP]);
  // Act
  round.frame(DT, [buttonIntent('pause', 'catalog')]);
  // Assert
  assert.equal(round.selecting(), null);
  assert.equal(sk.s.charge.guan_yu, 1);
});
