// Fake round context and battle-pressure for general-skills tests. The fake
// pressure uses the method names in battle-pressure rules 3, 23b-23c and
// ADR-0003 (sealed, hasShield, canScare, roarBack, scareNextPush, addFood,
// raiseShield, breakSpecial); battle-pressure is written in parallel.
// Dev-only; never shipped.
import { createSkills } from '../../src/rules/general-skills.mjs';

/**
 * A recording battle-pressure stand-in. `s` holds the state tests set:
 * `sealed` (id -> steps left), `shield`, `canScare`, `hasPhase2`, `broken`,
 * `forecast` (the special id whose forecast is lit, or null), `next` (next special id).
 * @param {Object} [init] initial values for `s`
 * @returns {{impl: Object, s: Object, calls: Array<Array>}}
 * @example const p = fakePressure({ shield: true }); p.impl.hasShield() // true
 */
export function fakePressure(init) {
  const s = Object.assign({
    sealed: {}, shield: false, canScare: true, hasPhase2: true, broken: false, forecast: null, next: 'charge',
  }, init);
  const calls = [];
  const impl = {
    sealed: (id) => s.sealed[id] || 0,
    hasShield: () => s.shield,
    canScare: () => s.canScare,
    roarBack(back, stun) { calls.push(['roarBack', back, stun]); },
    scareNextPush() { calls.push(['scareNextPush']); s.canScare = false; },
    addFood(n) { calls.push(['addFood', n]); },
    raiseShield() { calls.push(['raiseShield']); s.shield = true; },
    breakSpecial() {
      calls.push(['breakSpecial']);
      if (!s.hasPhase2 || s.broken) return null;
      s.broken = true;
      return { special: s.next, name: s.next, forecast: s.forecast === s.next };
    },
  };
  return { impl, s, calls };
}

/**
 * Builds the skills module with a recording ctx. `tokens` holds acquired
 * tokens; `end(token)` runs its onEnd as round-flow would at token end.
 * `emitted(type)` filters emitted events; `dispatched` lists handed-back results.
 * @param {{loadout: string[], mode: string, board: Object, pressure?: Object,
 *   need?: Object, constants?: Object, selecting?: (string|null)}} cfg
 * @returns {{skills: Object, tokens: Array<Object>, events: Array<Object>,
 *   dispatched: Array<Object>, released: Array<Object>, end: function(Object): void,
 *   emitted: function(string): Array<Object>, card: function(string): Object}}
 * @example const f = fakeSkills({ loadout: ['guan_yu'], mode: 'boss', board });
 */
export function fakeSkills(cfg) {
  const tokens = [];
  const events = [];
  const dispatched = [];
  const released = [];
  const ctx = {
    chapter: { id: 'test', mode: cfg.mode, need: cfg.need },
    constants: cfg.constants || {},
    board: cfg.board,
    pressure: cfg.pressure || fakePressure().impl,
    loadout: cfg.loadout,
    emit: (ev) => events.push(ev),
    dispatch: (res) => dispatched.push(res),
    acquire(reason, durationMs, onEnd, detail) {
      const token = { reason, durationMs, onEnd, detail };
      tokens.push(token);
      return token;
    },
    release: (token) => released.push(token),
    selecting: () => (cfg.selecting === undefined ? null : cfg.selecting),
  };
  const skills = createSkills(ctx);
  return {
    skills, tokens, events, dispatched, released,
    end: (token) => token.onEnd(token),
    emitted: (type) => events.filter((ev) => ev.type === type),
    card: (id) => skills.cards().find((c) => c.general === id),
  };
}

/**
 * A plain `match` event (no board needed).
 * @param {string} kind unit kind
 * @param {boolean} [forced]
 * @returns {{type: string, kind: string, forced: boolean}}
 */
export function match(kind, forced) {
  return { type: 'match', kind, forced: forced === true };
}

/**
 * Feeds `n` matches of `kind` to skills.
 * @param {Object} skills the skills module
 * @param {string} kind unit kind
 * @param {number} n how many pairs
 */
export function charge(skills, kind, n) {
  for (let i = 0; i < n; i++) skills.onMatch(match(kind));
}

/**
 * A board stand-in for tests that never touch cells: no units left unless
 * `pairsLeft` is given; records clearSelection / setForceNext.
 * @param {{pairsLeft?: number}} [init]
 * @returns {Object}
 */
export function stubBoard(init) {
  const s = Object.assign({ pairsLeft: 5, force: false, cleared: 0 }, init);
  return {
    s,
    clearSelection() { s.cleared += 1; },
    pairsLeft: () => s.pairsLeft,
    isEmpty: () => s.pairsLeft === 0,
    blocks: () => [],
    count: () => 0,
    setForceNext(on) { s.force = on === true; },
    forceNext: () => s.force,
  };
}
