// battle-pressure inside a real round (design/gdd/battle-pressure.md AC "持有 skill 令牌"; ADR-0002).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { createPressure } from '../../../src/rules/battle-pressure.mjs';
import { createEffects } from '../../../src/rules/clear-effects.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { TEST_CONSTANTS } from '../../helpers/round-fakes.mjs';
import { luBuChapter, OPEN_PICTURE } from '../../helpers/battle-pressure-fakes.mjs';

function bossRound() {
  const skills = {
    onMatch() {}, tapCard: () => null, onPush() {}, skillsUsed: () => ({}),
    rowSelectable: () => false, cutRow() {}, colSelectable: () => false, cutCol() {},
  };
  const round = createRound({
    chapter: luBuChapter(), seed: 7, constants: TEST_CONSTANTS, progress: { settle: () => ({}) },
    systems: { createBoard: () => boardFromPicture(OPEN_PICTURE), createPressure, createEffects, createSkills: () => skills },
  });
  round.start();
  for (let i = 0; i < 3 && round.state() !== 'play'; i++) round.frame(16, []);
  round.drainEvents();
  return round;
}

test('AC any mode holding a skill token: 800 ms of frames -> the boss does not attack; it attacks on the first tick after release', () => {
  const round = bossRound();
  assert.equal(round.state(), 'play');
  const pressure = round.systems().pressure;
  for (let i = 0; i < 4; i++) pressure.onMiss({ type: 'miss' });
  assert.equal(pressure.hud().steps, 8);
  const token = round.acquire('skill', 3000);
  for (let i = 0; i < 4; i++) round.frame(200, []);
  assert.equal(round.drainEvents().filter((e) => e.type === 'hostAttack').length, 0);
  assert.equal(pressure.hud().hearts, 3);
  round.release(token);
  round.frame(16, []);
  const evs = round.drainEvents();
  assert.equal(evs.filter((e) => e.type === 'hostAttack').length, 1);
  assert.equal(pressure.hud().hearts, 2);
  assert.ok(evs.some((e) => e.type === 'tokenStart' && e.reason === 'hostAttack'));
});
