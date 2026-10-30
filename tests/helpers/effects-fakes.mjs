// Fake round context for clear-effects tests: records acquire / release /
// dispatch / emit calls and every pressure call. round-flow and battle-pressure
// do not exist yet (ADR-0002 assembly shape). Dev-only; never shipped.
import { createEffects } from '../../src/rules/clear-effects.mjs';

/**
 * Builds the effects module on `board` with a recording fake context.
 * `calls` lists every context call in order as `[name, ...args]`;
 * `tokens` holds acquired tokens `{reason, durationMs, onEnd, detail}`.
 * `pressure` methods, when given, replace the recording defaults (the call is
 * still recorded in `pressureCalls`). `advance(ms)` moves the fake game clock.
 * @param {Object} board a board-link board (may be null when only non-effect
 *   kinds are matched)
 * @param {Object} [pressure] fake battle-pressure methods, e.g. `{comboReward}`
 * @returns {{effects: Object, calls: Array<Array>, tokens: Array<Object>,
 *   pressureCalls: Array<string>, gameTime: function(): number,
 *   advance: function(number): void}}
 * @example const f = fakeEffects(boardFromPicture(PIC)); f.effects.onMatch(ev);
 */
export function fakeEffects(board, pressure) {
  const calls = [];
  const tokens = [];
  const pressureCalls = [];
  const given = pressure || {};
  const recording = {};
  for (const name of ['onMatch', 'onMiss', 'onClear', 'comboReward', 'tick', 'outcome']) {
    recording[name] = function () {
      pressureCalls.push(name);
      return typeof given[name] === 'function' ? given[name].apply(given, arguments) : 0;
    };
  }
  let now = 5000;
  const gameTime = () => now;
  const advance = (ms) => { now += ms; };
  const ctx = {
    chapter: {},
    constants: {},
    board,
    gameTime,
    emit: (ev) => calls.push(['emit', ev]),
    dispatch: (result) => calls.push(['dispatch', result]),
    release: (token) => calls.push(['release', token]),
    acquire: (reason, durationMs, onEnd, detail) => {
      const token = { reason, durationMs, onEnd, detail };
      tokens.push(token);
      calls.push(['acquire', token]);
      return token;
    },
  };
  const effects = createEffects(Object.assign({}, ctx, { pressure: recording }));
  return { effects, calls, tokens, pressureCalls, gameTime, advance };
}

/**
 * Taps two cells and returns the board's event for the second tap.
 * @param {Object} board a board-link board
 * @param {{r: number, c: number}} a first cell
 * @param {{r: number, c: number}} b second cell
 * @returns {Object} the `match` or `miss` event
 * @example tapPair(board, { r: 5, c: 1 }, { r: 5, c: 2 }) // { type: 'match', kind: 'huo', ... }
 */
export function tapPair(board, a, b) {
  board.tap(a.r, a.c);
  return board.tap(b.r, b.c);
}

/**
 * A `match` event of a non-effect kind, for combo tests that need no board.
 * @returns {Object} `{type: 'match', kind: 'dao', forced: false}`
 * @example effects.onMatch(plainMatch())
 */
export function plainMatch() {
  return { type: 'match', kind: 'dao', forced: false };
}

/**
 * A `miss` event, for combo tests that need no board.
 * @returns {Object} `{type: 'miss', kind: 'dao'}`
 * @example effects.onMiss(plainMiss())
 */
export function plainMiss() {
  return { type: 'miss', kind: 'dao' };
}
