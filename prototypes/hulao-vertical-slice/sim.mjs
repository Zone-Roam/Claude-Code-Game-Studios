// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Headless difficulty probe. Slice v5 (DESIGN-v5.md): the enemy charges by moves, so pace no longer
// matters; what matters is how often the player misses and whether they use the generals well.
// The bot always finds a connectable pair (the first one it scans) and misses at the given rate.
// Usage: node sim.mjs [steps1 steps2]  — optional overrides of the phase-1 / phase-2 bar length.
// It is an upper bound for a player at that miss rate, not a model of a real player.

import { createRound } from './src/rules/round-flow.mjs';
import { createBoard } from './src/rules/board-link.mjs';
import { createPressure } from './src/rules/battle-pressure.mjs';
import { createEffects } from './src/rules/clear-effects.mjs';
import { createSkills } from './src/rules/general-skills.mjs';
import { createProgress } from './src/rules/progress-save.mjs';
import { loadChapters } from './src/rules/chapter-loader.mjs';
import { hash32 } from './src/core/rng.mjs';
import { CHAPTERS, ENEMIES } from './src/data/chapter01.mjs';

const SYSTEMS = { createBoard, createPressure, createEffects, createSkills };
const STEPS1 = process.argv[2] ? Number(process.argv[2]) : null;
const STEPS2 = process.argv[3] ? Number(process.argv[3]) : null;

function findPair(board, preferKind) {
  const occ = board.occupied();
  let any = null;
  for (let i = 0; i < occ.length; i++) {
    for (let j = i + 1; j < occ.length; j++) {
      const p = occ[i];
      const q = occ[j];
      const k = board.kindAt(p.r, p.c);
      if (k !== board.kindAt(q.r, q.c) || !board.findPath(p, q)) continue;
      if (k === preferKind) return [p, q];
      if (!any) any = [p, q];
    }
  }
  return any;
}

function findMiss(board) {
  const occ = board.occupied();
  for (let i = 0; i < occ.length; i++) {
    for (let j = i + 1; j < occ.length; j++) {
      const p = occ[i];
      const q = occ[j];
      if (board.kindAt(p.r, p.c) === board.kindAt(q.r, q.c) && !board.findPath(p, q)) return [p, q];
    }
  }
  return null;
}

function wantSkill(card, h) {
  const near = h.stepsMax - h.steps <= 2;
  if (card.id === 'guan_yu') return true;
  if (card.id === 'zhuge_liang') return h.phase === 1 || !!(h.forecast && !h.forecast.broken);
  if (card.id === 'zhang_fei') return near;
  if (card.id === 'zhao_yun') return near && !h.shield;
  return false;
}

function playOne(chapter, seed, missRate, useSkills) {
  const round = createRound({ chapter, seed, progress: createProgress(), systems: SYSTEMS });
  const step = (intents) => { round.frame(16, intents || []); round.drainEvents(); };
  for (let t = 0; t < 600; t += 16) step();
  step([{ type: 'button', button: 'start' }]);
  for (let t = 0; t < 200; t += 16) step();
  let rollIndex = 0;
  let guard = 0;
  while (round.state() === 'play' && guard++ < 200000) {
    if (round.boardLocked()) { step(); continue; }
    const s = round.systems();
    const h = s.pressure.hud();
    const ready = useSkills ? s.skills.cards().find((c) => c.state === 'ready' && wantSkill(c, h)) : null;
    if (ready) {
      step([{ type: 'card', general: ready.id }]);
      continue;
    }
    rollIndex++;
    const miss = missRate > 0 && (hash32(seed, rollIndex) % 1000) / 1000 < missRate ? findMiss(s.board) : null;
    const pr = miss || findPair(s.board, 'huo');
    if (!pr) { step(); continue; }
    step([{ type: 'cell', row: pr[0].r, col: pr[0].c }, { type: 'cell', row: pr[1].r, col: pr[1].c }]);
    if (miss) step([{ type: 'cell', row: pr[1].r, col: pr[1].c }]);
    step();
  }
  const res = round.result();
  return { win: !!(res && res.win), lost: res ? res.metrics.heartsLost : 3 };
}

for (const slow of [false, true]) {
  const chapter = loadChapters({ chapters: CHAPTERS, enemies: ENEMIES }, { slow }).chapters[0];
  if (STEPS1) chapter.boss.steps = slow ? Math.round(STEPS1 * 1.5) : STEPS1;
  if (STEPS2) chapter.boss.phase2.steps = slow ? Math.round(STEPS2 * 1.5) : STEPS2;
  console.log(`
${slow ? 'slow=1' : 'default'}  steps ${chapter.boss.steps} / ${chapter.boss.phase2.steps}`);
  console.log('miss rate | win% with skills (hearts lost) | win% without skills (hearts lost)');
  for (const missRate of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
    const cols = [];
    for (const useSkills of [true, false]) {
      let wins = 0;
      let lost = 0;
      const N = 40;
      for (let i = 1; i <= N; i++) {
        const r = playOne(chapter, hash32('sim', i), missRate, useSkills);
        if (r.win) { wins++; lost += r.lost; }
      }
      cols.push(`${String(Math.round((wins / N) * 100)).padStart(4)}% (${wins ? (lost / wins).toFixed(1) : '-'})`);
    }
    console.log(`${String(missRate).padEnd(9)} | ${cols[0].padEnd(30)} | ${cols[1]}`);
  }
}
