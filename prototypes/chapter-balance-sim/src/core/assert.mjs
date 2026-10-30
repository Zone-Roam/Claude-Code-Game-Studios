// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

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
