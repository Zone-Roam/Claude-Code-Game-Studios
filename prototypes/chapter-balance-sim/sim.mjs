// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// Headless balance run for the release's boss chapters 2, 3, 5, 9, 10 (chapter-design rule 13).
//
// BOT STRATEGY (an upper bound for a player at a given miss rate, not a model of a real player)
// - Sees every connectable pair at once. Each move it rolls the miss rate (fixed hash stream per seed):
//   on a "miss" roll it taps the first same-kind pair that cannot be linked (2 steps); if no such pair exists
//   the roll is wasted and it plays a normal pair instead (so the realised miss rate is reported separately).
//   A normal move takes the first linkable pair in row-major scan, preferring 火 (as the slice bot did).
//   It never holds 火 for 铁索连环, never avoids 马 to protect 弓: it has no plan.
// - Skills (only in the "skills on" runs), checked before every move, first ready card in lineup order:
//   关羽: released as soon as ready, on the row with the most top tiles + buried tiles + 拒马.
//   黄忠: same, on the column with the most.
//   张飞: when the enemy is ≤ 2 steps from attacking.
//   赵云: when the enemy is ≤ 2 steps from attacking and there is no shield.
//   诸葛亮: as soon as ready.
//   刘备: when a heart is lost, or a teammate is exactly one pair short.
//
// Usage: node sim.mjs [games per cell, default 100]

import { createRound } from './src/rules/round-flow.mjs';
import { createBoard } from './src/rules/board-link.mjs';
import { createPressure } from './src/rules/battle-pressure.mjs';
import { createEffects } from './src/rules/clear-effects.mjs';
import { createSkills } from './src/rules/general-skills.mjs';
import { createProgress } from './src/rules/progress-save.mjs';
import { loadChapters } from './src/rules/chapter-loader.mjs';
import { hash32 } from './src/core/rng.mjs';
import { CHAPTERS, ENEMIES } from './src/data/chapters.mjs';

const SYSTEMS = { createBoard, createPressure, createEffects, createSkills };
const N = process.argv[2] ? Number(process.argv[2]) : 100;
const MISS_RATES = [0, 0.1, 0.2, 0.3];

export function findPair(board, preferKind) {
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

function lineScore(x) {
  return x.tiles.length + x.buried.length + x.blocks.length;
}

/** The bot's best row (Guan Yu) or column (Huang Zhong): most top + buried + barricades; first wins ties. */
export function bestLine(board, byRow) {
  let best = null;
  let bestScore = 0;
  const n = byRow ? board.rows : board.cols;
  for (let i = 1; i <= n; i++) {
    const s = lineScore(byRow ? board.rowContents(i) : board.colContents(i));
    if (s > bestScore) { best = i; bestScore = s; }
  }
  return best;
}

function wantSkill(card, h, cards) {
  const near = h.stepsMax - h.steps <= 2;
  if (card.id === 'guan_yu' || card.id === 'huang_zhong' || card.id === 'zhuge_liang') return true;
  if (card.id === 'zhang_fei') return near;
  if (card.id === 'zhao_yun') return near && !h.shield;
  if (card.id === 'liu_bei') return h.hearts < h.heartsMax || cards.some((c) => c.id !== 'liu_bei' && c.need - c.charge === 1);
  return false;
}

export function playOne(chapter, seed, missRate, useSkills) {
  const round = createRound({ chapter, seed, progress: createProgress(), systems: SYSTEMS });
  let matches = 0;
  let misses = 0;
  let attempts = 0;
  let reshuffles = 0;
  let barBreaks = 0;
  let wipes = 0;
  const step = (dt, intents) => {
    round.frame(dt, intents || []);
    for (const e of round.drainEvents()) {
      if (e.type === 'match') matches++;
      else if (e.type === 'miss') misses++;
      else if (e.type === 'reshuffle') { reshuffles++; if (e.blocksBroken) barBreaks++; }
      else if (e.type === 'clear' && e.source === 'reshuffle') wipes++;
    }
  };
  for (let t = 0; t < 600; t += 16) step(16);
  step(16, [{ type: 'button', button: 'start' }]);
  for (let t = 0; t < 200; t += 16) step(16);
  let rollIndex = 0;
  let guard = 0;
  while (round.state() === 'play' && guard++ < 20000) {
    if (round.boardLocked()) { step(100); continue; }
    const s = round.systems();
    const h = s.pressure.hud();
    if (useSkills) {
      const cards = s.skills.cards();
      const ready = cards.find((c) => c.state === 'ready' && wantSkill(c, h, cards));
      if (ready) {
        const it = { type: 'card', general: ready.id };
        if (ready.id === 'guan_yu') it.row = bestLine(s.board, true);
        if (ready.id === 'huang_zhong') it.col = bestLine(s.board, false);
        const before = s.skills.skillsUsed()[ready.id];
        step(16, [it]);
        if (s.skills.skillsUsed()[ready.id] > before) continue;
      }
    }
    rollIndex++;
    attempts++;
    const roll = missRate > 0 && (hash32(seed, 'miss', rollIndex) % 1000) / 1000 < missRate;
    const miss = roll ? findMiss(s.board) : null;
    const pr = miss || findPair(s.board, 'huo');
    if (!pr) { step(16); continue; }
    step(16, [{ type: 'cell', row: pr[0].r, col: pr[0].c }, { type: 'cell', row: pr[1].r, col: pr[1].c }]);
    if (miss) step(16, [{ type: 'cell', row: pr[1].r, col: pr[1].c }]); // drop the leftover selection
    step(16);
  }
  const res = round.result();
  const stars = round.settleOutcome() ? round.settleOutcome().stars : 0;
  return {
    win: !!(res && res.win),
    lost: res ? res.metrics.heartsLost : 3,
    hits: res ? res.metrics.hits : 3,
    healed: res ? res.metrics.healed : 0,
    stars,
    steps: matches + 2 * misses,
    matches,
    misses,
    skills: res ? res.skillsUsed : {},
    reshuffles,
    barBreaks,
    wipes,
  };
}

export function runCell(chapter, missRate, useSkills, games) {
  const acc = { games, wins: 0, lostWin: 0, lostAll: 0, stars: [0, 0, 0, 0], steps: 0, misses: 0, matches: 0, healed: 0, reshuffles: 0, barBreaks: 0, wipes: 0 };
  for (let i = 1; i <= games; i++) {
    const r = playOne(chapter, hash32('sim', i), missRate, useSkills);
    if (r.win) { acc.wins++; acc.lostWin += r.lost; }
    acc.lostAll += r.lost;
    acc.stars[r.stars]++;
    acc.steps += r.steps;
    acc.misses += r.misses;
    acc.matches += r.matches;
    acc.healed += r.healed;
    acc.reshuffles += r.reshuffles;
    acc.barBreaks += r.barBreaks;
    acc.wipes += r.wipes;
  }
  return acc;
}

function pct(n, d) { return d ? Math.round((100 * n) / d) + '%' : '-'; }

function row(label, a) {
  const moves = a.matches + a.misses;
  return `| ${label} | ${pct(a.wins, a.games)} | ${a.wins ? (a.lostWin / a.wins).toFixed(2) : '-'} | `
    + `${pct(a.stars[3], a.games)} / ${pct(a.stars[2], a.games)} / ${pct(a.stars[1], a.games)} / ${pct(a.stars[0], a.games)} | `
    + `${(a.steps / a.games).toFixed(1)} | ${pct(a.misses, moves)} | ${(a.reshuffles / a.games).toFixed(2)} | ${a.barBreaks + a.wipes} |`;
}

const HEADER = '| 连错率 · 技能 | 胜率 | 平均丢心（赢局，净值） | 3★ / 2★ / 1★ / 输 | 平均局长（步） | 实际连错 | 每局洗牌 | 兜底次数 |\n|---|---|---|---|---|---|---|---|';

function load(chapters) {
  const out = loadChapters({ chapters, enemies: ENEMIES }, { slow: false });
  if (out.rejected.length) throw new Error('rejected: ' + JSON.stringify(out.rejected));
  return out.chapters;
}

function withSteps(ch, d) {
  const c = JSON.parse(JSON.stringify(ch));
  c.boss.steps += d;
  if (c.boss.phase2) c.boss.phase2.steps += d;
  return c;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const chapters = load(CHAPTERS);
  console.log(`# 敌将回目数值模拟（每格 ${N} 局，种子 hash32('sim', 1..${N})）`);
  for (const ch of chapters) {
    const p2 = ch.boss.phase2;
    console.log(`\n## ${ch.no} ${ch.id}  hp ${ch.boss.hp}${p2 ? ' + ' + p2.hp : ''}  steps ${ch.boss.steps}${p2 ? ' / ' + p2.steps : ''}  阵容 ${ch.generals.join('、')}\n`);
    console.log(HEADER);
    for (const m of MISS_RATES) {
      for (const sk of [true, false]) console.log(row(`${m} · ${sk ? '用' : '不用'}`, runCell(ch, m, sk, N)));
    }
    console.log('\n敏感度（连错率 0.2，用技能；两段步数一起改）\n');
    console.log(HEADER.replace('连错率 · 技能', '步数'));
    for (const d of [-1, 0, 1]) {
      const c = withSteps(ch, d);
      const lab = `${c.boss.steps}${c.boss.phase2 ? ' / ' + c.boss.phase2.steps : ''}${d ? (d > 0 ? '（+1）' : '（−1）') : '（原值）'}`;
      console.log(row(lab, runCell(c, 0.2, true, N)));
    }
  }
  // Extra: chapter-design rule 13 lets ch05 swap 赵云 for 刘备; one variant to exercise Liu Bei.
  const ch05 = chapters.find((c) => c.id === 'ch05');
  const liu = Object.assign(JSON.parse(JSON.stringify(ch05)), { generals: ['zhang_fei', 'guan_yu', 'liu_bei'] });
  console.log('\n## 附：第五回换刘备（张飞、关羽、刘备），用技能\n');
  console.log(HEADER);
  for (const m of MISS_RATES) console.log(row(`${m} · 用`, runCell(liu, m, true, N)));
}
