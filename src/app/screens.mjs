// Top-level screens and the per-chapter attempt counter (ADR-0002 sections 2, 5;
// design/gdd/round-flow.md rules 12, 13). Story round-flow/003.
// attempt lives in session memory only and is never saved.
import { hash32 } from '../core/rng.mjs';

/**
 * Picks the session salt (round-flow rule 12). Dev and test builds read the
 * page query `seed=N` and use N; the release build passes `readQuery = false`.
 * @param {string} search the page query string, e.g. '?seed=42'
 * @param {boolean} readQuery true in dev and test builds
 * @param {function(): number} random32 a uint32 source, used when no seed is read
 * @returns {number} uint32 salt
 * @example resolveSalt('?seed=42', true, rnd) // 42
 */
export function resolveSalt(search, readQuery, random32) {
  const match = readQuery ? /[?&]seed=(\d+)(?:&|$)/.exec(search || '') : null;
  return (match ? Number(match[1]) : random32()) >>> 0;
}

/**
 * Creates the screen controller: title / catalog / round / error. With
 * `title: true` it starts on the start screen and `start()` goes on to the
 * catalog (2026-10-31). Each round start
 * adds 1 to that chapter's attempt and seeds the round with
 * `hash32(chapterId, attempt, salt)`. 再来一回 hands the last round's
 * `round.slots()` to the new round unchanged (empty slots stay empty,
 * general-loadout rule 14); the catalog and 下一回 pass `slots: null` (fill by rule 9).
 * @param {{chapters: Array<{id: string}>, salt: number, title?: boolean,
 *   newRound: function({chapter: Object, attempt: number, seed: number, hasNext: boolean,
 *     slots: (Array<(string|null)>|null)}): Object}} options
 *   `chapters` is the loadable chapter list in order; `newRound` is the assembly root's round factory
 * @returns {{open: function(string): Object, onEvents: function(Array<Object>): void,
 *   start: function(): void, fail: function(*): void, screen: function(): string,
 *   round: function(): (Object|null), attempt: function(string): number}}
 * @example
 * const screens = createScreens({ chapters, salt: 42, newRound });
 * screens.open('ch01'); // attempt 1
 */
export function createScreens(options) {
  const chapters = options.chapters;
  const attempts = {};
  let screen = chapters.length === 0 ? 'error' : (options.title === true ? 'title' : 'catalog');
  let round = null;
  let current = -1;

  function open(chapterId, slots) {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    if (index === -1) throw new RangeError('unknown chapter: ' + chapterId);
    attempts[chapterId] = (attempts[chapterId] || 0) + 1;
    const attempt = attempts[chapterId];
    current = index;
    screen = 'round';
    round = options.newRound({
      chapter: chapters[index],
      attempt,
      seed: hash32(chapterId, attempt, options.salt),
      hasNext: index < chapters.length - 1,
      slots: slots || null,
    });
    return round;
  }

  return {
    /** Starts a round of `chapterId` from the catalog (slots filled by the assembly root). */
    open: (chapterId) => open(chapterId, null),

    /**
     * Reacts to the round's `exit {to}` events: retry and next open a new
     * round, catalog drops the round.
     * @param {Array<Object>} events events drained from the round this frame
     */
    onEvents(events) {
      for (const ev of events) {
        if (ev.type !== 'exit') continue;
        if (ev.to === 'retry') open(chapters[current].id, round.slots());
        else if (ev.to === 'next' && current + 1 < chapters.length) open(chapters[current + 1].id, null);
        else if (ev.to === 'catalog') {
          screen = 'catalog';
          round = null;
        }
      }
    },

    /** 开始游戏 on the start screen: on to the catalog. Does nothing on any other screen. */
    start() {
      if (screen === 'title') screen = 'catalog';
    },

    /** Drops the current round and shows the error page (ADR-0002 section 1). */
    fail() {
      screen = 'error';
      round = null;
    },

    /** @returns {string} 'title' | 'catalog' | 'round' | 'error' */
    screen: () => screen,

    /** @returns {(Object|null)} the current round */
    round: () => round,

    /** @returns {number} rounds started for this chapter this session */
    attempt: (chapterId) => attempts[chapterId] || 0,
  };
}
