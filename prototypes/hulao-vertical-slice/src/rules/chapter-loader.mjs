// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// 回目编排与难度 loader (design/gdd/chapter-design.md rules 6–9, 14) — the checks the slice's one chapter needs.

import { KINDS, BOARD_COLS, STACK_DEPTH, GENERALS, SLOW_CHARGE_FACTOR } from '../core/constants.mjs';

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
  if (ch.mode !== 'boss') return 'slice supports boss mode only';
  if (!(ch.rows >= 6 && ch.rows <= 8)) return 'rows out of range';
  let total = 0;
  for (const k of Object.keys(ch.deck)) {
    if (KINDS.indexOf(k) < 0) return 'unknown kind ' + k;
    if (ch.deck[k] % 2 !== 0) return 'odd count for ' + k;
    total += ch.deck[k];
  }
  // slice v6: 5 or 6 columns; tiles beyond the board are dealt face down (stacking)
  const cols = ch.cols || BOARD_COLS;
  if (!(cols >= 5 && cols <= 6)) return 'cols out of range';
  if (total < ch.rows * cols) return 'deck does not fill the board';
  if (total > ch.rows * cols * (1 + STACK_DEPTH)) return 'deck too big to stack';
  if (!ch.boss || !data.enemies[ch.boss.enemy]) return 'unknown enemy';
  if (!(ch.boss.chargeMs >= 6000 && ch.boss.chargeMs <= 20000)) return 'chargeMs out of range';
  if (!(ch.boss.steps >= 3 && ch.boss.steps <= 15)) return 'steps out of range';
  if (!(ch.boss.hearts >= 1 && ch.boss.hearts <= 5)) return 'hearts out of range';
  if (!(ch.boss.addPairs >= 0 && ch.boss.addPairs <= 4)) return 'addPairs out of range';
  if (ch.boss.hp !== undefined && !(ch.boss.hp >= 1 && ch.boss.hp <= total / 2)) return 'boss.hp out of range';
  const p2 = ch.boss.phase2;
  if (p2 && !(p2.hp >= 1 && p2.hp <= 60 && p2.steps >= 3 && p2.steps <= 15)) return 'phase2 out of range';
  if (!ch.generals || ch.generals.length === 0) return 'no generals';
  for (const id of ch.generals) if (!GENERALS.some((g) => g.id === id)) return 'unknown general ' + id;
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
