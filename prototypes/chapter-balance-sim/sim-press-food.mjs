// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版第 1、4、6、7、8 回（压境、粮草）的数值在不同手速、连错率下胜率合理
// Date: 2026-10-30

// Headless balance run for the release's press chapters 1, 6, 8 and food chapters 4, 7 (chapter-design rule 13).
//
// BOT STRATEGY (an upper bound for a player at a given speed / miss rate)
// - Moves are chosen like sim.mjs: sees every linkable pair; a miss roll taps the first same-kind pair that
//   cannot be linked (if none exists the roll is wasted and it plays a normal pair).
// - 压境: every move (a match or a miss) costs `t` seconds of real time before the tap; the game clock runs
//   during that time except while a token (effect, skill show) holds it. Pair choice prefers 火 (none here).
// - 粮草: no clock. "会玩" prefers 火 (fire burns 营 for free = the upper bound); "随手" takes the first pair
//   in row-major scan (lower bound).
// - Skills (only "用"), checked before each move, first ready card in lineup order:
//   关羽 / 黄忠 / 诸葛亮: as soon as ready (关羽 on the row with the most top + buried + 拒马).
//   张飞: press — when canScare() and the next push lands within the next t seconds; food — when ready (+3).
//   赵云: when ready (press / food: the old 待命 rule, next same-kind pair forced). Often wasted in press,
//         because the bot's next pair is linkable anyway; in food the forced pair costs no food, and if the
//         next move was a miss roll the miss becomes a free forced clear.
//   刘备: press — when ready (only gives charge); food — food ≤ food0 − 2, or a teammate one pair short.
//
// Usage: node sim-press-food.mjs [games per cell, default 100]

import { createRound } from './src/rules/round-flow.mjs';
import { createBoard } from './src/rules/board-link.mjs';
import { createPressure } from './src/rules/battle-pressure.mjs';
import { createEffects } from './src/rules/clear-effects.mjs';
import { createSkills } from './src/rules/general-skills.mjs';
import { createProgress } from './src/rules/progress-save.mjs';
import { loadChapters } from './src/rules/chapter-loader.mjs';
import { hash32 } from './src/core/rng.mjs';
import { CHAPTERS, ENEMIES } from './src/data/chapters.mjs';
import { findPair, bestLine } from './sim.mjs';

const SYSTEMS = { createBoard, createPressure, createEffects, createSkills };
const N = process.argv[2] ? Number(process.argv[2]) : 100;

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

function wantSkill(card, mode, h, cards, stepMs) {
  if (card.id === 'guan_yu' || card.id === 'huang_zhong' || card.id === 'zhuge_liang' || card.id === 'zhao_yun') return true;
  if (card.id === 'zhang_fei') return mode === 'food' || (h.bottomOccupied && !h.scare && h.nextPushIn <= stepMs);
  if (card.id === 'liu_bei') {
    if (mode === 'press') return true;
    return h.food <= h.food0 - 2 || cards.some((c) => c.id !== 'liu_bei' && c.need - c.charge === 1);
  }
  return false;
}

/**
 * One game. opts: { missRate, useSkills, stepSec (press), prefer ('huo' or null) }.
 */
export function playPF(chapter, seed, opts) {
  const round = createRound({ chapter, seed, progress: createProgress(), systems: SYSTEMS });
  const press = chapter.mode === 'press';
  const stepMs = press ? opts.stepSec * 1000 : 0;
  let matches = 0;
  let misses = 0;
  let forced = 0;
  const step = (dt, intents) => {
    round.frame(dt, intents || []);
    for (const e of round.drainEvents()) {
      if (e.type === 'match') { matches++; if (e.forced) forced++; } else if (e.type === 'miss') misses++;
    }
  };
  for (let t = 0; t < 600; t += 16) step(16);
  step(16, [{ type: 'button', button: 'start' }]);
  for (let t = 0; t < 200; t += 16) step(16);
  let rollIndex = 0;
  let guard = 0;
  while (round.state() === 'play' && guard++ < 5000) {
    if (round.boardLocked()) { step(100); continue; }
    const s = round.systems();
    if (opts.useSkills) {
      const h = s.pressure.hud();
      const cards = s.skills.cards();
      const ready = cards.find((c) => c.state === 'ready' && wantSkill(c, chapter.mode, h, cards, stepMs));
      if (ready) {
        const it = { type: 'card', general: ready.id };
        if (ready.id === 'guan_yu') it.row = bestLine(s.board, true);
        if (ready.id === 'huang_zhong') it.col = bestLine(s.board, false);
        const before = s.skills.skillsUsed()[ready.id];
        step(16, [it]);
        if (s.skills.skillsUsed()[ready.id] > before) continue;
      }
    }
    if (press) {
      // think time: real time t; the game clock runs only when no token holds it
      for (let left = stepMs; left > 0 && round.state() === 'play'; left -= 100) step(100);
      while (round.state() === 'play' && round.boardLocked()) step(100);
      if (round.state() !== 'play') break;
    }
    if (s.board.isEmpty()) { step(16); continue; }
    rollIndex++;
    const roll = opts.missRate > 0 && (hash32(seed, 'miss', rollIndex) % 1000) / 1000 < opts.missRate;
    const miss = roll ? findMiss(s.board) : null;
    const pr = miss || findPair(s.board, opts.prefer);
    if (!pr) { step(100); continue; }
    step(16, [{ type: 'cell', row: pr[0].r, col: pr[0].c }, { type: 'cell', row: pr[1].r, col: pr[1].c }]);
    if (miss && s.board.selection()) step(16, [{ type: 'cell', row: pr[1].r, col: pr[1].c }]);
    step(16);
  }
  const res = round.result();
  return {
    win: !!(res && res.win),
    reason: res ? (res.win ? null : res.reason) : '超时',
    stars: round.settleOutcome() ? round.settleOutcome().stars : 0,
    timeMs: res ? res.gameTimeMs : 0,
    metrics: res ? res.metrics : {},
    matches, misses, forced,
    skills: res ? res.skillsUsed : {},
  };
}

export function runPF(chapter, opts, games) {
  const a = { games, wins: 0, stars: [0, 0, 0, 0], time: 0, danger: 0, food: 0, misses: 0, matches: 0, forced: 0, reasons: {}, skills: 0, scared: 0 };
  for (let i = 1; i <= games; i++) {
    const r = playPF(chapter, hash32('sim', i), opts);
    a.stars[r.stars]++;
    a.misses += r.misses;
    a.matches += r.matches;
    a.forced += r.forced;
    a.skills += Object.values(r.skills).reduce((x, y) => x + y, 0);
    a.danger += r.metrics.dangerMs || 0;
    a.scared += r.metrics.scared || 0;
    if (r.win) {
      a.wins++;
      a.time += r.timeMs;
      a.food += r.metrics.foodLeft || 0;
    } else a.reasons[r.reason] = (a.reasons[r.reason] || 0) + 1;
  }
  return a;
}

const pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : '-');
const stars = (a) => [3, 2, 1, 0].map((k) => pct(a.stars[k], a.games)).join(' / ');
const reasons = (a) => Object.keys(a.reasons).map((k) => `${k} ${a.reasons[k]}`).join('，') || '—';

function pressRow(label, a) {
  return `| ${label} | ${pct(a.wins, a.games)} | ${stars(a)} | ${a.wins ? (a.time / a.wins / 1000).toFixed(0) : '-'} | `
    + `${(a.danger / a.games / 1000).toFixed(1)} | ${pct(a.misses, a.matches + a.misses)} | ${(a.skills / a.games).toFixed(1)} | ${(a.scared / a.games).toFixed(1)} | ${reasons(a)} |`;
}
function foodRow(label, a) {
  return `| ${label} | ${pct(a.wins, a.games)} | ${stars(a)} | ${a.wins ? (a.food / a.wins).toFixed(1) : '-'} | `
    + `${(a.misses / a.games).toFixed(1)} | ${(a.forced / a.games).toFixed(1)} | ${(a.skills / a.games).toFixed(1)} | ${reasons(a)} |`;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const out = loadChapters({ chapters: CHAPTERS, enemies: ENEMIES }, { slow: false });
  if (out.rejected.length) throw new Error('rejected: ' + JSON.stringify(out.rejected));
  console.log(`# 压境、粮草回目数值模拟（每格 ${N} 局，种子 hash32('sim', 1..${N})）`);
  for (const ch of out.chapters.filter((c) => c.mode !== 'boss')) {
    if (ch.mode === 'press') {
      const p = ch.press;
      console.log(`\n## ${ch.no} ${ch.id} 压境  interval ${p.interval}  waves ${p.waves}${p.waveList ? '（waveList）' : ''}  startRows ${p.startRows}  阵容 ${ch.generals.join('、')}\n`);
      console.log('| 每步秒数 · 连错率 · 技能 | 胜率 | 3★ / 2★ / 1★ / 输 | 平均用时（赢局，秒） | 平均压线（秒） | 实际连错 | 每局放技能 | 每局吓退 | 输的原因 |');
      console.log('|---|---|---|---|---|---|---|---|---|');
      for (const t of [2, 3, 4, 5]) {
        for (const m of [0, 0.1, 0.2]) {
          for (const sk of [true, false]) console.log(pressRow(`${t} · ${m} · ${sk ? '用' : '不用'}`, runPF(ch, { stepSec: t, missRate: m, useSkills: sk, prefer: 'huo' }, N)));
        }
      }
    } else {
      const { foodStart } = await import('./src/rules/press-food.mjs');
      console.log(`\n## ${ch.no} ${ch.id} 粮草  slack ${ch.food.slack}  food0 ${foodStart(ch)}  阵容 ${ch.generals.join('、')}\n`);
      console.log('| 打法 · 连错率 · 技能 | 胜率 | 3★ / 2★ / 1★ / 输 | 平均余粮（赢局） | 每局连错 | 每局赵云强制消 | 每局放技能 | 输的原因 |');
      console.log('|---|---|---|---|---|---|---|---|');
      for (const [lab, prefer] of [['会玩', 'huo'], ['随手', null]]) {
        for (const m of [0, 0.1, 0.2, 0.3]) {
          for (const sk of [true, false]) console.log(foodRow(`${lab} · ${m} · ${sk ? '用' : '不用'}`, runPF(ch, { missRate: m, useSkills: sk, prefer }, N)));
        }
      }
    }
  }
}
