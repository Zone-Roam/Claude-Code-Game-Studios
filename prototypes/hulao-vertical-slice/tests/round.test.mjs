// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../src/rules/round-flow.mjs';
import { createBoard } from '../src/rules/board-link.mjs';
import { createPressure } from '../src/rules/battle-pressure.mjs';
import { createEffects } from '../src/rules/clear-effects.mjs';
import { createSkills } from '../src/rules/general-skills.mjs';
import { createProgress } from '../src/rules/progress-save.mjs';
import { loadChapters } from '../src/rules/chapter-loader.mjs';
import { CHAPTERS, ENEMIES } from '../src/data/chapter01.mjs';

// Slice v6 moved chapter 1 to 5 columns with stacking. The tests written for the 6×6 board keep that board
// (the v5 deck, no buried tiles); CH5 is the real chapter 1.
const CH5 = loadChapters({ chapters: CHAPTERS, enemies: ENEMIES }, { slow: false }).chapters[0];
const CH = Object.assign({}, CH5, { cols: 6, deck: { huo: 2, ying: 6, dao: 4, gu: 6, dun: 6, shu: 8, qi: 2, jiu: 2 } });

// A full chapter-1 board with easy pairs on top: two 刀 pairs, one 鼓 pair, 火 at the bottom right.
const LAYOUT = [
  ['dao', 'dao', 'dao', 'dao', 'gu', 'gu'],
  ['gu', 'gu', 'ying', 'ying', 'ying', 'ying'],
  ['ying', 'ying', 'ying', 'ying', 'dun', 'dun'],
  ['dun', 'dun', 'shu', 'shu', 'shu', 'shu'],
  ['qi', 'qi', 'qi', 'qi', 'jiu', 'jiu'],
  ['jiu', 'jiu', 'jiu', 'jiu', 'huo', 'huo'],
];

function makeRound(layout, chapter) {
  const systems = {
    createBoard: (ch, opts) => createBoard(ch, Object.assign({}, opts, layout ? { layout } : {})),
    createPressure,
    createEffects,
    createSkills,
  };
  return createRound({ chapter: chapter || CH, seed: 1, progress: createProgress(), systems });
}

function run(round, ms, step) {
  const dt = step || 16;
  let events = [];
  for (let t = 0; t < ms; t += dt) {
    round.frame(dt, []);
    events = events.concat(round.drainEvents());
  }
  return events;
}

function press(round, intents) {
  round.frame(16, intents);
  return round.drainEvents();
}

// (1,5) 鼓 and (2,1) 鼓 in LAYOUT cannot be linked: tapping them in turn misses every time after the first tap.
function misses(round, n) {
  const a = { type: 'cell', row: 1, col: 5 };
  const b = { type: 'cell', row: 2, col: 1 };
  const sel = round.systems().board.selection();
  const first = sel && sel.r === a.row && sel.c === a.col ? a : sel && sel.r === b.row && sel.c === b.col ? b : null;
  const taps = first ? [] : [a];
  let last = first || a;
  for (let i = 0; i < n; i++) {
    last = last === a ? b : a;
    taps.push(last);
  }
  return press(round, taps);
}

function startPlay(round) {
  run(round, 520);
  press(round, [{ type: 'button', button: 'start' }]);
  run(round, 200);
}

test('开讲 button inside the 500 ms guard → ignored; after it → 150 ms fade, then play with gameTime 0', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  // Act
  press(r, [{ type: 'button', button: 'start' }]);
  const early = r.state();
  run(r, 520);
  press(r, [{ type: 'button', button: 'start' }]);
  const fading = r.overlay();
  press(r, [{ type: 'cell', row: 1, col: 1 }]);
  const tappedDuringFade = r.systems().board.selection();
  run(r, 160);
  // Assert
  assert.equal(early, 'open');
  assert.equal(fading, null);
  assert.equal(tappedDuringFade, null);
  assert.equal(r.state(), 'play');
});

test('10 s of game time with no moves → 吕布 does not charge; 4 misses (2 steps each) fill the 8-step bar → one attack, nothing added to a full board', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  const pressure = r.systems().pressure;
  // Act
  run(r, 10000);
  const idle = pressure.hud().steps;
  const events = misses(r, 4).concat(run(r, 100));
  // Assert
  assert.equal(idle, 0);
  assert.equal(pressure.hud().hearts, 2);
  assert.equal(pressure.hud().steps, 0);
  assert.equal(r.systems().board.occupied().length, 36);
  assert.ok(events.some((e) => e.type === 'hostAttack' && e.kind === 'normal'));
});

test('one pair cleared, then an attack → the 2 reinforcement pairs fill the 2 free cells as one pair', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  press(r, [{ type: 'cell', row: 5, col: 1 }, { type: 'cell', row: 5, col: 2 }]);
  // Act
  misses(r, 4);
  run(r, 100);
  // Assert
  assert.equal(r.systems().pressure.hud().hearts, 2);
  assert.equal(r.systems().board.occupied().length, 36);
});

test('pause card: 接着讲 at 300 ms ignored, at 600 ms accepted even though the pause token stops token timers', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  press(r, [{ type: 'pauseStamp' }]);
  // Act
  run(r, 300);
  press(r, [{ type: 'button', button: 'resume' }]);
  const stillPaused = r.overlay();
  run(r, 300);
  press(r, [{ type: 'button', button: 'resume' }]);
  // Assert
  assert.equal(stillPaused, 'pause');
  assert.equal(r.overlay(), null);
  assert.equal(r.boardLocked(), false);
});

test('pause card up → game clock and 吕布 charge do not move', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  run(r, 1000);
  const t0 = r.gameTime();
  const c0 = r.systems().pressure.charge();
  // Act
  press(r, [{ type: 'pauseStamp' }]);
  run(r, 3000);
  // Assert: the pause is taken in step ② of that frame, so not even that frame ticks
  assert.equal(r.gameTime(), t0);
  assert.equal(r.systems().pressure.charge(), c0);
});

test('two 刀 pairs → 关羽 ready; release → clock frozen 950 ms, then the bottom row is cut (3 pairs of damage)', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  press(r, [{ type: 'cell', row: 1, col: 1 }, { type: 'cell', row: 1, col: 2 }]);
  press(r, [{ type: 'cell', row: 1, col: 3 }, { type: 'cell', row: 1, col: 4 }]);
  const card = r.systems().skills.cards().find((c) => c.id === 'guan_yu');
  const hpBefore = r.systems().pressure.hud().hp;
  // Act
  press(r, [{ type: 'card', general: 'guan_yu' }]);
  const t0 = r.gameTime();
  run(r, 900);
  const frozen = r.gameTime();
  run(r, 100);
  // Assert
  assert.equal(card.state, 'ready');
  assert.equal(frozen, t0);
  assert.equal(r.systems().board.count('huo'), 0);
  assert.equal(r.systems().pressure.hud().hp, hpBefore - 3);
});

test('a tap that arrives on the last frame of a skill show → dropped, not replayed later', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  press(r, [{ type: 'cell', row: 1, col: 1 }, { type: 'cell', row: 1, col: 2 }]);
  press(r, [{ type: 'cell', row: 1, col: 3 }, { type: 'cell', row: 1, col: 4 }]);
  press(r, [{ type: 'card', general: 'guan_yu' }]);
  run(r, 944);
  // Act: this frame's tap arrives while the token is still held at frame start
  press(r, [{ type: 'cell', row: 1, col: 5 }]);
  run(r, 50);
  // Assert
  assert.equal(r.systems().board.selection(), null);
});

test('火 pair → 380 ms highlight with the clock stopped, then every 营 burns (4 pairs of damage)', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  const hp0 = r.systems().pressure.hud().hp;
  // Act
  const ev = press(r, [{ type: 'cell', row: 6, col: 5 }, { type: 'cell', row: 6, col: 6 }]);
  const t0 = r.gameTime();
  run(r, 360);
  const frozen = r.gameTime();
  run(r, 40);
  // Assert
  assert.ok(ev.some((e) => e.type === 'tokenStart' && e.reason === 'effect'));
  assert.equal(frozen, t0);
  assert.equal(r.systems().board.count('ying'), 0);
  assert.equal(r.systems().pressure.hud().hp, hp0 - 1 - 4);
});

test('a miss, then three matches in a row → the third pushes 吕布 back one step; a miss resets the combo', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  misses(r, 2);
  const before = r.systems().pressure.hud().steps;
  // Act
  press(r, [{ type: 'cell', row: 1, col: 1 }, { type: 'cell', row: 1, col: 2 }]);
  press(r, [{ type: 'cell', row: 1, col: 3 }, { type: 'cell', row: 1, col: 4 }]);
  const ev = press(r, [{ type: 'cell', row: 2, col: 1 }, { type: 'cell', row: 2, col: 2 }]);
  const after = r.systems().pressure.hud().steps;
  const comboAfter = r.systems().effects.combo();
  // Assert
  assert.equal(before, 4);
  assert.ok(ev.some((e) => e.type === 'interrupt' && e.cut === 1));
  assert.equal(after, before + 3 - 1);
  assert.equal(comboAfter, 3);
});

test('three attacks from misses → 城破 after the last show; lose card buttons honour the 500 ms guard', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  // Act: 3 × (4 misses, then the 600 ms attack show)
  for (let i = 0; i < 3; i++) {
    misses(r, 4);
    run(r, 700);
  }
  const endState = r.state();
  const result = r.result();
  const overlayAtEnd = r.overlay();
  r.endingDone();
  press(r, [{ type: 'button', button: 'retry' }]);
  run(r, 300);
  const early = r.drainEvents();
  const evs = run(r, 300).concat(press(r, [{ type: 'button', button: 'retry' }]));
  // Assert
  assert.equal(endState, 'end');
  assert.equal(result.win, false);
  assert.equal(result.reason, '城破');
  assert.deepEqual(result.metrics, { heartsLost: 3 });
  assert.equal(overlayAtEnd, null);
  assert.equal(r.overlay(), 'lose');
  assert.ok(!early.some((e) => e.type === 'exit'));
  assert.ok(evs.some((e) => e.type === 'exit' && e.to === 'retry'));
  assert.equal(r.settleOutcome().stars, 0);
});

test('a frame gap over 1 s during play → implicit background: resume card, clock unchanged', () => {
  // Arrange
  const r = makeRound(LAYOUT);
  startPlay(r);
  const t0 = r.gameTime();
  // Act
  r.frame(4000, []);
  run(r, 600);
  // Assert
  assert.equal(r.overlay(), 'resume');
  assert.equal(r.gameTime(), t0);
});

function findLinkable(board) {
  const occ = board.occupied();
  for (let i = 0; i < occ.length; i++) {
    for (let j = i + 1; j < occ.length; j++) {
      const a = occ[i];
      const b = occ[j];
      if (board.kindAt(a.r, a.c) === board.kindAt(b.r, b.c) && board.findPath(a, b)) return [a, b];
    }
  }
  return null;
}

// Slice experiment: 吕布 second phase (user request 2026-10-27, not in the GDD yet).
function twoPhaseChapter(hp1, hp2) {
  const ch = JSON.parse(JSON.stringify(CH));
  ch.boss.hp = hp1;
  ch.boss.phase2 = { hp: hp2, steps: 6, chargeMs: 8000, name: '暴怒吕布', shout: '吕布暴怒！', lines: ['挡我者死！'] };
  return ch;
}

test('phase-1 hp runs out → no win; next frame refills the board, hp and charge reset, a phase show holds the clock', () => {
  // Arrange
  const r = makeRound(LAYOUT, twoPhaseChapter(3, 18));
  startPlay(r);
  run(r, 2000);
  // Act: three easy pairs on the top row
  press(r, [{ type: 'cell', row: 1, col: 1 }, { type: 'cell', row: 1, col: 2 }]);
  press(r, [{ type: 'cell', row: 1, col: 3 }, { type: 'cell', row: 1, col: 4 }]);
  const ev = press(r, [{ type: 'cell', row: 1, col: 5 }, { type: 'cell', row: 1, col: 6 }]);
  const stateAfterLastHit = r.state();
  const ev2 = press(r, []);
  const hud = r.systems().pressure.hud();
  const clock = r.gameTime();
  run(r, 1000);
  const clockDuringShow = r.gameTime();
  // Assert
  assert.ok(!ev.some((e) => e.type === 'state' && e.to === 'end'));
  assert.equal(stateAfterLastHit, 'play');
  assert.ok(ev.concat(ev2).some((e) => e.type === 'bossPhase' && e.phase === 2));
  assert.equal(r.systems().board.occupied().length, 36);
  assert.equal(hud.phase, 2);
  assert.equal(hud.hp, 18);
  assert.equal(hud.hpMax, 18);
  assert.equal(hud.steps, 0);
  assert.equal(hud.stepsMax, 6);
  assert.equal(clockDuringShow, clock);
  assert.equal(r.result(), null);
});

test('phase 2 → the first attack (6 steps) is a special: 画戟横扫 costs no heart; its hp running out wins', () => {
  // Arrange
  const r = makeRound(LAYOUT, twoPhaseChapter(1, 2));
  startPlay(r);
  press(r, [{ type: 'cell', row: 1, col: 1 }, { type: 'cell', row: 1, col: 2 }]);
  run(r, 1600);
  const p = r.systems().pressure;
  const before = p.hud().steps;
  // Act
  const pair = findLinkable(r.systems().board);
  press(r, [{ type: 'cell', row: pair[0].r, col: pair[0].c }, { type: 'cell', row: pair[1].r, col: pair[1].c }]);
  const forecastAt1 = p.hud().forecast;
  p.onMiss(); p.onMiss();
  const forecastAt5 = p.hud().forecast;
  p.onMiss();
  const evs = run(r, 100);
  const hearts = p.hud().hearts;
  p.onMatch();
  // Assert
  assert.equal(before, 0);
  assert.equal(forecastAt1, null);
  assert.deepEqual(forecastAt5, { id: 'sweep', name: '画戟横扫', broken: false });
  assert.ok(evs.some((e) => e.type === 'hostAttack' && e.kind === 'special' && e.special === 'sweep'));
  assert.equal(hearts, 3);
  assert.deepEqual(p.outcome(), { result: 'win', reason: null });
});

// Slice v5 (DESIGN-v5.md): generals' jobs and 吕布's specials, on the pressure system alone.
function pressureOnly(cards) {
  const ch = JSON.parse(JSON.stringify(CH));
  ch.boss.hp = 1;
  const board = createBoard(ch, { seed: 3 });
  const events = [];
  const tokens = [];
  const p = createPressure({
    chapter: ch, board, emit: (e) => events.push(e),
    acquire: (reason, ms, onEnd, detail) => { const t = { reason, detail }; tokens.push(t); return t; },
    release: () => {},
  });
  p.bindSkills({ cards: () => cards || [] });
  return { p, board, events, tokens };
}

function attackNow(p, n) {
  for (let i = 0; i < n; i++) p.onMiss();
  return p.tick();
}

test('赵云 shield up → the next attack is blocked: no heart lost, shield spent', () => {
  // Arrange
  const { p, events } = pressureOnly();
  p.raiseShield();
  // Act
  attackNow(p, 4);
  // Assert
  assert.equal(p.hud().hearts, 3);
  assert.equal(p.hud().shield, false);
  assert.ok(events.some((e) => e.type === 'hostAttack' && e.kind === 'blocked'));
});

test('张飞 at 4 steps → back to 1 and stunned 3: the next 2 misses (4 steps) leave him at 2', () => {
  // Arrange
  const { p } = pressureOnly();
  p.onMiss(); p.onMiss();
  // Act
  p.roarBack();
  const after = p.hud();
  p.onMiss(); p.onMiss();
  // Assert
  assert.equal(after.steps, 1);
  assert.equal(after.stun, 3);
  assert.equal(p.hud().steps, 2);
  assert.equal(p.hud().stun, 0);
});

test('phase 2 rotation → 画戟横扫, normal, 赤兔冲阵 (2 barricades), normal, 虎啸 seals the nearest-ready general for 3 steps', () => {
  // Arrange
  const cards = [{ id: 'guan_yu', charge: 1, need: 2 }, { id: 'zhuge_liang', charge: 3, need: 4 }];
  const { p, board, events } = pressureOnly(cards);
  p.onMatch();
  p.tick(); // enter phase 2 (6 steps)
  for (let c = 1; c <= 3; c++) if (board.kindAt(1, c)) board.clearKind(board.kindAt(1, c), 'test'); // room for reinforcements and barricades
  // Act: five attacks
  for (let i = 0; i < 5; i++) attackNow(p, 3);
  const kinds = events.filter((e) => e.type === 'hostAttack').map((e) => e.special || e.kind);
  const sealedNow = p.sealed('zhuge_liang');
  p.onMiss(); p.onMiss();
  // Assert
  assert.deepEqual(kinds, ['sweep', 'normal', 'charge', 'normal', 'roar']);
  assert.equal(board.blocks().length, 2);
  assert.equal(p.hud().hearts, 1);
  assert.equal(sealedNow, 3);
  assert.equal(p.sealed('zhuge_liang'), 0);
  assert.ok(events.some((e) => e.type === 'unseal' && e.general === 'zhuge_liang'));
});

test('诸葛亮 breaks the coming special → it fizzles (no shuffle), the rotation moves on', () => {
  // Arrange
  const { p, events } = pressureOnly();
  p.onMatch();
  p.tick();
  // Act
  const broke = p.breakSpecial();
  attackNow(p, 3);
  // Assert
  assert.equal(broke, true);
  assert.ok(events.some((e) => e.type === 'hostAttack' && e.kind === 'broken' && e.special === 'sweep'));
  assert.ok(!events.some((e) => e.type === 'hostAttack' && e.kind === 'special'));
});
