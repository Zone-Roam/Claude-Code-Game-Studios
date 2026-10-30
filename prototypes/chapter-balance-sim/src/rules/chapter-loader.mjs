// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// 回目编排与难度 loader (design/gdd/chapter-design.md rules 6–9, 14) — the checks the slice's one chapter needs.

import {
  KINDS, BOARD_COLS, STACK_DEPTH, GENERALS, SLOW_CHARGE_FACTOR, SPECIAL_NAMES, PRESS_ROWS, SLOW_INTERVAL_FACTOR,
} from '../core/constants.mjs';

/**
 * Validates chapters and applies test flags. Rejected chapters are dropped with a reason.
 * @param {{chapters: Array, enemies: object}} data raw data module
 * @param {{slow: boolean}} flags build/URL flags
 * @returns {{chapters: Array, rejected: Array<{id: string, reason: string}>}}
 */
export function loadChapters(data, flags) {
  const out = [];
  const rejected = [];
  const seen = {};
  for (const raw of data.chapters) {
    const why = reject(raw, data, seen);
    if (why) {
      rejected.push({ id: raw.id, reason: why });
      continue;
    }
    seen[raw.id] = true;
    const ch = JSON.parse(JSON.stringify(raw));
    // chapter-design rule 2: recommend replaces generals; the sim fields the recommended lineup
    if (!ch.generals) ch.generals = ch.recommend.slice();
    if (ch.mode === 'press' && flags.slow) ch.press.interval = Math.round(ch.press.interval * SLOW_INTERVAL_FACTOR);
    if (ch.mode !== 'boss') {
      out.push(ch);
      continue;
    }
    const enemy = data.enemies[ch.boss.enemy];
    ch.enemyName = enemy.name;
    ch.enemyLines = ch.enemyLines || enemy.lines;
    if (flags.slow) {
      // slice v5: the bar is counted in steps, so slow=1 lengthens it by the same factor
      ch.boss.chargeMs = Math.round(ch.boss.chargeMs * SLOW_CHARGE_FACTOR);
      ch.boss.steps = Math.round(ch.boss.steps * SLOW_CHARGE_FACTOR);
      if (ch.boss.phase2) {
        ch.boss.phase2.chargeMs = Math.round(ch.boss.phase2.chargeMs * SLOW_CHARGE_FACTOR);
        ch.boss.phase2.steps = Math.round(ch.boss.phase2.steps * SLOW_CHARGE_FACTOR);
      }
    }
    out.push(ch);
  }
  return { chapters: out, rejected };
}

function reject(ch, data, seen) {
  if (seen[ch.id]) return 'duplicate id';
  if (['boss', 'press', 'food'].indexOf(ch.mode) < 0) return 'unknown mode';
  if (!(ch.rows >= 6 && ch.rows <= 8)) return 'rows out of range';
  if (ch.mode === 'press' && ch.rows !== PRESS_ROWS) return 'press rows must be ' + PRESS_ROWS;
  let total = 0;
  for (const k of Object.keys(ch.deck)) {
    if (KINDS.indexOf(k) < 0) return 'unknown kind ' + k;
    if (ch.deck[k] % 2 !== 0) return 'odd count for ' + k;
    total += ch.deck[k];
  }
  // slice v6: 5 or 6 columns; tiles beyond the board are dealt face down (stacking)
  const cols = ch.cols || BOARD_COLS;
  if (!(cols >= 5 && cols <= 6)) return 'cols out of range';
  for (const k of Object.keys(ch.pool || {})) {
    if (KINDS.indexOf(k) < 0) return 'unknown pool kind ' + k;
    if (!(Number.isInteger(ch.pool[k]) && ch.pool[k] > 0)) return 'bad pool weight ' + k;
  }
  const lineup0 = ch.generals || ch.recommend;
  if (!lineup0 || lineup0.length === 0 || lineup0.length > 3) return 'no generals';
  for (const id of lineup0) if (!GENERALS.some((g) => g.id === id)) return 'unknown general ' + id;
  if (ch.mode === 'press') return rejectPress(ch, cols, total);
  if (total < ch.rows * cols) return 'deck does not fill the board';
  // 2026-10-30: per-chapter stackDepth 1-3 (user decision "往后逐步加深").
  const depth = ch.stackDepth === undefined ? STACK_DEPTH : ch.stackDepth;
  if (!(Number.isInteger(depth) && depth >= 1 && depth <= 3)) return 'stackDepth out of range';
  if (total > ch.rows * cols * (1 + depth)) return 'deck too big to stack';
  if (ch.mode === 'food') return ch.food && ch.food.slack >= 0 && ch.food.slack <= 6 ? null : 'food.slack out of range';
  if (!ch.boss || !data.enemies[ch.boss.enemy]) return 'unknown enemy';
  if (ch.boss.chargeMs !== undefined && !(ch.boss.chargeMs >= 6000 && ch.boss.chargeMs <= 20000)) return 'chargeMs out of range';
  if (!(ch.boss.steps >= 3 && ch.boss.steps <= 20)) return 'steps out of range';
  if (!(ch.boss.hearts >= 1 && ch.boss.hearts <= 5)) return 'hearts out of range';
  if (!(ch.boss.addPairs >= 0 && ch.boss.addPairs <= 4)) return 'addPairs out of range';
  if (ch.boss.hp !== undefined && !(ch.boss.hp >= 1 && ch.boss.hp <= 60)) return 'boss.hp out of range';
  const p2 = ch.boss.phase2;
  if (p2 && !(p2.hp >= 1 && p2.hp <= 60 && p2.steps >= 3 && p2.steps <= 20)) return 'phase2 out of range';
  if (p2 && p2.specials && (p2.specials.length === 0 || p2.specials.some((id) => !SPECIAL_NAMES[id]))) return 'bad phase2.specials';
  const lineup = ch.generals || ch.recommend;
  if (!lineup || lineup.length === 0 || lineup.length > 3) return 'no generals';
  for (const id of lineup) if (!GENERALS.some((g) => g.id === id)) return 'unknown general ' + id;
  return null;
}

// battle-pressure rules 7–8 and Edge Cases: press parameters and waveList.
function rejectPress(ch, cols, total) {
  const p = ch.press;
  if (!p) return 'no press';
  if (!(p.startRows >= 3 && p.startRows <= 5)) return 'startRows out of range';
  if (total !== p.startRows * cols) return 'press deck must fill startRows exactly (no stacking)';
  if (!(p.interval >= 4000 && p.interval <= 12000)) return 'interval out of range';
  if (!(p.waves >= 4 && p.waves <= 16)) return 'waves out of range';
  const wp = Math.floor(cols / 2);
  if (p.waveList) {
    if (p.waveList.length !== p.waves) return 'waveList length != waves';
    for (const w of p.waveList) {
      if (w.length !== cols) return 'waveList item length != cols';
      const n = {};
      let gaps = 0;
      for (const e of w) {
        if (e === null || e === 'jm') gaps++;
        else if (KINDS.indexOf(e) < 0) return 'unknown waveList element ' + e;
        else n[e] = (n[e] || 0) + 1;
      }
      if (gaps !== cols - 2 * wp) return 'waveList gaps wrong';
      if (Object.keys(n).some((k) => n[k] % 2)) return 'odd kind in waveList item';
    }
  }
  return null;
}

/**
 * Fills {name} placeholders; numbers print without a trailing .0 (rule 4).
 * @param {string} template text with {placeholders}
 * @param {object} values replacement values
 * @returns {string}
 */
export function fillText(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, key) => {
    if (!(key in values)) return m;
    const v = values[key];
    return typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : String(v);
  });
}
