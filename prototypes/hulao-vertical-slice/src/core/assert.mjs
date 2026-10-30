// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Development assertions (ADR-0001). The slice always runs them; the release
// build of the real game replaces this module with no-ops.

/** True while assertions are active. */
export let DEV = true;

/**
 * Switches assertions on or off (tests and the build use this).
 * @param {boolean} on new state
 */
export function setDev(on) {
  DEV = on;
}

/**
 * Throws when `cond` is false and assertions are active.
 * @param {*} cond condition that must hold
 * @param {string} message what went wrong
 */
export function devAssert(cond, message) {
  if (DEV && !cond) throw new Error('devAssert: ' + message);
}

/**
 * Logs a warning when assertions are active.
 * @param {string} message warning text
 */
export function devWarn(message) {
  if (DEV && typeof console !== 'undefined') console.warn('devWarn: ' + message);
}
