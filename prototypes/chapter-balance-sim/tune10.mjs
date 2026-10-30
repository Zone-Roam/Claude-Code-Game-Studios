// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 第十回步数 7 / 6 时，二阶段血量减到多少，连错两成用技能的胜率约 60%
// Date: 2026-10-30

// Usage: node tune10.mjs [games per cell, default 200]
import { runCell } from './sim.mjs';
import { loadChapters } from './src/rules/chapter-loader.mjs';
import { CHAPTERS, ENEMIES } from './src/data/chapters.mjs';

const N = process.argv[2] ? Number(process.argv[2]) : 200;
const base = CHAPTERS.find((c) => c.id === 'ch10');

console.log('| hp | 步数 | 连错 0.1 用 | 连错 0.2 用 | 连错 0.3 用 | 连错 0.2 不用 | 0.2 用：3★ / 2★ / 1★ / 输 |');
console.log('|---|---|---|---|---|---|---|');
for (const [hp1, hp2] of [[16, 24], [16, 20], [16, 18], [14, 18], [14, 16]]) {
  const c = JSON.parse(JSON.stringify(base));
  c.boss.steps = 7; c.boss.hp = hp1;
  c.boss.phase2.steps = 6; c.boss.phase2.hp = hp2;
  const out = loadChapters({ chapters: [c], enemies: ENEMIES }, { slow: false });
  if (out.rejected.length) throw new Error('rejected: ' + JSON.stringify(out.rejected));
  const ch = out.chapters[0];
  const pct = (a) => Math.round((100 * a.wins) / a.games) + '%';
  const a1 = runCell(ch, 0.1, true, N), a2 = runCell(ch, 0.2, true, N), a3 = runCell(ch, 0.3, true, N);
  const b2 = runCell(ch, 0.2, false, N);
  const st = [3, 2, 1, 0].map((k) => Math.round((100 * a2.stars[k]) / a2.games) + '%').join(' / ');
  console.log(`| ${hp1} + ${hp2} | 7 / 6 | ${pct(a1)} | ${pct(a2)} | ${pct(a3)} | ${pct(b2)} | ${st} |`);
}
