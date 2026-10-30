// Story round-flow/012: 回书目 abandons the round (rule 11; ADR-0002 section 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash32 } from '../../../src/core/rng.mjs';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { createScreens } from '../../../src/app/screens.mjs';
import { createMainLoop } from '../../../src/app/main-loop.mjs';
import {
  playRound, fakeSystems, feed, buttonIntent, fakeProgressStore, PAUSE_STAMP, TEST_CONSTANTS,
} from '../../helpers/round-fakes.mjs';

const DT = 16;
const CATALOG = buttonIntent('pause', 'catalog');
const CARD = Object.freeze({ type: 'card', general: 'zhangfei' });
const CHAPTERS = Object.freeze([{ id: 'ch01', mode: 'press' }, { id: 'ch02', mode: 'press' }]);
const SALT = 7;

// A skill whose end would change the board: it must never run after 回书目.
function skillFakes(store, effects) {
  return {
    progress: store.impl,
    skills: {
      tapCard: (general, ctx) => ctx.acquire('skill', undefined, (token) => {
        effects.push(general);
        ctx.board.clearKind('ying');
        ctx.release(token);
      }),
    },
  };
}

test('AC1: holding skill, pause then 回书目: tokens cleared, the skill never lands, settle not called, save unchanged', () => {
  // Arrange
  const store = fakeProgressStore();
  const effects = [];
  const { round, calls } = playRound(skillFakes(store, effects));
  const saved = JSON.stringify(store.save);
  round.frame(DT, [CARD]);
  round.frame(DT, [PAUSE_STAMP]);
  round.drainEvents();
  // Act
  round.frame(DT, [CATALOG]);
  const events = round.drainEvents();
  const timeAt = round.gameTime();
  feed(round, 400, DT);
  // Assert
  assert.deepEqual(round.tokens(), []);
  assert.deepEqual(effects, []);
  assert.equal(calls('board.clearKind').length, 0);
  assert.equal(calls('progress.settle').length, 0);
  assert.equal(JSON.stringify(store.save), saved);
  assert.deepEqual(events, [{ type: 'exit', to: 'catalog' }]);
  assert.equal(round.gameTime(), timeAt);
  assert.equal(calls('pressure.tick').length, 0);
  assert.equal(round.boardLocked(), true);
});

test('AC2: through screens and the main loop, 回书目 drops the round with no RoundResult; the next open is attempt 2', () => {
  // Arrange
  const store = fakeProgressStore();
  const saved = JSON.stringify(store.save);
  const made = [];
  const screens = createScreens({
    chapters: CHAPTERS,
    salt: SALT,
    newRound(spec) {
      const fakes = fakeSystems({ progress: store.impl });
      const round = createRound(Object.assign({ constants: TEST_CONSTANTS, progress: fakes.progress, systems: fakes.systems }, spec));
      round.start();
      made.push({ round, fakes, spec });
      return round;
    },
  });
  let queue = [];
  const loop = createMainLoop({
    screens,
    view: { render: () => {} },
    raf: () => {},
    inputQueue: { takeAll: () => { const all = queue; queue = []; return all; } },
  });
  screens.open('ch01');
  loop.onFrame(0);
  queue.push(PAUSE_STAMP);
  loop.onFrame(DT);
  // Act
  queue.push(CATALOG);
  loop.onFrame(2 * DT);
  const screenAfter = [screens.screen(), screens.round()];
  screens.open('ch01');
  // Assert
  assert.deepEqual(screenAfter, ['catalog', null]);
  assert.equal(made[0].round.result(), null);
  assert.equal(made[0].fakes.calls('progress.settle').length, 0);
  assert.equal(JSON.stringify(store.save), saved);
  assert.equal(screens.attempt('ch01'), 2);
  assert.equal(made[1].spec.attempt, 2);
  assert.equal(made[1].spec.seed, hash32('ch01', 2, SALT));
});
