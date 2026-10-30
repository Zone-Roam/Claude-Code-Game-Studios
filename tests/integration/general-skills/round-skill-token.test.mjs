// general-skills inside a real round (round-flow on fake board / effects and a
// fake pressure): the board lock drops card taps (AC pause / effect token) and
// the skill token freezes game time for 950 ms before the effect lands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../../../src/rules/general-skills.mjs';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { fakeSystems, cardIntent, CELL, TEST_CONSTANTS, TEST_SEED } from '../../helpers/round-fakes.mjs';
import { fakePressure } from '../../helpers/general-skills-fakes.mjs';

function roundWithRealSkills() {
  const p = fakePressure();
  const fakes = fakeSystems({ board: { tap: () => ({ type: 'match', kind: 'gu', forced: false }) } });
  const makePressure = fakes.systems.createPressure;
  fakes.systems.createPressure = (ctx) => Object.assign(makePressure(ctx), p.impl);
  fakes.systems.createSkills = (ctx) => createSkills(ctx);
  const round = createRound({
    chapter: { id: 'test', mode: 'boss' }, seed: TEST_SEED, constants: TEST_CONSTANTS,
    progress: fakes.progress, systems: fakes.systems, loadout: ['zhang_fei'],
  });
  round.start();
  for (let i = 0; i < 3; i++) round.frame(16, [CELL]);
  round.drainEvents();
  const skills = round.systems().skills;
  return { round, skills, p };
}

test('AC pause token: a card tap while pause is held is dropped; charge kept, no skill token', () => {
  const { round, skills } = roundWithRealSkills();
  assert.equal(skills.cards()[0].state, 'ready');
  round.acquire('pause');
  round.frame(16, [cardIntent('zhang_fei')]);
  assert.equal(skills.cards()[0].charge, 3);
  assert.equal(skills.skillsUsed().zhang_fei, 0);
  assert.ok(round.tokens().every((t) => t.reason !== 'skill'));
});

test('AC effect token: a card tap during an effect highlight is dropped', () => {
  const { round, skills } = roundWithRealSkills();
  round.acquire('effect', 600);
  round.frame(16, [cardIntent('zhang_fei')]);
  assert.equal(skills.cards()[0].charge, 3);
  assert.ok(round.tokens().every((t) => t.reason !== 'skill'));
});

test('AC skill token in a round: 950 ms of foreground time, game time frozen, effect at the end', () => {
  const { round, skills, p } = roundWithRealSkills();
  round.frame(16, [cardIntent('zhang_fei')]);
  assert.ok(round.tokens().some((t) => t.reason === 'skill'));
  const frozenAt = round.gameTime();
  for (let i = 0; i < 59; i++) round.frame(16, []); // 944 ms counted
  assert.deepEqual(p.calls, []);
  assert.equal(round.gameTime(), frozenAt);
  round.frame(16, []); // 960 ms
  assert.deepEqual(p.calls, [['roarBack', 3, 3]]);
  assert.ok(round.tokens().every((t) => t.reason !== 'skill'));
  assert.equal(skills.skillsUsed().zhang_fei, 1);
  assert.equal(skills.cards()[0].charge, 0);
});
