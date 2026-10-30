// Story round-flow/017: 开讲, the 150 ms mask fade and the loadout handed to skills
// (design/gdd/round-flow.md rules 2, 8, 13; general-loadout rules 9-14; ADR-0002 section 2;
// TR-round-flow-010, TR-round-flow-013).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { createScreens } from '../../../src/app/screens.mjs';
import { OPEN_FADE_MS, CARD_GUARD_MS } from '../../../src/core/constants.mjs';
import {
  fakeSystems, feed, fakePicker, buttonIntent, CELL, TEST_CHAPTER, TEST_SEED, TEST_CONSTANTS,
} from '../../helpers/round-fakes.mjs';

const DT = 20;
const START = buttonIntent('open', 'start');
const FADE = Object.freeze(Object.assign({}, TEST_CONSTANTS, { OPEN_FADE_MS, CARD_GUARD_MS }));
const SLOTS = Object.freeze(['zhang_fei', 'guan_yu', null]);

function button(name, extra) {
  return Object.assign(buttonIntent('open', name), extra);
}

function makeRound(over, options) {
  const fakes = fakeSystems(over);
  const round = createRound(Object.assign({
    chapter: TEST_CHAPTER, seed: TEST_SEED, constants: TEST_CONSTANTS, progress: fakes.progress, systems: fakes.systems,
  }, options));
  return Object.assign({ round }, fakes);
}

test('OPEN_FADE_MS is 150', () => {
  assert.equal(OPEN_FADE_MS, 150);
});

test('AC1: during the 150 ms fade board taps are dropped and gameTime stays 0; after it a tap works', () => {
  // Arrange
  const { round, calls } = makeRound(undefined, { constants: FADE, loadout: ['zhang_fei'] });
  feed(round, CARD_GUARD_MS / 100, 100);
  round.drainEvents();
  // Act
  round.frame(0, [START]);
  const starting = [round.state(), round.overlay()];
  const events = round.drainEvents().filter((ev) => ev.type === 'state');
  round.frame(100, [CELL]);
  round.frame(50, [CELL]);
  const afterFade = [round.state(), round.gameTime(), calls('board.tap').length];
  round.frame(DT, [CELL]);
  // Assert
  assert.deepEqual(starting, ['starting', null]);
  assert.deepEqual(events, [{ type: 'state', from: 'open', to: 'starting' }]);
  assert.deepEqual(afterFade, ['play', 0, 0]);
  assert.equal(calls('board.tap').length, 1);
  assert.equal(round.gameTime(), DT);
});

test('AC2: slots [Zhang Fei, Guan Yu, empty]: skills get [zhang_fei, guan_yu]; RoundResult.loadout and skillsUsed match', () => {
  // Arrange
  let won = false;
  const picker = fakePicker(SLOTS, false);
  const { round, ctxs, calls } = makeRound({
    pressure: { outcome: () => (won ? { result: 'win', reason: null } : { result: null, reason: null }) },
    skills: { skillsUsed: () => ({ zhang_fei: 2 }) },
  }, { picker: picker.impl });
  const builtBefore = calls('createSkills').length;
  // Act
  round.frame(DT, [START]);
  won = true;
  round.frame(DT, []);
  // Assert
  assert.equal(builtBefore, 0);
  assert.deepEqual(ctxs.skills.loadout, ['zhang_fei', 'guan_yu']);
  assert.equal(round.state(), 'end');
  assert.deepEqual(round.result().loadout, ['zhang_fei', 'guan_yu']);
  assert.deepEqual(round.result().skillsUsed, { zhang_fei: 2, guan_yu: 0 });
});

test('AC3: 开讲 with the choice expanded closes it and starts with the slots as they are (no swap first)', () => {
  // Arrange
  const picker = fakePicker(SLOTS, true);
  const { round, ctxs } = makeRound(undefined, { picker: picker.impl });
  round.frame(DT, [button('slot', { slot: 2 })]);
  const expanded = picker.s.expanded;
  // Act
  round.frame(DT, [START]);
  // Assert
  assert.equal(expanded, 2);
  assert.equal(picker.s.expanded, null);
  assert.deepEqual(ctxs.skills.loadout, ['zhang_fei', 'guan_yu']);
  assert.deepEqual(round.slots(), SLOTS);
});

test('AC4: 再来一回 brings back exactly the last slots (an empty slot stays empty) and they can still be changed', () => {
  // Arrange
  const made = [];
  const screens = createScreens({
    chapters: [TEST_CHAPTER],
    salt: TEST_SEED,
    newRound(spec) {
      const picker = fakePicker(spec.slots || ['zhang_fei', 'guan_yu', 'zhao_yun'], true);
      const { round } = makeRound({ pressure: { outcome: () => ({ result: 'lose', reason: '城破' }) } },
        { chapter: spec.chapter, seed: spec.seed, attempt: spec.attempt, picker: picker.impl });
      made.push({ spec, round, picker });
      return round;
    },
  });
  const first = screens.open(TEST_CHAPTER.id);
  first.frame(DT, [button('clear', { slot: 2 })]);
  first.frame(DT, [START]);
  first.frame(DT, []);
  first.endingDone();
  // Act
  first.frame(DT, [buttonIntent('lose', 'retry')]);
  screens.onEvents(first.drainEvents());
  const second = screens.round();
  const carried = second.slots();
  second.frame(DT, [button('slot', { slot: 2 }), button('pick', { general: 'zhao_yun' })]);
  // Assert
  assert.equal(made[0].spec.slots, null);
  assert.deepEqual(made[1].spec.slots, SLOTS);
  assert.deepEqual(carried, SLOTS);
  assert.equal(second.state(), 'open');
  assert.deepEqual(second.slots(), ['zhang_fei', 'guan_yu', 'zhao_yun']);
});
