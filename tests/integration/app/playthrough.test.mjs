// Scripted playthrough of the assembled game (src/app/round-factory.mjs, the same
// factory src/main.mjs uses): real chapter data, loader, progress-save over an
// in-memory port, real board / pressure / effects / skills. Fixed seeds and
// scripted taps only, so every run is identical. No DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER_DATA } from '../../../src/data/chapters.mjs';
import { loadChapters } from '../../../src/rules/chapter-loader.mjs';
import { createProgress } from '../../../src/rules/progress-save.mjs';
import { createRoundFactory } from '../../../src/app/round-factory.mjs';
import { playablePairs } from '../../helpers/autoplay.mjs';
import { fakeStorage } from '../../helpers/progress-save-fakes.mjs';

const FRAME_MS = 16;
const MAX_FRAMES = 60000;

function setup() {
  const book = loadChapters(CHAPTER_DATA, { dev: false, slow: false });
  assert.deepEqual(book.rejected, []);
  const progress = createProgress({ storage: fakeStorage().port, chapters: book.chapters, now: () => 0, unlock: 'all' });
  progress.boot();
  const factory = createRoundFactory({ book, progress });
  return { book, progress, factory };
}

// Plays one round. `policy` is 'play' (skills first, then the first playable
// pair) or 'idle' (only taps the start button) or 'miss' (taps two units of
// different kinds every frame it can).
function playRound(env, chapterId, seed, policy, pickSlots) {
  const chapter = env.book.chapters.find((c) => c.id === chapterId);
  const round = env.factory.newRound({ chapter, seed, attempt: 1, hasNext: true, slots: null });
  const picker = env.factory.picker();
  const events = [];
  // Optional picker taps on the open card (0-based slots).
  let pending = pickSlots ? pickSlots.slice() : [];
  let frames = 0;
  while (round.state() === 'open' && frames < 400) {
    frames++;
    const intents = pending.length > 0 ? [pending[0]] : [{ type: 'button', button: 'start' }];
    const before = JSON.stringify([picker.slots(), picker.expanded()]);
    round.frame(FRAME_MS, intents);
    if (pending.length > 0 && JSON.stringify([picker.slots(), picker.expanded()]) !== before) pending.shift();
    for (const e of round.drainEvents()) events.push(e);
  }
  assert.notEqual(round.state(), 'open', chapterId + ': 开讲 never went through');
  let skillTaps = 0;
  while (round.state() !== 'settle' && frames < MAX_FRAMES) {
    frames++;
    const intents = [];
    const sys = round.systems();
    if (round.state() === 'play' && !round.boardLocked() && policy !== 'idle') {
      const board = sys.board;
      if (round.selecting()) {
        const byRow = round.selecting() === 'row';
        const n = byRow ? board.rows : board.cols;
        for (let i = 1; i <= n; i++) {
          if (byRow ? sys.skills.rowSelectable(i) : sys.skills.colSelectable(i)) {
            intents.push(byRow ? { type: 'cell', row: i, col: 1 } : { type: 'cell', row: 1, col: i });
            break;
          }
        }
      } else {
        const ready = policy === 'play' ? sys.skills.cards().find((c) => c.state === 'ready' && c.hint === null) : null;
        if (ready) {
          skillTaps++;
          intents.push({ type: 'card', general: ready.general });
        } else if (policy === 'play') {
          const pair = playablePairs(board)[0];
          if (pair) intents.push({ type: 'cell', row: pair[0].r, col: pair[0].c }, { type: 'cell', row: pair[1].r, col: pair[1].c });
        } else if (policy === 'miss') {
          // A same-kind pair no path connects is a miss; with none on the board, match the first pair.
          const pair = unlinkedPair(board) || playablePairs(board)[0];
          if (pair) intents.push({ type: 'cell', row: pair[0].r, col: pair[0].c }, { type: 'cell', row: pair[1].r, col: pair[1].c });
        }
      }
    }
    round.frame(FRAME_MS, intents);
    for (const e of round.drainEvents()) events.push(e);
    if (round.state() === 'end') round.endingDone();
  }
  assert.equal(round.state(), 'settle', chapterId + ': no outcome within ' + MAX_FRAMES + ' frames');
  return { round, events, skillTaps, picker };
}

// The first same-kind top-layer pair that findPath cannot connect, or null.
function unlinkedPair(board) {
  const cells = board.cells().filter((c) => typeof c.top === 'string' && c.top.length > 0 && c.top !== 'jm');
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].top === cells[j].top && board.findPath(cells[i], cells[j]) === null) return [cells[i], cells[j]];
    }
  }
  return null;
}

const count = (events, type) => events.filter((e) => e.type === type).length;

test('ch01 (press): playing wins; every wave is pushed and a general fires', () => {
  const env = setup();
  const { round, events } = playRound(env, 'ch01', 101, 'play');
  const res = round.result();
  assert.equal(res.win, true);
  assert.equal(res.mode, 'press');
  assert.ok(count(events, 'push') >= 1, 'pushes happened');
  assert.ok(count(events, 'lastWave') === 1, 'last wave announced');
  assert.ok(res.skillsUsed.guan_yu >= 1, 'Guan Yu cut a row at least once');
  assert.ok(events.some((e) => e.type === 'tokenStart' && e.reason === 'skill'));
  assert.equal(round.settleOutcome().saved !== false, true);
});

test('ch01 (press): never tapping loses to 破城', () => {
  const env = setup();
  const { round, events } = playRound(env, 'ch01', 101, 'idle');
  assert.equal(round.result().win, false);
  assert.equal(round.result().reason, '破城');
  assert.ok(count(events, 'push') >= 1);
  assert.deepEqual(round.exits(), ['retry', 'catalog']);
});

test('ch02 (boss): playing wins; the boss charges, skills fire and charge reads from real cards', () => {
  const env = setup();
  const { round, events } = playRound(env, 'ch02', 202, 'play');
  const res = round.result();
  assert.equal(res.win, true);
  assert.equal(res.mode, 'boss');
  const pressure = round.systems().pressure;
  assert.equal(pressure.hud().mode, 'boss');
  const used = Object.keys(res.skillsUsed).reduce((n, id) => n + res.skillsUsed[id], 0);
  assert.ok(used >= 1, 'at least one skill fired: ' + JSON.stringify(res.skillsUsed));
  assert.ok(count(events, 'skillReady') >= 1);
  assert.deepEqual(round.exits(), ['next', 'retry', 'catalog']);
});

test('ch02 (boss): only missing walks the steps until the hearts run out (城破)', () => {
  const env = setup();
  const { round, events } = playRound(env, 'ch02', 202, 'miss');
  assert.equal(round.result().win, false);
  assert.equal(round.result().reason, '城破');
  assert.ok(count(events, 'hostAttack') >= 3, 'three normal attacks');
  assert.equal(round.systems().pressure.hud().hearts, 0);
});

test('ch04 (food): playing wins with Liu Bei and Guan Yu fielded; skills fire', () => {
  const env = setup();
  const { round, events } = playRound(env, 'ch04', 404, 'play');
  const res = round.result();
  assert.equal(res.win, true);
  assert.equal(res.mode, 'food');
  assert.equal(res.loadout[0], 'liu_bei');
  const used = Object.keys(res.skillsUsed).reduce((n, id) => n + res.skillsUsed[id], 0);
  assert.ok(used >= 1, 'at least one skill fired: ' + JSON.stringify(res.skillsUsed));
  assert.ok(count(events, 'foodSpent') >= 1);
  assert.ok(round.systems().pressure.hud().food >= 0);
});

test('ch04 (food): missing burns the food to 粮草断绝', () => {
  const env = setup();
  const { round } = playRound(env, 'ch04', 404, 'miss');
  assert.equal(round.result().win, false);
  assert.equal(round.result().reason, '粮草断绝');
  assert.equal(round.systems().pressure.hud().food, 0);
});

test('picker on a 3-slot chapter: clear slot 2, open it, pick another general; the loadout follows', () => {
  const env = setup();
  // Win ch01-ch04 first: their unlocks give ch05 more generals than slots.
  for (const id of ['ch01', 'ch02', 'ch03', 'ch04']) assert.equal(playRound(env, id, 7, 'play').round.result().win, true, id);
  const chapter = env.book.chapters.find((c) => c.id === 'ch05');
  const probe = env.factory.newRound({ chapter, seed: 5, attempt: 1, hasNext: true, slots: null });
  const picker = env.factory.picker();
  assert.equal(probe.state(), 'open');
  assert.equal(picker.showPicker(), true, 'unlock all: more generals than slots');
  const before = picker.slots();
  const choice = picker.choices()[0];
  assert.ok(choice, 'a general to pick');
  const { round } = playRound(env, 'ch05', 5, 'miss', [
    { type: 'button', button: 'clear', slot: 2 },
    { type: 'button', button: 'slot', slot: 2 },
    { type: 'button', button: 'pick', general: choice },
  ]);
  assert.equal(round.result().loadout[0], before[0]);
  assert.equal(round.result().loadout[2], choice);
});

// --- deeper stacks (chapter-design rule 13 stackDepth; user decision 2026-10-30) ---

const deckSum = (deck) => Object.keys(deck).reduce((n, k) => n + deck[k], 0);
test('stacked chapters ch05 / ch07 / ch09 / ch10: the deal fits stackDepth, buries the rest, and playing settles a win', () => {
  const env = setup();
  for (const [id, seed] of [['ch05', 505], ['ch07', 707], ['ch09', 909], ['ch10', 1010]]) {
    const chapter = env.book.chapters.find((c) => c.id === id);
    const probe = env.factory.newRound({ chapter, seed, attempt: 1, hasNext: true, slots: null });
    const board = probe.systems().board;
    assert.ok(board.cells().every((c) => c.under.length <= chapter.stackDepth), id + ' depth within stackDepth');
    assert.equal(board.buriedCount(), deckSum(chapter.deck) - chapter.rows * chapter.cols, id + ' buried count');
    const { round } = playRound(env, id, seed, 'play');
    assert.equal(round.result().win, true, id);
  }
});

test('round factory deals each chapter with its own stackDepth', () => {
  const env = setup();
  for (const id of ['ch05', 'ch09', 'ch10']) {
    const chapter = env.book.chapters.find((c) => c.id === id);
    const round = env.factory.newRound({ chapter, seed: 1, attempt: 1, hasNext: true, slots: null });
    assert.equal(round.systems().board.stackDepth(), chapter.stackDepth, id);
  }
});
