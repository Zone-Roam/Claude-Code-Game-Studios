// Shared constants for the rules layer. Pure data; no platform access.
// Tuning-knob defaults live here so rules read them from one place.

/** The 12 unit kinds in their fixed order. Iterate kinds in this order, never by object key order. */
export const UNIT_KINDS = Object.freeze([
  'huo', 'ying', 'ma', 'gong', 'shui', 'cheng', 'dao', 'gu', 'dun', 'shu', 'qi', 'jiu',
]);

/** Cell value for a roadblock (logic lives in a later story). */
export const ROADBLOCK = 'jm';

/** Cell value for an empty cell. */
export const EMPTY_CELL = null;

/** Column count used when a chapter omits `cols`. */
export const BOARD_COLS = 6;
/** Allowed column counts. */
export const BOARD_COLS_ALLOWED = Object.freeze([5, 6]);
/** Allowed playable row range (inclusive). */
export const BOARD_ROWS_MIN = 6;
export const BOARD_ROWS_MAX = 8;

/** Rule constants, not tuning knobs. */
export const STACK_DEPTH = 1;
export const MAX_TURNS = 2;

/** Tuning-knob defaults. */
export const RESHUFFLE_TRIES = 100;
export const RESHUFFLE_SHOW_MS = 400;

/** Names of the four independent random streams. */
export const RNG_STREAM_NAMES = Object.freeze(['deal', 'shuffle', 'wave', 'add']);

/**
 * Clear-effects table (design/gdd/clear-effects.md rule 1): effect unit kind ->
 * the target kind it clears. 火烧连营 huo->ying, 铁骑冲阵 ma->gong, 水淹七军 shui->cheng.
 * Effect kinds and target kinds never overlap, so effects cannot chain.
 */
export const EFFECT_TARGETS = Object.freeze({ huo: 'ying', ma: 'gong', shui: 'cheng' });
/** Tuning knob: how long the `effect` token holds the board before the target is cleared. */
export const EFFECT_HIGHLIGHT_MS = 380;

/** Combo counter ceiling (design/gdd/clear-effects.md Formulas, combo_count range 0-999). */
export const COMBO_MAX = 999;
/**
 * Combo labels by combo count (clear-effects rule 7): index n is the label for
 * combo n; below 2 nothing is shown; at or past the end of the list the label is
 * COMBO_LABEL_UNBROKEN (from 13 on).
 */
export const COMBO_LABELS = Object.freeze([
  '', '', '二连斩', '三连斩', '四连斩', '五连斩', '六连斩', '七连斩',
  '八连斩', '九连斩', '十连斩', '十一连斩', '十二连斩',
]);
export const COMBO_LABEL_UNBROKEN = '连斩不断';
/** Tuning knob (2-5): lowest combo whose match calls pressure.comboReward() (rule 8). */
export const COMBO_THRESHOLD = 3;
/** Tuning knob (1-2): boss steps pushed back per combo reward (boss_pushback). */
export const COMBO_PUSHBACK = 1;
/** Tuning knob (1-4): most boss steps pushed back between two boss attacks (boss_pushback). */
export const COMBO_PUSHBACK_CAP = 2;
/** Tuning knob (0-2000): ms the next press-mode push is delayed per combo reward (press_delay). */
export const PRESS_DELAY_MS = 1000;
/** Tuning knob (0-6000): most ms of delay between two press-mode pushes (press_delay). */
export const PRESS_DELAY_CAP_MS = 3000;
