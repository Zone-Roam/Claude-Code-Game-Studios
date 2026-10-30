// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 2026-10-30 用户决定“往后逐步加深”（第 3–4 回每格最多压 1 张、5–7 回 2 张、8–10 回 3 张），
// 第 5、7、9、10 回加大牌组让深叠真的出现后，胜率和局长仍在原值 ±15% 左右。
// Date: 2026-10-30
//
// Before = current deck, stackDepth 1. After = candidate deck + the chapter's new stackDepth.
// Boss chapters: sim.mjs playOne (steps = matches + 2 x misses). Food chapters: sim-press-food.mjs
// playPF, "会玩" (prefers 火), moves = matches + misses. Skills on. Same seeds hash32('sim', 1..N).
//
// Usage: node stackdepth.mjs [games per cell, default 200]

import { loadChapters } from './src/rules/chapter-loader.mjs';
import { createBoard } from './src/rules/board-link.mjs';
import { CHAPTERS, ENEMIES } from './src/data/chapters.mjs';
import { playOne } from './sim.mjs';
import { playPF } from './sim-press-food.mjs';
import { hash32 } from './src/core/rng.mjs';

const N = process.argv[2] ? Number(process.argv[2]) : 200;
const MISS = [0.1, 0.2, 0.3];

/** Decks before the 2026-10-30 change (stackDepth 1), for the "原" rows. */
export const BEFORE = {
  ch05: { gu: 8, dao: 6, dun: 6, qi: 6, jiu: 6, ying: 6, gong: 6 }, // 44
  ch07: { huo: 2, ying: 10, shu: 8, dao: 6, gu: 6, jiu: 8, qi: 4 }, // 44
  ch09: { huo: 2, ying: 10, shu: 8, dao: 6, dun: 6, gong: 6, qi: 6, jiu: 8 }, // 52
  ch10: { gong: 8, ma: 2, shu: 8, dun: 6, huo: 2, ying: 8, dao: 6, qi: 6, jiu: 6, gu: 4 }, // 56
};

/** Adopted decks (kept even per kind), now also in src/data/chapters.mjs. */
export const PLAN = {
  ch05: { stackDepth: 2, deck: { gu: 8, dao: 8, dun: 8, qi: 8, jiu: 8, ying: 8, gong: 8 } }, // 44 -> 56
  ch07: { stackDepth: 2, deck: { huo: 2, ying: 12, shu: 8, dao: 8, gu: 6, jiu: 8, qi: 6 } }, // 44 -> 50
  ch09: { stackDepth: 3, deck: { huo: 2, ying: 12, shu: 10, dao: 8, dun: 8, gong: 8, qi: 8, jiu: 10 } }, // 52 -> 66
  ch10: { stackDepth: 3, deck: { gong: 10, ma: 2, shu: 10, dun: 8, huo: 2, ying: 10, dao: 8, qi: 8, jiu: 8, gu: 6 } }, // 56 -> 72
};

function load(ch) {
  const out = loadChapters({ chapters: [ch], enemies: ENEMIES }, { slow: false });
  if (out.rejected.length) throw new Error('rejected: ' + JSON.stringify(out.rejected));
  return out.chapters[0];
}

const sum = (deck) => Object.values(deck).reduce((a, b) => a + b, 0);

// Average depth histogram right after the deal (cells with 0 / 1 / 2 / 3 buried).
function depthHist(ch) {
  const h = [0, 0, 0, 0];
  for (let i = 1; i <= N; i++) {
    const b = createBoard(ch, { seed: hash32('sim', i) });
    for (let r = 1; r <= ch.rows; r++) {
      for (let c = 1; c <= ch.cols; c++) {
        h[b.depthAt(r, c)]++;
      }
    }
  }
  return h.map((n) => (n / N).toFixed(1)).join(' / ');
}

function run(ch, miss) {
  let wins = 0;
  let len = 0;
  for (let i = 1; i <= N; i++) {
    if (ch.mode === 'boss') {
      const r = playOne(ch, hash32('sim', i), miss, true);
      if (r.win) wins++;
      len += r.steps;
    } else {
      const r = playPF(ch, hash32('sim', i), { missRate: miss, useSkills: true, prefer: 'huo' });
      if (r.win) wins++;
      len += r.matches + r.misses;
    }
  }
  return { win: wins / N, len: len / N };
}

const pct = (x) => Math.round(100 * x) + '%';
console.log(`# stackDepth 加深前后（每格 ${N} 局，用技能）\n`);
console.log('| 回 | 版本 | stackDepth | 牌组 | 压牌深度 0/1/2/3（每局格数） | ' + MISS.map((m) => `连错 ${m} 胜率 / 局长`).join(' | ') + ' |');
console.log('|---|---|---|---|---|' + MISS.map(() => '---').join('|') + '|');
// STACKDEPTH_PLAN='{"ch07": {...}}' tries other candidates; STACKDEPTH_ONLY=ch07 runs one chapter.
const plan = process.env.STACKDEPTH_PLAN ? Object.assign({}, PLAN, JSON.parse(process.env.STACKDEPTH_PLAN)) : PLAN;
for (const id of Object.keys(plan)) {
  if (process.env.STACKDEPTH_ONLY && process.env.STACKDEPTH_ONLY.split(',').indexOf(id) < 0) continue;
  const src = CHAPTERS.find((c) => c.id === id);
  const before = load(Object.assign(JSON.parse(JSON.stringify(src)), { stackDepth: 1, deck: BEFORE[id] }));
  const after = load(Object.assign(JSON.parse(JSON.stringify(src)), plan[id]));
  for (const [lab, ch] of [['原', before], ['新', after]]) {
    const cells = MISS.map((m) => { const r = run(ch, m); return `${pct(r.win)} / ${r.len.toFixed(1)}`; });
    console.log(`| ${id} | ${lab} | ${ch.stackDepth || 1} | ${sum(ch.deck)} | ${depthHist(ch)} | ${cells.join(' | ')} |`);
  }
}
