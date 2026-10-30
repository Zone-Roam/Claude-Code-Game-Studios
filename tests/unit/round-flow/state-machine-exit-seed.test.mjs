// Story round-flow/003: round states, settle-card exits and the round seed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash32 } from '../../../src/core/rng.mjs';
import { ENDING_WIN_MS, ENDING_LOSE_MS } from '../../../src/core/constants.mjs';
import { createScreens, resolveSalt } from '../../../src/app/screens.mjs';
import { createMainLoop } from '../../../src/app/main-loop.mjs';
import { playRound, feed } from '../../helpers/round-fakes.mjs';

function endedRound(result, hasNext) {
  const fakes = playRound({ pressure: { outcome: () => ({ result, reason: result === 'lose' ? '破城' : null }) } }, { hasNext });
  fakes.round.frame(16.7, []);
  return fakes;
}

for (const [result, ms] of [['win', ENDING_WIN_MS], ['lose', ENDING_LOSE_MS]]) {
  test(`${result}: the round stays in end until endingDone(), however long (${ms} ms is the view's timer)`, () => {
    // Arrange
    const { round } = endedRound(result, true);
    const endTime = round.gameTime();
    // Act
    feed(round, Math.ceil((ms * 2) / 16.7), 16.7);
    const stateBefore = round.state();
    round.endingDone();
    // Assert
    assert.equal(stateBefore, 'end');
    assert.equal(round.gameTime(), endTime);
    assert.equal(round.boardLocked(), true);
    assert.equal(round.state(), 'settle');
    assert.deepEqual(round.drainEvents().filter((ev) => ev.type === 'state'), [
      { type: 'state', from: 'play', to: 'end' },
      { type: 'state', from: 'end', to: 'settle' },
    ]);
  });
}

test('ending constants: win 2000 ms, lose 300 ms', () => {
  assert.equal(ENDING_WIN_MS, 2000);
  assert.equal(ENDING_LOSE_MS, 300);
});

test('endingDone outside end is ignored', () => {
  // Arrange
  const { round } = playRound();
  // Act
  round.endingDone();
  // Assert
  assert.equal(round.state(), 'play');
});

const CHAPTERS = [{ id: 'ch01' }, { id: 'ch02' }];

function session(search) {
  const opened = [];
  const salt = resolveSalt(search, true, () => 7);
  const screens = createScreens({ chapters: CHAPTERS, salt, newRound: (params) => { opened.push(params); return { slots: () => null }; } });
  return { screens, opened };
}

test('seed=42: first start of a chapter gets the same seed after a reload; retry gets attempt 2 and a new seed', () => {
  // Arrange
  const first = session('?seed=42');
  const reloaded = session('?seed=42');
  // Act
  first.screens.open('ch01');
  reloaded.screens.open('ch01');
  first.screens.onEvents([{ type: 'exit', to: 'retry' }]);
  // Assert
  assert.equal(first.opened[0].seed, reloaded.opened[0].seed);
  assert.equal(first.opened[0].seed, hash32('ch01', 1, 42));
  assert.equal(first.opened[1].attempt, 2);
  assert.notEqual(first.opened[1].seed, first.opened[0].seed);
});

test('release build ignores seed=N and uses the random salt; catalog then re-entry still adds to attempt', () => {
  // Arrange
  const screens = createScreens({ chapters: CHAPTERS, salt: resolveSalt('?seed=42', false, () => 7), newRound: (p) => p });
  // Act
  const a = screens.open('ch01');
  screens.onEvents([{ type: 'exit', to: 'catalog' }]);
  const screenAfterExit = screens.screen();
  const b = screens.open('ch01');
  // Assert
  assert.equal(a.seed, hash32('ch01', 1, 7));
  assert.equal(screenAfterExit, 'catalog');
  assert.equal(b.attempt, 2);
});

test('last chapter won: the settle card offers only retry and catalog; next is refused', () => {
  // Arrange
  const { round } = endedRound('win', false);
  round.endingDone();
  round.drainEvents();
  // Act
  round.frame(16.7, [{ type: 'button', card: 'win', button: 'next' }, { type: 'button', card: 'win', button: 'retry' }]);
  // Assert
  assert.deepEqual(round.exits(), ['retry', 'catalog']);
  assert.deepEqual(round.drainEvents(), [{ type: 'exit', to: 'retry' }]);
});

test('won with a next chapter: next, retry, catalog; lost: retry, catalog', () => {
  // Arrange
  const win = endedRound('win', true).round;
  const lose = endedRound('lose', true).round;
  // Act
  win.endingDone();
  lose.endingDone();
  // Assert
  assert.deepEqual(win.exits(), ['next', 'retry', 'catalog']);
  assert.deepEqual(lose.exits(), ['retry', 'catalog']);
});

test('main loop: schedules first, passes dtReal and intents, sends a thrown error to screens.fail', () => {
  // Arrange
  const order = [];
  const frames = [];
  const round = {
    frame: (dt, intents) => { order.push('frame'); frames.push([dt, intents]); if (dt > 100) throw new Error('boom'); },
    drainEvents: () => [],
  };
  let screen = 'round';
  const screens = { screen: () => screen, round: () => round, onEvents: () => {}, fail: () => { screen = 'error'; } };
  const loop = createMainLoop({
    screens, view: { render: () => {} }, inputQueue: { takeAll: () => [{ type: 'cell', row: 1, col: 1 }] },
    raf: () => order.push('raf'),
  });
  // Act
  loop.onFrame(1000);
  loop.onFrame(1016);
  loop.onFrame(1500);
  // Assert
  assert.deepEqual(order.slice(0, 2), ['raf', 'frame']);
  assert.deepEqual(frames.map((f) => f[0]), [0, 16, 484]);
  assert.deepEqual(frames[0][1], [{ type: 'cell', row: 1, col: 1 }]);
  assert.equal(screen, 'error');
});
