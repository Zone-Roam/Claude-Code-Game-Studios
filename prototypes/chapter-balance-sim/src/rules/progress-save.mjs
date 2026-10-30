// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// 进度、三星与存档 (design/gdd/progress-save.md) — the slice keeps stars and a
// session-only best (no storage: saving is out of the slice's scope).

import {
  STAR_BOSS_T3, STAR_BOSS_T2, STAR_PRESS_T3, STAR_PRESS_T2, STAR_FOOD_T3, STAR_FOOD_MISS_T2,
} from '../core/constants.mjs';

/**
 * Stars for a boss-mode round (rule 2).
 * @param {object} result RoundResult
 * @returns {number} 0–3
 */
export function starsFor(result) {
  if (!result.win) return 0;
  const m = result.metrics;
  if (result.mode === 'press') return m.dangerMs <= STAR_PRESS_T3 ? 3 : m.dangerMs <= STAR_PRESS_T2 ? 2 : 1;
  if (result.mode === 'food') return m.misses === 0 && m.foodLeft >= STAR_FOOD_T3 ? 3 : m.misses <= STAR_FOOD_MISS_T2 ? 2 : 1;
  const lost = result.metrics.heartsLost;
  if (lost <= STAR_BOSS_T3) return 3;
  if (lost <= STAR_BOSS_T2) return 2;
  return 1;
}

/**
 * The reason line shown when a win is short of three stars (rule 6).
 * @param {object} result RoundResult
 * @param {number} stars stars earned
 * @returns {string|null}
 */
export function reasonLineFor(result, stars) {
  if (!result.win || stars >= 3) return null;
  const m = result.metrics;
  if (result.mode === 'press') return '压线 ' + (Math.ceil(m.dangerMs / 100) / 10).toFixed(1) + ' 秒';
  if (result.mode === 'food') return m.misses > 0 ? '连不上 ' + m.misses + ' 次' : '余粮只剩 ' + m.foodLeft + ' 份';
  return '丢了 ' + result.metrics.heartsLost + ' 颗心';
}

/** @returns {object} progress API with settle() (rule 5) */
export function createProgress() {
  const best = {};
  const settled = new Set();
  return {
    settle(result) {
      if (settled.has(result)) throw new Error('settle called twice for one round');
      settled.add(result);
      const stars = starsFor(result);
      const before = best[result.chapterId] || 0;
      best[result.chapterId] = Math.max(before, stars);
      return {
        stars,
        bestStars: best[result.chapterId],
        isNewBest: stars > before,
        reasonLine: reasonLineFor(result, stars),
        saved: false,
      };
    },
    bestStars(chapterId) { return best[chapterId] || 0; },
  };
}
