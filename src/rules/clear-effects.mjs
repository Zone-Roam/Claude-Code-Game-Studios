// Clear-effects rules (design/gdd/clear-effects.md rules 1-8; TR-clear-effects-002,
// -004, -005).
// A player match of an effect unit (火/马/水, Zhao Yun's forced pair included)
// either reports `targetGone` or holds an `effect` token for EFFECT_HIGHLIGHT_MS,
// and clears the target kind (buried cards too) only when the token ends
// (ADR-0002 onEnd). `clear` events never trigger an effect, so this module has
// no clear handler. The combo counts consecutive player matches with no miss and
// never reads the clock (rule 6); from COMBO_THRESHOLD each match calls
// pressure.comboReward(), which battle-pressure carries out per mode using
// pushbackCut / pressDelay below (rule 8). Data in, data out. No page, clock,
// global random or storage access.
import {
  EFFECT_TARGETS, EFFECT_HIGHLIGHT_MS, COMBO_MAX, COMBO_LABELS, COMBO_LABEL_UNBROKEN,
  COMBO_THRESHOLD, COMBO_PUSHBACK, COMBO_PUSHBACK_CAP, PRESS_DELAY_MS, PRESS_DELAY_CAP_MS,
} from '../core/constants.mjs';

/**
 * The combo label (rule 7): '' below 2, 二连斩 to 十二连斩 for 2-12, 连斩不断 from 13.
 * Placement and styling belong to the view.
 * @param {number} combo the current combo count
 * @returns {string} the label text, '' when no label is shown
 * @example comboLabel(5) // '五连斩'
 */
export function comboLabel(combo) {
  if (combo < 2) return '';
  return combo < COMBO_LABELS.length ? COMBO_LABELS[combo] : COMBO_LABEL_UNBROKEN;
}

/**
 * Boss-mode combo pushback (Formulas, boss_pushback):
 * `cut = min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP - pushedSinceAttack, steps)`, never
 * below 0. The only implementation of the formula; battle-pressure's
 * comboReward() calls it, then applies `steps -= cut`, `pushedSinceAttack += cut`
 * and emits `comboPushback {cut}` when `cut > 0` (it owns both counters).
 * @param {number} steps the boss's current steps
 * @param {number} pushedSinceAttack steps pushed back since the last attack or phase change
 * @returns {number} steps to push back now, 0..COMBO_PUSHBACK
 * @example pushbackCut(5, 1) // 1; pushbackCut(5, 2) // 0; pushbackCut(0, 0) // 0
 */
export function pushbackCut(steps, pushedSinceAttack) {
  return Math.max(0, Math.min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP - pushedSinceAttack, steps));
}

/**
 * Press-mode combo delay (Formulas, press_delay):
 * `delay = min(PRESS_DELAY_MS, PRESS_DELAY_CAP_MS - comboDelayW)`, never below 0.
 * The only implementation of the formula; battle-pressure's comboReward() calls it
 * while the board will still be pushed, then applies `nextPush += delay`,
 * `comboDelayW += delay`, and zeroes comboDelayW at each push (it owns both).
 * @param {number} comboDelayW ms already delayed since the last push
 * @returns {number} ms to delay the next push now, 0..PRESS_DELAY_MS
 * @example pressDelay(2500) // 500
 */
export function pressDelay(comboDelayW) {
  return Math.max(0, Math.min(PRESS_DELAY_MS, PRESS_DELAY_CAP_MS - comboDelayW));
}

/**
 * Creates the clear-effects module for one round (ADR-0002 assembly step 4).
 * @param {{board: Object, emit: function(Object): void,
 *   acquire: function(string, number, function(Object): void, Object): Object,
 *   release: function(Object): void, dispatch: function(Object): void,
 *   pressure: Object}} ctx the round's context plus `pressure`, built with
 *   `Object.assign({}, ctx, { pressure })`. `board` needs `count`, `cells`,
 *   `buriedCells` and `clearKind`. `pressure` needs `comboReward()`, called
 *   once per match from COMBO_THRESHOLD on; it is never called for an effect
 *   clear (GDD rule 5). A new round builds a new module, so combo and maxCombo
 *   start at 0 (rule 6, "再来一回" included).
 * @returns {{onMatch: function(Object): (Object|null), onMiss: function(Object): void,
 *   combo: function(): number, maxCombo: function(): number}}
 * @example
 * const effects = createEffects(Object.assign({}, ctx, { pressure }));
 * effects.onMatch(board.tap(1, 2)); // a 火 pair -> acquires the effect token
 */
export function createEffects(ctx) {
  const board = ctx.board;
  let combo = 0;
  let maxCombo = 0;

  // Token end (ADR-0002 frame step 3): clear the target, hand the clear back to
  // the round (which passes it to pressure.onClear, then emits it), release.
  // A `{ok: false}` from clearKind (I1 already broken) dispatches nothing.
  function finish(target, token) {
    const clear = board.clearKind(target, 'effect');
    if (clear.ok !== false) ctx.dispatch(clear);
    ctx.release(token);
  }

  return {
    /**
     * Handles a board `match` (round dispatch order: effects first). Every
     * match, Zhao Yun's forced pair included, adds 1 to the combo (capped at
     * COMBO_MAX) and raises maxCombo; from COMBO_THRESHOLD it then calls
     * `pressure.comboReward()` once, before pressure sees the match itself
     * (rule 8). Only a match of an effect kind triggers an effect (GDD rule 2);
     * any other event type is ignored and leaves the combo unchanged. With no target card left on either layer, emits and returns
     * `{type: 'targetGone', kind: target}` and takes no token (rule 4).
     * Otherwise acquires an `effect` token of EFFECT_HIGHLIGHT_MS whose `detail`
     * is `{kind: target, cells, covers}` (top-layer target cells, and cells whose
     * buried card is the target) and returns that token; the target is cleared
     * when the token ends, not before (rule 3).
     * @param {Object} ev a board event; acts on `{type: 'match', kind}`
     * @returns {(Object|null)} the token, the targetGone event, or null when not triggered
     * @example effects.onMatch({ type: 'match', kind: 'shui', ... }) // { type: 'targetGone', kind: 'cheng' } with no 城 left
     */
    onMatch(ev) {
      if (ev.type !== 'match') return null;
      combo = Math.min(combo + 1, COMBO_MAX);
      if (combo > maxCombo) maxCombo = combo;
      if (combo >= COMBO_THRESHOLD) ctx.pressure.comboReward();
      if (!Object.prototype.hasOwnProperty.call(EFFECT_TARGETS, ev.kind)) return null;
      const target = EFFECT_TARGETS[ev.kind];
      if (board.count(target) === 0) {
        const gone = { type: 'targetGone', kind: target };
        ctx.emit(gone);
        return gone;
      }
      const cells = board.cells()
        .filter((cell) => cell.top === target)
        .map((cell) => ({ r: cell.r, c: cell.c }));
      const detail = { kind: target, cells, covers: board.buriedCells(target) };
      return ctx.acquire('effect', EFFECT_HIGHLIGHT_MS, (token) => finish(target, token), detail);
    },

    /**
     * Handles a board `miss` (rule 6): the combo drops to 0; maxCombo stays.
     * Any other event type is ignored.
     * @param {Object} ev a board event; acts on `{type: 'miss'}`
     * @returns {void}
     * @example effects.onMiss({ type: 'miss', kind: 'dao', a, b }); effects.combo() // 0
     */
    onMiss(ev) {
      if (ev.type === 'miss') combo = 0;
    },

    /**
     * Current combo, read by the view (shown from 2, see comboLabel).
     * @returns {number} 0..COMBO_MAX
     * @example effects.combo() // 3 after three matches with no miss
     */
    combo() {
      return combo;
    },

    /**
     * Highest combo this round, read by round-flow into the round result (rule 9).
     * @returns {number} 0..COMBO_MAX
     * @example effects.maxCombo() // 3 after match, match, match, miss, match
     */
    maxCombo() {
      return maxCombo;
    },
  };
}
