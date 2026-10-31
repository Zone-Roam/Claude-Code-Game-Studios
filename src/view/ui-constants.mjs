// UI timing values from design/gdd/ui-interaction.md (rules 13, 15, 16, 20, 21e).
// They live here until src/core/constants.mjs gains them (another agent owns that file).
// WIRE: move these into src/core/constants.mjs and import from there.

/** Rule 15: a second press on the same cell within this many ms is ignored. */
export const SAME_CELL_GUARD_MS = 200;
/** Rule 16: a card press this soon after a board press is ignored (finger rolled over). */
export const CARD_AFTER_BOARD_MS = 250;
/** Rule 20: how long a shout stays in the shout slot. */
export const SHOUT_MS = 1200;
/** Rule 21e: a pressed look stays at least this long, so a quick tap still shows it. */
export const PRESS_MIN_MS = 90;
/** Rule 13 (slice value): ms a selected effect unit waits before its target kind is previewed. */
export const PREVIEW_DELAY_MS = 150;
