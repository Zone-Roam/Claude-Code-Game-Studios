// Story clear-effects/004: combo = consecutive matches with no miss; never reads the clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_MAX } from '../../../src/core/constants.mjs';
import { comboLabel } from '../../../src/rules/clear-effects.mjs';
import { fakeEffects, plainMatch, plainMiss } from '../../helpers/effects-fakes.mjs';

function play(effects, moves) {
  return moves.map((m) => {
    if (m === 'match') effects.onMatch(plainMatch());
    else effects.onMiss(plainMiss());
    return effects.combo();
  });
}

test('AC1 match, match, match, miss, match -> combo 1, 2, 3, 0, 1; maxCombo 3', () => {
  const f = fakeEffects(null);
  assert.deepEqual(play(f.effects, ['match', 'match', 'match', 'miss', 'match']), [1, 2, 3, 0, 1]);
  assert.equal(f.effects.maxCombo(), 3);
});

test('AC2 combo 2, 30 s idle, one more match -> combo 3 (time is not read)', () => {
  const f = fakeEffects(null);
  play(f.effects, ['match', 'match']);
  f.advance(30000);
  f.effects.onMatch(plainMatch());
  assert.equal(f.effects.combo(), 3);
  assert.equal(f.effects.onMatch.length, 1, 'onMatch takes the event only, no time');
  assert.equal(f.effects.onMiss.length, 1, 'onMiss takes the event only, no time');
});

test('AC3 combo 5, one miss -> combo 0 and no combo label', () => {
  const f = fakeEffects(null);
  play(f.effects, ['match', 'match', 'match', 'match', 'match']);
  assert.equal(f.effects.combo(), 5);
  f.effects.onMiss(plainMiss());
  assert.equal(f.effects.combo(), 0);
  assert.equal(comboLabel(f.effects.combo()), '');
  assert.equal(f.effects.maxCombo(), 5, 'a miss keeps maxCombo');
});

test('AC4 "再来一回": a new round module starts at combo 0, maxCombo 0', () => {
  const first = fakeEffects(null);
  play(first.effects, ['match', 'match', 'match', 'match']);
  const again = fakeEffects(null);
  assert.equal(again.effects.combo(), 0);
  assert.equal(again.effects.maxCombo(), 0);
});

test('combo and maxCombo stop at COMBO_MAX', () => {
  const f = fakeEffects(null);
  for (let i = 0; i < COMBO_MAX + 5; i += 1) f.effects.onMatch(plainMatch());
  assert.equal(f.effects.combo(), COMBO_MAX);
  assert.equal(f.effects.maxCombo(), COMBO_MAX);
});
