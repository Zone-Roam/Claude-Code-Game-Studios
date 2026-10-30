// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回压境、粮草回目的数值（间隔、波次、余量）在不同手速、连错率下胜率合理
// Date: 2026-10-30

// 战场压力 (design/gdd/battle-pressure.md): 敌军压境 press (rules 7–14, 9a) and 粮草有限 food (rules 15–19, 18a).
// createPressure in battle-pressure.mjs picks one of these by chapter.mode. Pure: press counts its own game
// time from tick(dt), never reads a clock.

import { KINDS, EFFECTS, PRESS_DELAY_MS, PRESS_DELAY_CAP_MS } from '../core/constants.mjs';

/** Pool weights in kind-table order: chapter.pool, default = deck pairs (rule 8). */
export function poolOf(chapter) {
  const entries = [];
  for (const k of KINDS) {
    const w = chapter.pool ? chapter.pool[k] || 0 : (chapter.deck[k] || 0) / 2;
    if (w > 0) entries.push([k, w]);
  }
  return entries;
}

/**
 * Formula food_start: food0 = pairs − wipePairs + slack.
 * @param {object} chapter loaded chapter with deck and food.slack
 * @returns {number}
 */
export function foodStart(chapter) {
  let pairs = 0;
  for (const k of KINDS) pairs += (chapter.deck[k] || 0) / 2;
  let wipe = 0;
  for (const e of Object.keys(EFFECTS)) if (chapter.deck[e] > 0) wipe += (chapter.deck[EFFECTS[e].target] || 0) / 2;
  return pairs - wipe + chapter.food.slack;
}

/**
 * Rule 8: the wave table, fixed at open. waveList as written, or `waves` rows drawn from rng('wave'):
 * floor(cols / 2) weighted pairs, padded with null, columns shuffled with the same stream.
 * @param {object} chapter loaded chapter
 * @param {object} board board API
 * @returns {Array<Array<string|null>>}
 */
export function waveTable(chapter, board) {
  const p = chapter.press;
  if (p.waveList) return p.waveList.map((w) => w.slice());
  const stream = board.rng('wave');
  const entries = poolOf(chapter);
  const out = [];
  for (let w = 0; w < p.waves; w++) {
    const cells = [];
    for (let i = 0; i < Math.floor(board.cols / 2); i++) {
      const k = stream.pickWeighted(entries);
      cells.push(k, k);
    }
    while (cells.length < board.cols) cells.push(null);
    out.push(stream.shuffle(cells));
  }
  return out;
}

const NO_BOSS = {
  bindSkills() {},
  onClear() {},
  roarBack() {},
  raiseShield() {},
  breakSpecial() { return null; },
  healHeart() { return 0; },
  canHeal() { return false; },
  sealed() { return 0; },
};

/**
 * 敌军压境 (rules 7–14, 9a; clear-effects press_delay).
 * @param {object} ctx round context
 * @returns {object} pressure API
 */
export function createPress(ctx) {
  const { chapter, board, emit } = ctx;
  const interval = chapter.press.interval;
  const waves = waveTable(chapter, board);
  let time = 0;
  let nextPush = interval;
  let wave = 0;
  let scare = false;
  let comboDelay = 0;
  let dangerMs = 0;
  let lost = null;
  let pushes = 0;
  let scared = 0;

  function push() {
    const row = wave < waves.length ? waves[wave] : null;
    if (row) wave++;
    const res = board.pushRowFromTop(row);
    pushes++;
    nextPush = time + interval;
    comboDelay = 0;
    emit({ type: 'push', row: 1, empty: res.empty, dropped: res.dropped });
    if (row && wave === waves.length) emit({ type: 'lastWave' });
  }

  return Object.assign({}, NO_BOSS, {
    onMatch() {},
    onMiss() {},
    /** press_delay: delay = min(PRESS_DELAY_MS, CAP − comboDelay_w); returns 0 (no enemy steps to cut). */
    comboReward() {
      const delay = Math.min(PRESS_DELAY_MS, PRESS_DELAY_CAP_MS - comboDelay);
      if (delay > 0) {
        nextPush += delay;
        comboDelay += delay;
      }
      return 0;
    },
    /** Rule 13: the next push that falls due is scared away. */
    scareNextPush() { scare = true; },
    canScare() { return board.bottomOccupied() && !scare; },
    addFood() {},
    refillFood() { return 0; },
    canRefill() { return false; },
    /**
     * Rules 9, 10, 13, 14.
     * @param {number} dt game milliseconds this frame
     * @returns {boolean} whether the board changed (or the round was lost)
     */
    tick(dt) {
      if (lost) return false;
      if (board.bottomOccupied()) dangerMs += dt;
      time += dt;
      if (board.isEmpty() && wave < waves.length) { // rule 10: at once, not scared away
        push();
        return true;
      }
      if (time < nextPush) return false;
      if (scare) {
        scare = false;
        scared++;
        nextPush = time + interval;
        comboDelay = 0;
        emit({ type: 'scared' });
        return false;
      }
      if (board.bottomOccupied()) {
        lost = '破城';
        return true;
      }
      push();
      return true;
    },
    /** Rule 4, 11: win first. */
    outcome() {
      if (wave === waves.length && board.isEmpty()) return { result: 'win', reason: null };
      if (lost) return { result: 'lose', reason: lost };
      return { result: null, reason: null };
    },
    hud() {
      return {
        mode: 'press', wave, waves: waves.length, interval, nextPushIn: nextPush - time, time,
        bottomOccupied: board.bottomOccupied(), dangerMs, scare, comboDelay,
      };
    },
    metrics() { return { dangerMs: Math.floor(dangerMs), wave, waves: waves.length, pushes, scared }; },
  });
}

/**
 * 粮草有限 (rules 15–19, 18a).
 * @param {object} ctx round context
 * @returns {object} pressure API
 */
export function createFood(ctx) {
  const { chapter, board, emit } = ctx;
  const food0 = foodStart(chapter);
  let food = food0;
  let misses = 0;
  let roared = 0;
  let refilled = 0;
  return Object.assign({}, NO_BOSS, {
    /** Rule 17: −1 unless it is Zhao Yun's forced pair. */
    onMatch(m) {
      if (m && m.forced) return;
      food -= 1;
      emit({ type: 'foodSpent', amount: 1, cause: 'match' });
    },
    onMiss() {
      food -= 1;
      misses += 1;
      emit({ type: 'foodSpent', amount: 1, cause: 'miss' });
    },
    comboReward() { return 0; },
    scareNextPush() {},
    canScare() { return false; },
    /** Rule 18: Zhang Fei, may exceed food0. */
    addFood(n) {
      food += n;
      roared += n;
    },
    /** Rule 18a: Liu Bei, capped at food0. */
    refillFood(n) {
      const gain = Math.max(0, Math.min(n, food0 - food));
      food += gain;
      refilled += gain;
      if (gain > 0) emit({ type: 'foodRefill', amount: gain });
      return gain;
    },
    canRefill() { return food < food0; },
    tick() { return false; },
    /** Rule 19: an empty board wins, else food ≤ 0 loses. */
    outcome() {
      if (board.isEmpty()) return { result: 'win', reason: null };
      if (food <= 0) return { result: 'lose', reason: '粮草断绝' };
      return { result: null, reason: null };
    },
    hud() { return { mode: 'food', food, food0, misses }; },
    metrics() { return { misses, foodLeft: food, food0, roared, refilled }; },
  });
}
