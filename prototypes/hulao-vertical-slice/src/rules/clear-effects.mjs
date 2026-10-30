// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// 清除效果与连斩 (design/gdd/clear-effects.md). Pure.
// SLICE v5 (DESIGN-v5.md, not yet in the GDD): a combo is matches in a row with no miss between them,
// not matches within COMBO_WINDOW_MS.

import { EFFECTS, COMBO_THRESHOLD, EFFECT_HIGHLIGHT_MS } from '../core/constants.mjs';

/**
 * @param {object} ctx round context plus `pressure`
 * @returns {object} effects API
 */
export function createEffects(ctx) {
  const { board, pressure, emit, acquire, release, dispatch } = ctx;
  let combo = 0;
  let maxCombo = 0;
  let comboAt = null;

  /** Rule 6–8 and 2–4: count the combo, pay the reward, trigger an effect tile. */
  function onMatch(match) {
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    comboAt = match.b;
    if (combo >= COMBO_THRESHOLD) {
      const cut = pressure.comboReward();
      if (cut > 0) emit({ type: 'interrupt', cut });
    }
    const effect = EFFECTS[match.kind];
    if (!effect) return;
    const cells = board.cellsOf(effect.target);
    if (cells.length === 0) {
      emit({ type: 'targetGone', kind: effect.target });
      return;
    }
    acquire('effect', EFFECT_HIGHLIGHT_MS, (tok) => {
      const res = board.clearKind(effect.target, 'effect');
      dispatch(res);
      release(tok);
    }, { effect: match.kind, target: effect.target, name: effect.name, cells });
  }

  return {
    onMatch,
    onMiss() { combo = 0; },
    combo() { return combo; },
    comboAt() { return comboAt; },
    maxCombo() { return maxCombo; },
    targetOf(kind) { return EFFECTS[kind] ? EFFECTS[kind].target : null; },
  };
}
