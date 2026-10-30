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
