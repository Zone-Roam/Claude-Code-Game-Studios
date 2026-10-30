// general-loadout picker driven by round-flow's open card (rules 10, 14; AC16 order part).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { createLoadout, unlockedGenerals } from '../../../src/rules/general-loadout.mjs';
import { fakeSystems, buttonIntent, TEST_SEED, TEST_CONSTANTS } from '../../helpers/round-fakes.mjs';
import { GENERALS, STARTERS, CHAPTERS, CH03, winsOf, slotBtn, pickBtn } from '../../helpers/general-loadout-fakes.mjs';

test('AC16: slots 赵云, 张飞 -> 开讲 hands skills exactly [zhao_yun, zhang_fei] in slot order', () => {
  const fakes = fakeSystems();
  const picker = createLoadout({
    chapter: CH03, generals: GENERALS,
    unlocked: unlockedGenerals({ starters: STARTERS, chapters: CHAPTERS, winsOf: winsOf({ ch01: 1 }) }),
  });
  const round = createRound({
    chapter: { id: 'ch03', mode: 'press' }, seed: TEST_SEED, constants: TEST_CONSTANTS,
    progress: fakes.progress, systems: fakes.systems, picker,
  });
  round.frame(0, [slotBtn(1)]);
  round.frame(0, [pickBtn('zhang_fei')]);
  assert.deepEqual(round.slots(), ['zhao_yun', 'zhang_fei']);
  round.frame(0, [buttonIntent('open', 'start')]);
  assert.deepEqual(fakes.ctxs.skills.loadout, ['zhao_yun', 'zhang_fei']);
  assert.deepEqual(round.slots(), ['zhao_yun', 'zhang_fei']);
});
