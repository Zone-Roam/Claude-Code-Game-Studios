// Story clear-effects/007: press mode delays the next push; food mode only cheers.
// battle-pressure does not exist yet: the fakes below hold nextPush / comboDelayW
// (press) and food, and call this module's pressDelay as rule 8 describes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESS_DELAY_MS, PRESS_DELAY_CAP_MS } from '../../../src/core/constants.mjs';
import { pressDelay, comboLabel } from '../../../src/rules/clear-effects.mjs';
import { fakeEffects, plainMatch } from '../../helpers/effects-fakes.mjs';

function fakePress(nextPush) {
  const press = { nextPush, comboDelayW: 0, delays: [] };
  press.comboReward = () => {
    const delay = pressDelay(press.comboDelayW);
    press.nextPush += delay;
    press.comboDelayW += delay;
    press.delays.push(delay);
    return delay;
  };
  press.push = () => { press.comboDelayW = 0; };
  return press;
}

test('defaults match the GDD tuning table', () => {
  assert.deepEqual([PRESS_DELAY_MS, PRESS_DELAY_CAP_MS], [1000, 3000]);
});

test('pressDelay = min(PRESS_DELAY_MS, CAP - comboDelayW), never negative', () => {
  assert.equal(pressDelay(0), 1000);
  assert.equal(pressDelay(2500), 500);
  assert.equal(pressDelay(3000), 0);
  assert.equal(pressDelay(3500), 0);
});

test('GDD example: combos 3, 4, 5, 6 between two pushes delay 1000, 1000, 1000, 0', () => {
  const press = fakePress(6000);
  const f = fakeEffects(null, press);
  for (let i = 0; i < 6; i += 1) f.effects.onMatch(plainMatch());
  assert.deepEqual(press.delays, [1000, 1000, 1000, 0]);
  assert.equal(press.nextPush, 9000);
});

test('AC1 2500 ms delayed this stretch: next combo delays 500 (total 3000); a push resets it', () => {
  const press = fakePress(6000);
  press.comboDelayW = 2500;
  const f = fakeEffects(null, press);
  for (let i = 0; i < 3; i += 1) f.effects.onMatch(plainMatch());
  assert.deepEqual(press.delays, [500]);
  assert.equal(press.comboDelayW, 3000);
  press.push();
  assert.equal(press.comboDelayW, 0);
  f.effects.onMatch(plainMatch());
  assert.deepEqual(press.delays, [500, 1000]);
});

test('AC2 food mode: a five-combo changes no food or rule, only shows 五连斩', () => {
  const food = { food: 7, comboReward: () => 0 };
  const f = fakeEffects(null, food);
  for (let i = 0; i < 5; i += 1) f.effects.onMatch(plainMatch());
  assert.equal(food.food, 7);
  assert.deepEqual(f.pressureCalls, ['comboReward', 'comboReward', 'comboReward']);
  assert.deepEqual(f.calls, [], 'no emit, token or dispatch from the combo');
  assert.equal(comboLabel(f.effects.combo()), '五连斩');
});
