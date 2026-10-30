// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 压境回（第 1、6、8 回）的下压间隔放宽到多少，每步 4 秒、连错两成用技能时胜率约 60%
// Date: 2026-10-30

// Usage: node tunepress.mjs [games per cell, default 100]
import { runPF } from './sim-press-food.mjs';
import { loadChapters } from './src/rules/chapter-loader.mjs';
import { CHAPTERS, ENEMIES } from './src/data/chapters.mjs';

const N = process.argv[2] ? Number(process.argv[2]) : 100;
const SWEEP = {
  // [interval, waves or null, slow]; the loader caps interval at 12000 (battle-pressure), slow multiplies it by 1.3
  // Above 12000 is outside the legal range: loaded at 12000, then overridden, to see how far it would have to go.
  // Fewer waves changes nothing: with 5 columns startRows is locked at 4 (3 or 5 rows is an odd tile count),
  // and every loss lands on push 4–5, before the later waves exist.
  ch01: [[10000, null], [11000, null], [12000, null], [10000, null, true], [12000, null, true]],
  ch06: [[8000, null], [10000, null], [11000, null], [12000, null], [13000, null], [14000, null], [10000, null, true], [12000, null, true]],
  ch08: [[7000, null], [10000, null], [11000, null], [12000, null], [13000, null], [14000, null], [15000, null], [10000, null, true], [12000, null, true]],
};

const pct = (a) => Math.round((100 * a.wins) / a.games) + '%';
console.log(`# 压境间隔扫描（每格 ${N} 局，用技能）\n`);
console.log('| 回 | interval / waves | t=3 连错 0.2 | t=4 连错 0 | t=4 连错 0.2 | t=5 连错 0 | t=5 连错 0.2 | t=4 · 0.2 不用技能 |');
console.log('|---|---|---|---|---|---|---|---|');
for (const id of Object.keys(SWEEP)) {
  const base = CHAPTERS.find((c) => c.id === id);
  for (const [interval, waves, slow] of SWEEP[id]) {
    const c = JSON.parse(JSON.stringify(base));
    c.press.interval = Math.min(interval, 12000);
    if (waves) c.press.waves = waves;
    const out = loadChapters({ chapters: [c], enemies: ENEMIES }, { slow: !!slow });
    if (out.rejected.length) throw new Error('rejected: ' + JSON.stringify(out.rejected));
    const ch = out.chapters[0];
    if (interval > 12000) ch.press.interval = interval;
    const run = (t, m, sk) => pct(runPF(ch, { stepSec: t, missRate: m, useSkills: sk, prefer: 'huo' }, N));
    console.log(`| ${id} | ${interval}${interval > 12000 ? '（超出范围）' : ''} / ${ch.press.waves}${slow ? `（慢速档，实际 ${ch.press.interval}）` : ''} | ${run(3, 0.2, true)} | ${run(4, 0, true)} | ${run(4, 0.2, true)} | ${run(5, 0, true)} | ${run(5, 0.2, true)} | ${run(4, 0.2, false)} |`);
  }
}
