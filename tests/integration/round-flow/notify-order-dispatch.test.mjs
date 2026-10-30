// Story round-flow/006: match/miss notify order and the dispatch table
// (design/gdd/round-flow.md rules 6.3-6.4; ADR-0002 section 3; TR-round-flow-005).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_HIGHLIGHT_MS, HOST_ATTACK_MS, RESHUFFLE_SHOW_MS } from '../../../src/core/constants.mjs';
import { playRound, feed, fakePressure, fakeEffects, CELL } from '../../helpers/round-fakes.mjs';

const DT = 20;
const MATCH_DAO = Object.freeze({ type: 'match', kind: 'dao' });
const MATCH_HUO = Object.freeze({ type: 'match', kind: 'huo' });
const MISS = Object.freeze({ type: 'miss', kind: 'dao' });
const BOSS = Object.freeze({ id: 'ch09', mode: 'boss' });
const FOOD = Object.freeze({ id: 'ch05', mode: 'food' });
const MARK = Object.freeze({ type: 'mark' });

const dotted = (log) => log.map((entry) => entry[0]).filter((name) => name.indexOf('.') !== -1);

test('boss steps 7/8, hp 5: a plain match makes the same frame tick attack and hold hostAttack 600 ms', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 5, steps: 7, stepsMax: 8 });
  const { round, log } = playRound({ pressure: p.impl, board: { tap: () => MATCH_DAO } }, { chapter: BOSS });
  // Act
  round.frame(DT, [CELL]);
  // Assert
  const names = dotted(log);
  assert.ok(names.indexOf('pressure.onMatch') < names.indexOf('pressure.tick'));
  assert.equal(p.s.heartsLost, 1);
  assert.deepEqual(round.tokens(), [{ reason: 'hostAttack', remainingMs: HOST_ATTACK_MS }]);
  assert.ok(round.drainEvents().some((ev) => ev.type === 'hostAttack'));
});

test('boss steps 7/8: a fire match holds effect, no tick that frame; the first tick after the token attacks', () => {
  // Arrange
  const p = fakePressure({ mode: 'boss', hearts: 3, hp: 5, steps: 7, stepsMax: 8 });
  const { round, calls } = playRound({
    pressure: p.impl, effects: fakeEffects({ huo: 'ying' }), board: { tap: () => MATCH_HUO },
  }, { chapter: BOSS });
  // Act
  round.frame(DT, [CELL]);
  const ticksAfterTap = calls('pressure.tick').length;
  feed(round, EFFECT_HIGHLIGHT_MS / DT - 1, DT);
  const ticksBeforeEnd = calls('pressure.tick').length;
  round.frame(DT, []);
  // Assert
  assert.equal(ticksAfterTap, 0);
  assert.equal(ticksBeforeEnd, 0);
  assert.equal(calls('pressure.tick').length, 1);
  assert.equal(p.s.heartsLost, 1);
  assert.deepEqual(round.tokens().map((t) => t.reason), ['hostAttack']);
});

test('food 1, one fire pair and three camp pairs: food hits 0 first, the effect clears the camps, outcome is a win', () => {
  // Arrange
  let empty = false;
  const p = fakePressure({ mode: 'food', food: 1 });
  const { round, log } = playRound({
    pressure: p.impl,
    effects: fakeEffects({ huo: 'ying' }),
    board: { tap: () => MATCH_HUO, clearKind: () => { empty = true; }, isEmpty: () => empty },
  }, { chapter: FOOD });
  // Act
  round.frame(DT, [CELL]);
  const foodAfterTap = p.s.food;
  const stateAfterTap = round.state();
  feed(round, EFFECT_HIGHLIGHT_MS / DT, DT);
  // Assert
  const names = dotted(log);
  assert.equal(foodAfterTap, 0);
  assert.equal(stateAfterTap, 'play');
  assert.ok(names.indexOf('pressure.onMatch') < names.indexOf('board.clearKind'));
  assert.ok(names.indexOf('board.clearKind') < names.indexOf('pressure.onClear'));
  assert.equal(round.state(), 'end');
  assert.equal(round.result().win, true);
  assert.equal(round.result().reason, null);
});

test('rule 6.3 order: a match goes effects -> skills -> pressure -> view; a miss effects -> pressure -> view', () => {
  // Arrange
  const over = (tap) => ({ board: { tap: () => tap }, pressure: {
    onMatch: (ev, ctx) => ctx.emit(MARK), onMiss: (ev, ctx) => ctx.emit(MARK),
  } });
  const m = playRound(over(MATCH_DAO));
  const x = playRound(over(MISS));
  // Act
  m.round.frame(DT, [CELL]);
  x.round.frame(DT, [CELL]);
  // Assert
  assert.deepEqual(dotted(m.log).slice(0, 4), ['board.tap', 'effects.onMatch', 'skills.onMatch', 'pressure.onMatch']);
  assert.deepEqual(m.round.drainEvents().slice(0, 2), [MARK, MATCH_DAO]);
  assert.deepEqual(dotted(x.log).slice(0, 3), ['board.tap', 'effects.onMiss', 'pressure.onMiss']);
  assert.deepEqual(x.round.drainEvents().slice(0, 2), [MARK, MISS]);
});

test('dispatch table: effect and skill clears go to pressure.onClear, then the view', () => {
  for (const source of ['effect', 'skill']) {
    // Arrange
    const { round, calls } = playRound({ pressure: { onClear: (ev, ctx) => ctx.emit(MARK) } });
    const clear = { type: 'clear', source, cells: [] };
    // Act
    round.dispatch(clear);
    // Assert
    assert.deepEqual(calls('pressure.onClear'), [['pressure.onClear', clear]]);
    assert.deepEqual(round.drainEvents(), [MARK, clear]);
  }
});

test('dispatch table: ensurePlayable reshuffle goes to the view and holds reshuffle 400 ms; a fallback clear goes to pressure.onClear', () => {
  // Arrange
  const reshuffle = { type: 'reshuffle', fallback: false };
  const fallback = { type: 'clear', source: 'reshuffle', cells: [], buried: 0, blocks: [], revealed: [], pairs: 0 };
  const a = playRound({ board: { tap: () => MISS, ensurePlayable: () => reshuffle } });
  const b = playRound({ board: { tap: () => MISS, ensurePlayable: () => fallback } });
  // Act
  a.round.frame(DT, [CELL]);
  b.round.frame(DT, [CELL]);
  // Assert
  const evA = a.round.drainEvents();
  assert.ok(evA.indexOf(reshuffle) !== -1);
  assert.ok(evA.indexOf(reshuffle) < evA.findIndex((ev) => ev.type === 'tokenStart'));
  assert.deepEqual(a.round.tokens(), [{ reason: 'reshuffle', remainingMs: RESHUFFLE_SHOW_MS }]);
  assert.equal(a.calls('pressure.onClear').length, 0);
  assert.deepEqual(b.calls('pressure.onClear'), [['pressure.onClear', fallback]]);
  assert.ok(b.round.drainEvents().indexOf(fallback) !== -1);
  assert.deepEqual(b.round.tokens(), []);
});
