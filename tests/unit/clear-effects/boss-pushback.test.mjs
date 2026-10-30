// Story clear-effects/006: boss-mode combo pushback through pressure.comboReward().
// battle-pressure does not exist yet: the fake boss below holds steps and
// pushedSinceAttack and implements comboReward() with this module's pushbackCut,
// in the shape clear-effects rule 8 and ADR-0003 (`comboPushback {cut}`) give it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_PUSHBACK, COMBO_PUSHBACK_CAP, COMBO_THRESHOLD } from '../../../src/core/constants.mjs';
import { pushbackCut } from '../../../src/rules/clear-effects.mjs';
import { fakeEffects, plainMatch } from '../../helpers/effects-fakes.mjs';

function fakeBoss(steps) {
  const boss = { steps, pushedSinceAttack: 0, rewards: [], emitted: [] };
  boss.comboReward = () => {
    const cut = pushbackCut(boss.steps, boss.pushedSinceAttack);
    if (cut > 0) {
      boss.steps -= cut;
      boss.pushedSinceAttack += cut;
      boss.emitted.push({ type: 'comboPushback', cut });
    }
    boss.rewards.push(cut);
    return cut;
  };
  boss.onMatch = () => { boss.steps += 1; };
  boss.attack = () => { boss.steps = 0; boss.pushedSinceAttack = 0; };
  return boss;
}

function setup(startSteps) {
  const boss = fakeBoss(startSteps);
  const f = fakeEffects(null, boss);
  // Round dispatch order (round-flow rule 6): effects first, then pressure.
  const match = () => {
    const ev = plainMatch();
    f.effects.onMatch(ev);
    boss.onMatch(ev);
  };
  return { boss, f, match };
}

test('defaults match the GDD tuning table', () => {
  assert.deepEqual([COMBO_THRESHOLD, COMBO_PUSHBACK, COMBO_PUSHBACK_CAP], [3, 1, 2]);
});

test('pushbackCut = min(PUSHBACK, CAP - pushedSinceAttack, steps), never negative', () => {
  assert.equal(pushbackCut(5, 0), 1);
  assert.equal(pushbackCut(5, 1), 1);
  assert.equal(pushbackCut(5, 2), 0);
  assert.equal(pushbackCut(0, 0), 0);
  assert.equal(pushbackCut(5, 3), 0, 'pushed past the cap (cap lowered) gives 0, not negative');
});

test('AC1 steps 5, none pushed: combos 3, 4, 5 leave steps 5, 5, 6; rewards 1, 1, 0', () => {
  const { boss, match } = setup(3);
  match();
  match();
  assert.equal(boss.steps, 5);
  assert.equal(boss.pushedSinceAttack, 0);
  const after = [];
  for (let i = 0; i < 3; i += 1) {
    match();
    after.push(boss.steps);
  }
  assert.deepEqual(after, [5, 5, 6]);
  assert.deepEqual(boss.rewards, [1, 1, 0]);
  assert.deepEqual(boss.emitted, [{ type: 'comboPushback', cut: 1 }, { type: 'comboPushback', cut: 1 }]);
});

test('AC2 steps 0 at the third combo: reward 0, nothing shown, steps 1 after the pair', () => {
  const { boss, f, match } = setup(0);
  match();
  match();
  boss.attack();
  assert.equal(f.effects.combo(), 2, 'the attack leaves the combo alone');
  match();
  assert.deepEqual(boss.rewards, [0]);
  assert.deepEqual(boss.emitted, []);
  assert.equal(boss.steps, 1);
});

test('AC3 after 2 pushed, an attack resets; once steps >= 1 a combo pushes back again', () => {
  const { boss, match } = setup(3);
  for (let i = 0; i < 5; i += 1) match();
  assert.equal(boss.pushedSinceAttack, 2);
  boss.attack();
  assert.equal(boss.pushedSinceAttack, 0);
  assert.equal(boss.steps, 0);
  match();
  assert.equal(boss.steps, 1);
  match();
  assert.equal(boss.rewards[boss.rewards.length - 1], 1);
});

test('AC4 the match that makes combo 2 does not call comboReward', () => {
  const { f, match } = setup(5);
  match();
  match();
  assert.equal(f.effects.combo(), 2);
  assert.deepEqual(f.pressureCalls, []);
  match();
  assert.deepEqual(f.pressureCalls, ['comboReward']);
});
