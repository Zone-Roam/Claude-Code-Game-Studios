// Fake systems for round-flow tests: board-link, battle-pressure, clear-effects,
// general-skills and progress-save stand-ins that record every call in one
// ordered log. battle-pressure, general-skills, progress-save and view do not
// exist yet. Dev-only; never shipped.
import { createRound } from '../../src/rules/round-flow.mjs';
import { MAX_STEP_MS, BG_GAP_MS, TOKEN_MAX_MS } from '../../src/core/constants.mjs';

/** Fixed seed and chapter for every round test. */
export const TEST_SEED = 12345;
export const TEST_CHAPTER = Object.freeze({ id: 'ch01', mode: 'press' });
/**
 * Constants injected into every test round (ADR-0002: tests inject constants).
 * CARD_GUARD_MS and OPEN_FADE_MS are 0 so tests of other rules press buttons and
 * start play at once; the guard and fade tests inject the real values.
 */
export const TEST_CONSTANTS = Object.freeze({ MAX_STEP_MS, BG_GAP_MS, TOKEN_MAX_MS, CARD_GUARD_MS: 0, OPEN_FADE_MS: 0 });
/** A board cell tap intent (ADR-0003). */
export const CELL = Object.freeze({ type: 'cell', row: 5, col: 1 });

const METHODS = {
  board: ['tap', 'ensurePlayable', 'isEmpty', 'clearKind', 'pushRowFromTop', 'addPairs', 'clearSelection'],
  pressure: ['onMatch', 'onMiss', 'onClear', 'tick', 'outcome', 'metrics', 'hud'],
  effects: ['onMatch', 'onMiss', 'maxCombo'],
  skills: ['onMatch', 'tapCard', 'onPush', 'skillsUsed', 'rowSelectable', 'cutRow', 'colSelectable', 'cutCol'],
  progress: ['settle'],
};
/** Return values of the query methods when a test does not override them. */
const DEFAULTS = {
  effects: { maxCombo: () => 0 },
  skills: { skillsUsed: () => ({}) },
  pressure: { metrics: () => ({}), hud: () => ({ phase: 1 }) },
};

/**
 * Builds fake system factories and a fake progress. Every factory and method
 * call is logged as `[name, ...args]` (e.g. `['board.tap', 5, 1]`, `['createPressure']`).
 * `over.<system>.<method>` replaces a method's return value; it receives the
 * call's arguments plus the ctx the system was built with (null for the board
 * and progress). Unset methods return null, except the DEFAULTS queries.
 * @param {Object} [over] e.g. `{ pressure: { outcome: () => ({ result: 'win' }) } }`
 * @returns {{systems: Object, progress: Object, log: Array<Array>, ctxs: Object,
 *   calls: function(string): Array<Array>}}
 * @example const f = fakeSystems({ board: { tap: () => ({ type: 'miss' }) } });
 */
export function fakeSystems(over) {
  const given = over || {};
  const log = [];
  const ctxs = {};

  function fake(name, ctx) {
    const impl = Object.assign({}, DEFAULTS[name], given[name]);
    const obj = {};
    for (const method of METHODS[name]) {
      obj[method] = function () {
        const args = Array.prototype.slice.call(arguments);
        log.push([name + '.' + method].concat(args));
        return typeof impl[method] === 'function' ? impl[method].apply(null, args.concat([ctx])) : null;
      };
    }
    return obj;
  }

  const systems = {
    createBoard(chapter, options) {
      log.push(['createBoard', chapter, options]);
      return fake('board', null);
    },
    createPressure(ctx) {
      log.push(['createPressure']);
      ctxs.pressure = ctx;
      return fake('pressure', ctx);
    },
    createEffects(ctx) {
      log.push(['createEffects']);
      ctxs.effects = ctx;
      return fake('effects', ctx);
    },
    createSkills(ctx) {
      log.push(['createSkills']);
      ctxs.skills = ctx;
      return fake('skills', ctx);
    },
  };
  return { systems, progress: fake('progress', null), log, ctxs, calls: (name) => log.filter((entry) => entry[0] === name) };
}

/**
 * A round on fake systems, already in `play` (the 开讲 path is Story 017),
 * with its outbox drained.
 * @param {Object} [over] fake overrides, as for fakeSystems
 * @param {Object} [options] extra createRound options (e.g. `warn`, `hasNext`, `chapter`)
 * @returns {{round: Object, systems: Object, progress: Object, log: Array<Array>,
 *   ctxs: Object, calls: function(string): Array<Array>}}
 * @example const { round } = playRound(); round.frame(16.7, []);
 */
export function playRound(over, options) {
  const fakes = fakeSystems(over);
  const round = createRound(Object.assign({
    chapter: TEST_CHAPTER, seed: TEST_SEED, constants: TEST_CONSTANTS, progress: fakes.progress, systems: fakes.systems,
  }, options));
  round.start();
  round.drainEvents();
  return Object.assign({ round }, fakes);
}

/**
 * Feeds `frames` frames of `dtReal` with no intents; `after(i)` runs after frame i (1-based).
 * @param {Object} round a round
 * @param {number} frames how many frames
 * @param {number} dtReal ms per frame
 * @param {function(number): void} [after] per-frame check
 */
export function feed(round, frames, dtReal, after) {
  for (let i = 1; i <= frames; i++) {
    round.frame(dtReal, []);
    if (after) after(i);
  }
}

/**
 * A scripted method: each call returns the next value; the last value repeats.
 * @param {Array<*>} values e.g. `[{ type: 'miss' }, { type: 'match' }]`
 * @returns {function(): *}
 * @example board: { tap: sequence([MISS, MATCH]) }
 */
export function sequence(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/**
 * A battle-pressure stand-in with just enough rules for round-flow tests
 * (battle-pressure rules 2, 23, 24 as round-flow reads them):
 * boss: a match hits hp 1 and walks 1 step, a miss walks 2; tick changes
 * phase when hp is 0 and `hp2` is set (phase token), else attacks when the
 * steps are full and hp > 0 (one heart, addPairs, hostAttack token);
 * food: every match or miss eats 1 food; press: tick pushes a row every `pushEveryMs`.
 * outcome() checks win (empty board, or boss hp 0 in its last phase) before
 * lose (hearts 0 '城破', food 0 '粮草断绝').
 * @param {{mode: string, hearts?: number, hp?: number, hp2?: number, phase?: number,
 *   steps?: number, stepsMax?: number, food?: number, pushEveryMs?: number}} cfg
 * @returns {{impl: Object, s: Object}} `impl` goes in `over.pressure`; `s` is the live state
 * @example const p = fakePressure({ mode: 'boss', hearts: 3, hp: 5, steps: 0, stepsMax: 8 });
 */
export function fakePressure(cfg) {
  const s = Object.assign({ hearts: 3, hp: 5, hp2: 0, phase: 1, steps: 0, stepsMax: 8, food: 10, pushEveryMs: 0 }, cfg,
    { heartsLost: 0, misses: 0, pushes: 0, sincePush: 0 });
  const boss = s.mode === 'boss';
  const food = s.mode === 'food';
  const lastPhase = () => !(s.phase === 1 && s.hp2 > 0);
  const impl = {
    onMatch() {
      if (boss) {
        if (s.hp > 0) s.hp -= 1;
        s.steps += 1;
      }
      if (food) s.food -= 1;
    },
    onMiss() {
      if (boss) s.steps += 2;
      if (food) {
        s.food -= 1;
        s.misses += 1;
      }
    },
    tick(dtGame, ctx) {
      if (s.pushEveryMs > 0) {
        s.sincePush += dtGame;
        if (s.sincePush >= s.pushEveryMs) {
          s.sincePush -= s.pushEveryMs;
          s.pushes += 1;
          ctx.board.pushRowFromTop();
          ctx.emit({ type: 'push' });
        }
      }
      if (!boss) return;
      if (s.hp <= 0 && !lastPhase()) {
        s.phase = 2;
        s.hp = s.hp2;
        s.steps = 0;
        ctx.emit({ type: 'bossPhase', phase: 2 });
        ctx.acquire('phase', undefined, (token) => ctx.release(token));
      } else if (s.hp > 0 && s.steps >= s.stepsMax) {
        s.steps = 0;
        s.hearts -= 1;
        s.heartsLost += 1;
        ctx.board.addPairs(1);
        ctx.emit({ type: 'hostAttack' });
        ctx.acquire('hostAttack', undefined, (token) => ctx.release(token));
      }
    },
    outcome(ctx) {
      if (ctx.board.isEmpty() || (boss && s.hp <= 0 && lastPhase())) return { result: 'win', reason: null };
      if (boss && s.hearts <= 0) return { result: 'lose', reason: '城破' };
      if (food && s.food <= 0) return { result: 'lose', reason: '粮草断绝' };
      return { result: null, reason: null };
    },
    metrics() {
      if (boss) return { heartsLost: s.heartsLost };
      if (food) return { foodLeft: s.food, misses: s.misses };
      return { dangerMs: 0 };
    },
    hud: () => ({ phase: s.phase }),
  };
  return { impl, s };
}

/**
 * A clear-effects stand-in: a match of an effect kind holds an `effect` token
 * (EFFECT_HIGHLIGHT_MS); when it runs out the effect calls board.clearKind(target),
 * hands back a `clear` and releases the token (clear-effects rules 1-3).
 * @param {Object<string, string>} targets effect kind -> target kind, e.g. `{ huo: 'ying' }`
 * @returns {Object} goes in `over.effects`
 */
export function fakeEffects(targets) {
  return {
    onMatch(ev, ctx) {
      const target = targets[ev.kind];
      if (!target) return null;
      ctx.acquire('effect', undefined, (token) => {
        ctx.board.clearKind(target);
        ctx.dispatch({ type: 'clear', source: 'effect', kind: target });
        ctx.release(token);
      });
      return { kind: ev.kind, target };
    },
    maxCombo: () => 0,
  };
}

/** The pause stamp intent (ADR-0003). */
export const PAUSE_STAMP = Object.freeze({ type: 'pauseStamp' });

/**
 * An overlay-card button intent (ADR-0003 `{type: 'button', card, button}`).
 * Cards are overlay() values; buttons: 'resume' (接着讲), 'catalog' (回书目), 'retry', 'next'.
 * @param {string} card e.g. 'pause'
 * @param {string} button e.g. 'resume'
 * @returns {{type: string, card: string, button: string}}
 */
export function buttonIntent(card, button) {
  return { type: 'button', card, button };
}

/**
 * A progress-save stand-in with an in-memory save (ADR-0004 as round-flow
 * sees it): settle(result) writes the result once under chapterId + attempt.
 * @returns {{impl: Object, save: Object}} `impl` goes in `over.progress`; `save` is the live save
 * @example const store = fakeProgressStore(); playRound({ progress: store.impl });
 */
export function fakeProgressStore() {
  const save = { results: {} };
  const impl = {
    settle(result) {
      const key = result.chapterId + '#' + result.attempt;
      if (!save.results[key]) save.results[key] = { win: result.win };
      return { key };
    },
  };
  return { impl, save };
}

/** The off-board tap intent (ADR-0003): 台眉, dead zone, table edge. */
export const OFF_BOARD = Object.freeze({ type: 'offBoard' });

/**
 * A general-card tap intent (ADR-0003).
 * @param {string} general e.g. 'guan_yu'
 * @returns {{type: string, general: string}}
 */
export function cardIntent(general) {
  return { type: 'card', general };
}

/**
 * A general-skills stand-in for rule 5a: each general in `ready` has a full
 * charge (1). tapCard on a ready Guan Yu returns 'row', Huang Zhong 'col'
 * (enter select); another ready general fires at once. Firing (cutRow /
 * cutCol / the direct tap) clears the charge and holds a `skill` token.
 * @param {{ready: string[], rows?: number[], cols?: number[]}} cfg selectable rows / columns
 * @returns {{impl: Object, s: {charge: Object}}} `impl` goes in `over.skills`
 * @example const sk = fakeSelectSkills({ ready: ['guan_yu'], rows: [4] });
 */
export function fakeSelectSkills(cfg) {
  const s = { charge: {} };
  for (const id of cfg.ready) s.charge[id] = 1;
  const rows = cfg.rows || [];
  const cols = cfg.cols || [];
  function fire(id, ctx) {
    s.charge[id] = 0;
    ctx.acquire('skill', undefined, (token) => ctx.release(token));
  }
  const impl = {
    tapCard(general, ctx) {
      if (s.charge[general] !== 1) return null;
      if (general === 'guan_yu') return 'row';
      if (general === 'huang_zhong') return 'col';
      fire(general, ctx);
      return null;
    },
    rowSelectable: (row) => rows.indexOf(row) !== -1,
    colSelectable: (col) => cols.indexOf(col) !== -1,
    cutRow: (row, ctx) => fire('guan_yu', ctx),
    cutCol: (col, ctx) => fire('huang_zhong', ctx),
  };
  return { impl, s };
}

/**
 * A general-loadout slot picker stand-in (general-loadout rules 10, 12): a
 * 'slot' button on a non-lead slot expands the choice when `showPicker`;
 * 'pick' puts a general in the expanded slot; 'clear' empties a non-lead slot.
 * @param {Array<(string|null)>} slots initial slots
 * @param {boolean} showPicker more choosable generals than slots
 * @returns {{impl: Object, s: {slots: Array, expanded: (number|null), presses: number}}} `impl` is the round's `picker`
 */
export function fakePicker(slots, showPicker) {
  const s = { slots: slots.slice(), expanded: null, presses: 0 };
  const impl = {
    press(intent) {
      s.presses += 1;
      if (intent.button === 'slot' && showPicker && intent.slot > 0) s.expanded = intent.slot;
      else if (intent.button === 'pick' && s.expanded !== null) {
        s.slots[s.expanded] = intent.general;
        s.expanded = null;
      } else if (intent.button === 'clear' && intent.slot > 0) s.slots[intent.slot] = null;
    },
    slots: () => s.slots.slice(),
    collapse() {
      s.expanded = null;
    },
  };
  return { impl, s };
}
