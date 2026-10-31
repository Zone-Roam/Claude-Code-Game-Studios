// Battle pressure (design/gdd/battle-pressure.md; ADR-0002 main loop and tokens,
// ADR-0003 events and queries). PART A: the shared factory and interface
// (tick / onMatch / onMiss / onClear / outcome / metrics / hud, comboReward)
// and the whole boss mode 敌将反击 (rules 3-6, 20-27): step charging, attacks
// resolved in tick under a `hostAttack` token, two HP bars, phase 2 with the
// `phase` token and `bossPhase` event, the specials sweep / charge / roar /
// chain with forecast, the shield and the break mark.
// PART B: press mode 压境 (rules 7-14, 9a: wave table, pushes, 破城, scare,
// combo delay, danger time), food mode 粮草 (rules 15-19, 18a) and Liu Bei's
// healHeart / canHeal (boss) and refillFood / canRefill (food).
// Rules only: time enters through tick(dtGame), randomness through the board's
// named streams, other systems through the injected ctx.
import { UNIT_KINDS, EMPTY_CELL, EFFECT_TARGETS } from '../core/constants.mjs';
import { pushbackCut, pressDelay } from './clear-effects.mjs';

/** Steps one matched pair walks (boss_steps, STEP_MATCH). Rule constant. */
export const STEP_MATCH = 1;
/** Tuning knob (1-3): steps one miss walks (boss_steps, STEP_MISS). */
export const STEP_MISS = 2;
/** Tuning knob (1-3): forecast shows when stepsMax - steps <= this (rule 23d). */
export const FORECAST_STEPS = 2;
/** Tuning knob (1-3): roadblocks the `charge` special places (rule 23a). */
export const CHARGE_BLOCKS = 2;
/** Tuning knob (1-3): pairs the `chain` special converts to 营 (chain_convert). */
export const CHAIN_PAIRS = 2;
/** Tuning knob (2-5): steps the `roar` special seals a general for (rule 23a). */
export const ROAR_SEAL = 3;
/** Default hearts when a chapter omits `boss.hearts` (Tuning Knobs boss.hearts). */
export const BOSS_HEARTS = 3;
/** Recommended `boss.addPairs` (pairs added by a normal attack), used when omitted. */
export const BOSS_ADD_PAIRS = 2;
/** Default phase-1 steps when a chapter omits `boss.steps`. */
export const BOSS_STEPS = 8;
/** Default phase-2 HP and steps when `phase2` omits them (the loader requires both). */
export const PHASE2_HP = 18;
export const PHASE2_STEPS = 6;
/** Slow mode (`slow=1`) step multiplier, rounded at round start (chapter-design rule 14). */
export const SLOW_CHARGE_FACTOR = 1.5;
/** HUD warning tiers by steps left (rule 26). */
export const BOSS_WARN_STEPS_1 = 2;
export const BOSS_WARN_STEPS_2 = 1;
/** Default phase-2 special rotation (Lü Bu): sweep -> charge -> roar (rule 23a). Data. */
export const SPECIALS = Object.freeze(['sweep', 'charge', 'roar']);
/** Legal special ids (rule 23a). */
export const SPECIAL_IDS = Object.freeze(['sweep', 'charge', 'roar', 'chain']);
/** Default display names of the specials (rule 23a). Data. */
export const SPECIAL_NAMES = Object.freeze({ sweep: '画戟横扫', charge: '赤兔冲阵', roar: '虎啸', chain: '铁索连环' });
/** Kinds `chain` never picks (chain_convert): the camp itself and the effect kinds. */
export const CHAIN_SKIP = Object.freeze(['ying', 'huo', 'ma', 'shui']);
/** Kind `chain` converts into. */
export const CHAIN_INTO = 'ying';
/** Slow mode (`slow=1`) press interval multiplier, applied at round start (chapter-design rule 14). */
export const SLOW_PRESS_FACTOR = 1.3;
/** Press interval used when a chapter omits `press.interval` (the three press chapters use 12000). */
export const PRESS_INTERVAL_MS = 12000;
/** Press waves / start rows used when a chapter omits them (Tuning Knobs). */
export const PRESS_WAVES = 8;
export const PRESS_START_ROWS = 4;
/** Gravity press (2026-10-31): halves left open by each generated wave, closed by the next one. */
export const SPLIT_OPEN_HALVES = 2;
/** Food slack used when a chapter omits `food.slack` (food_start, MVP default 2). */
export const FOOD_SLACK = 2;
/** The three pressure modes (rule 1). */
export const PRESSURE_MODES = Object.freeze(['press', 'food', 'boss']);

const OWN_DEFAULTS = {
  STEP_MATCH, STEP_MISS, FORECAST_STEPS, CHARGE_BLOCKS, CHAIN_PAIRS, ROAR_SEAL, BOSS_HEARTS, BOSS_ADD_PAIRS,
  BOSS_STEPS, PHASE2_HP, PHASE2_STEPS, SLOW_CHARGE_FACTOR, HOST_ATTACK_MS: 600, PHASE_SHOW_MS: 1400,
  SLOW_PRESS_FACTOR, PRESS_INTERVAL_MS, PRESS_WAVES, PRESS_START_ROWS, FOOD_SLACK,
};

/**
 * Creates the battle-pressure module for one round (ADR-0002 assembly step 3).
 * Every mode returns the same interface; hooks that mean nothing in a mode
 * return 0 / false / null and change nothing.
 * @param {{chapter: {id: string, mode: string, deck?: Object<string, number>,
 *     pool?: Object<string, number>, enemyLines?: Array<string>, enemies?: Object,
 *     boss?: {enemy?: string, hp?: number, steps?: number, hearts?: number, addPairs?: number,
 *       phase2?: {hp: number, steps: number, name?: string, shout?: string,
 *         lines?: Array<string>, specials?: Array<string>}}},
 *   board: Object, emit: function(Object): void,
 *   acquire: function(string, number=, function(Object)=): Object, release: function(Object): void,
 *   constants?: Object, enemies?: Object, slow?: boolean,
 *   generals?: function(): Array<{id: string, charge: number, need: number}>}} ctx
 *   the round's context. `enemies` (or `chapter.enemies`) is the enemies table
 *   `{id: {name, lines, specialNames?}}`; `slow` is the `slow=1` switch;
 *   `generals` lists the fielded generals in loadout order for the roar target
 *   (can also be bound later with `bindGenerals`).
 * @returns {Object} the pressure interface (see the methods below)
 * @throws {RangeError} on an unknown mode
 * @example
 * const pressure = createPressure(ctx); // ctx.chapter.mode === 'boss'
 * pressure.onMatch({ type: 'match', kind: 'dao' });
 * pressure.tick(16);
 * pressure.hud().steps; // 1
 */
export function createPressure(ctx) {
  const chapter = ctx.chapter || {};
  const mode = chapter.mode;
  if (PRESSURE_MODES.indexOf(mode) === -1) throw new RangeError('battle-pressure: unknown mode ' + mode);
  const K = Object.assign({}, OWN_DEFAULTS, ctx.constants);
  const make = mode === 'boss' ? createBoss : (mode === 'press' ? createPress : createFood);
  return Object.assign(neutralHooks(mode), make(ctx, K));
}

// The hooks of rule 3 / 26 in their "no effect in this mode" form; each mode
// overrides the ones it implements.
function neutralHooks(mode) {
  return {
    /** @returns {string} 'press' | 'food' | 'boss' */
    mode: () => mode,
    /** @returns {number} 0 when the mode has no combo reward */
    comboReward: () => 0,
    /** Zhang Fei in press mode only. @returns {boolean} */
    canScare: () => false,
    /** Press mode only. @returns {void} */
    scareNextPush() {},
    /** Gravity press only. @returns {null} nothing falls */
    settleBoard: () => null,
    /** Gravity press only. @returns {boolean} false: reshuffle as usual */
    holdReshuffle: () => false,
    /** Food mode only. @returns {number} food added */
    addFood: () => 0,
    /** Boss mode only. @returns {number} steps pushed back */
    roarBack: () => 0,
    /** Boss mode only. @returns {void} */
    raiseShield() {},
    /** @returns {boolean} hud().shield in boss mode; always false otherwise (rule 3) */
    hasShield: () => false,
    /** Boss mode only. @returns {null} */
    breakSpecial: () => null,
    /** Boss mode only. @returns {number} 0 */
    sealed: () => 0,
    /** Liu Bei, boss mode only (rule 23e). @returns {number} hearts healed */
    healHeart: () => 0,
    /** @returns {boolean} */
    canHeal: () => false,
    /** Liu Bei, food mode only (rule 18a). @returns {number} food refilled */
    refillFood: () => 0,
    /** @returns {boolean} */
    canRefill: () => false,
    /** Boss steps (TR-battle-pressure-005 `charge`). @returns {number} */
    charge: () => 0,
    /** Boss mode only. @returns {void} */
    resetCharge() {},
    /** Boss mode only (roar target). @returns {void} */
    bindGenerals() {},
    /** Dev/test seam; boss mode only. @returns {void} */
    debugSet() {},
  };
}

// Pool entries [kind, weight] in UNIT_KINDS order (rule 8 draw): chapter `pool`
// or, by default, the deck's pair counts.
function poolEntries(chapter) {
  const source = chapter.pool || {};
  const deck = chapter.deck || {};
  const usePool = chapter.pool !== undefined && chapter.pool !== null;
  const out = [];
  for (const kind of UNIT_KINDS) {
    const weight = usePool ? source[kind] : Math.floor((deck[kind] || 0) / 2);
    if (weight > 0) out.push([kind, weight]);
  }
  return out;
}

function deckPairs(chapter) {
  const deck = chapter.deck || {};
  let n = 0;
  for (const kind of UNIT_KINDS) n += deck[kind] || 0;
  return Math.floor(n / 2);
}

function createBoss(ctx, K) {
  const chapter = ctx.chapter;
  const board = ctx.board;
  const boss = chapter.boss || {};
  const p2 = boss.phase2 || null;
  const enemies = ctx.enemies || chapter.enemies || {};
  const enemy = enemies[boss.enemy] || {};
  const names = Object.assign({}, SPECIAL_NAMES, enemy.specialNames);
  const specials = p2 && Array.isArray(p2.specials) && p2.specials.length > 0 ? p2.specials.slice() : SPECIALS.slice();
  const pool = poolEntries(chapter);
  const slowSteps = (n) => (ctx.slow === true ? Math.round(n * K.SLOW_CHARGE_FACTOR) : n);
  let generals = typeof ctx.generals === 'function' ? ctx.generals : () => [];

  const heartsMax = typeof boss.hearts === 'number' ? boss.hearts : K.BOSS_HEARTS;
  const addPairsN = typeof boss.addPairs === 'number' ? boss.addPairs : K.BOSS_ADD_PAIRS;
  const phase2Steps = p2 ? slowSteps(typeof p2.steps === 'number' ? p2.steps : K.PHASE2_STEPS) : 0;

  let phase = 1;
  let hp = typeof boss.hp === 'number' ? boss.hp : deckPairs(chapter);
  let hpMax = hp;
  let hearts = heartsMax;
  let steps = 0;
  let stepsMax = slowSteps(typeof boss.steps === 'number' ? boss.steps : K.BOSS_STEPS);
  let stun = 0;
  let pushedSinceAttack = 0;
  let shield = false;
  let broken = false;
  let seal = null; // {general, left}
  let lines = Array.isArray(chapter.enemyLines) ? chapter.enemyLines : (Array.isArray(enemy.lines) ? enemy.lines : []);
  let lineNo = 0;
  let attackNo = 0;
  let specialNo = 0;

  const nextSpecial = () => specials[specialNo % specials.length];
  // Rule 24: a two-phase boss whose first bar is empty (or whose board is clear) waits for tick.
  const phaseEnding = () => p2 !== null && phase === 1 && (hp <= 0 || board.isEmpty());
  const finished = () => !phaseEnding() && (hp <= 0 || board.isEmpty());
  // Rule 23: in phase 2 the attack about to come is a special when attackNo is even.
  const nextIsSpecial = () => p2 !== null && phase === 2 && attackNo % 2 === 0;

  function hold(reason, ms) {
    ctx.acquire(reason, ms, (token) => ctx.release(token));
  }

  function drawKinds(n) {
    const stream = board.rng('add');
    const kinds = [];
    for (let i = 0; i < n; i++) {
      const kind = stream.pickWeighted(pool);
      if (kind !== undefined) kinds.push(kind);
    }
    return kinds;
  }

  // Rule 22 "走一步", n times; the seal counts down on every step, stunned or not.
  function walk(n) {
    for (let i = 0; i < n; i++) {
      if (stun > 0) stun -= 1;
      else steps = Math.min(stepsMax, steps + 1);
      if (seal) {
        seal.left -= 1;
        if (seal.left <= 0) {
          const general = seal.general;
          seal = null;
          ctx.emit({ type: 'unseal', general });
        }
      }
    }
  }

  function forecast() {
    if (!nextIsSpecial() || stepsMax - steps > K.FORECAST_STEPS) return null;
    const id = nextSpecial();
    return { id, name: names[id], broken };
  }

  // Rule 24: phase change, resolved in tick. Refill the empty cells, reset the bar.
  function enterPhase2() {
    phase = 2;
    let free = 0;
    for (const cell of board.cells()) if (cell.top === EMPTY_CELL) free++;
    const added = board.addPairs(drawKinds(Math.floor(free / 2)));
    hp = hpMax = typeof p2.hp === 'number' ? p2.hp : K.PHASE2_HP;
    stepsMax = phase2Steps;
    steps = 0;
    stun = 0;
    pushedSinceAttack = 0;
    if (Array.isArray(p2.lines)) lines = p2.lines;
    lineNo = 0;
    attackNo = 0;
    specialNo = 0;
    ctx.emit({ type: 'bossPhase', phase: 2, name: p2.name || null, shout: p2.shout || null, cells: added.cells });
    hold('phase', K.PHASE_SHOW_MS);
  }

  function normalAttack() {
    hearts = Math.max(0, hearts - 1);
    const added = board.addPairs(drawKinds(addPairsN));
    const line = lines.length > 0 ? lines[lineNo % lines.length] : null;
    lineNo += 1;
    ctx.emit({ type: 'hostAttack', kind: 'normal', line, heart: hearts, cells: added.cells });
  }

  // Roar target (rule 23a): the fielded general with the highest charge / need;
  // ties and all-zero go to the earlier slot. No generals -> nobody.
  function roarTarget() {
    const list = generals() || [];
    let best = null;
    let bestRatio = -1;
    for (const g of list) {
      const ratio = g.need > 0 ? g.charge / g.need : 0;
      if (ratio > bestRatio) {
        best = g;
        bestRatio = ratio;
      }
    }
    return best ? best.id : null;
  }

  // chain_convert: CHAIN_PAIRS rounds; each picks a kind (>= 2 on top, not in
  // CHAIN_SKIP) and two of its top cells with the wave stream, then converts them.
  function chain(stream) {
    const out = [];
    for (let round = 0; round < K.CHAIN_PAIRS; round++) {
      const byKind = {};
      for (const cell of board.cells()) {
        if (UNIT_KINDS.indexOf(cell.top) === -1) continue;
        (byKind[cell.top] = byKind[cell.top] || []).push({ r: cell.r, c: cell.c });
      }
      const candidates = UNIT_KINDS.filter((k) => CHAIN_SKIP.indexOf(k) === -1 && byKind[k] && byKind[k].length >= 2);
      if (candidates.length === 0) break;
      const spots = byKind[candidates[stream.int(candidates.length)]];
      const a = spots.splice(stream.int(spots.length), 1)[0];
      const b = spots[stream.int(spots.length)];
      const res = board.convertBlocks([a, b], CHAIN_INTO);
      if (res.ok === false) break;
      for (const cell of res.cells) out.push(cell);
    }
    board.clearSelection(); // every chain clears the selection, even with nothing converted
    return out;
  }

  function specialAttack(id) {
    const stream = board.rng('wave');
    const ev = { type: 'hostAttack', kind: 'special', special: id, name: names[id] };
    if (id === 'sweep') ev.cells = board.shuffleTopRows(stream).cells;
    else if (id === 'charge') ev.cells = board.placeBlocks(K.CHARGE_BLOCKS, stream).cells;
    else if (id === 'chain') ev.cells = chain(stream);
    else if (id === 'roar') {
      const general = roarTarget();
      ev.general = general;
      if (general !== null) {
        seal = { general, left: K.ROAR_SEAL };
        ctx.emit({ type: 'seal', general, left: seal.left });
      }
    }
    ctx.emit(ev);
  }

  // Rule 23: one attack. Board and numbers change first, then the token.
  function attack() {
    steps = 0;
    pushedSinceAttack = 0;
    const isSpecial = nextIsSpecial();
    if (p2 !== null && phase === 2) attackNo += 1;
    if (shield) { // rule 23b
      shield = false;
      if (isSpecial) specialNo += 1;
      ctx.emit({ type: 'hostAttack', kind: 'blocked' });
    } else if (isSpecial && broken) { // rule 23c
      const special = nextSpecial();
      broken = false;
      specialNo += 1;
      ctx.emit({ type: 'hostAttack', kind: 'broken', special, name: names[special] });
    } else if (isSpecial) {
      const special = nextSpecial();
      specialNo += 1;
      specialAttack(special);
    } else {
      normalAttack();
    }
    hold('hostAttack', K.HOST_ATTACK_MS);
  }

  const api = {
    /**
     * Advances the pressure (rules 2, 23, 24). Boss mode ignores time: it changes
     * phase when phase 1 has ended, else attacks when the steps are full and hp > 0.
     * @param {number} dtGame game ms this frame; nothing happens unless > 0
     * @returns {void}
     */
    tick(dtGame) {
      if (!(dtGame > 0)) return;
      if (phaseEnding()) {
        enterPhase2();
        return;
      }
      if (steps >= stepsMax && hp > 0 && !board.isEmpty()) attack();
    },
    /**
     * A matched pair (rules 21, 22): hp - 1, then walks STEP_MATCH steps.
     * @param {Object} match the board's `match` event
     * @returns {void}
     */
    onMatch(match) { // eslint-disable-line no-unused-vars
      hp = Math.max(0, hp - 1);
      walk(K.STEP_MATCH);
    },
    /**
     * A miss (rule 22): walks STEP_MISS steps.
     * @param {Object} miss the board's `miss` event
     * @returns {void}
     */
    onMiss(miss) { // eslint-disable-line no-unused-vars
      walk(K.STEP_MISS);
    },
    /**
     * An effect / skill clear (rule 21): hp - pairs (buried cards included). Not a step.
     * @param {{pairs: number}} clear the board's `clear` result
     * @returns {void}
     */
    onClear(clear) {
      hp = Math.max(0, hp - (clear && clear.pairs > 0 ? clear.pairs : 0));
    },
    /**
     * Combo reward (rule 22, boss_pushback): pushes the steps back by
     * pushbackCut(steps, pushedSinceAttack); emits `comboPushback {cut}` when cut > 0.
     * @returns {number} the steps pushed back
     */
    comboReward() {
      const cut = pushbackCut(steps, pushedSinceAttack);
      if (cut > 0) {
        steps -= cut;
        pushedSinceAttack += cut;
        ctx.emit({ type: 'comboPushback', cut });
      }
      return cut;
    },
    /**
     * Win / lose query (rules 4, 25): win before lose; null while phase 1 waits for the phase change.
     * @returns {{result: ('win'|'lose'|null), reason: (string|null)}}
     */
    outcome() {
      if (phaseEnding()) return { result: null, reason: null };
      if (hp <= 0 || board.isEmpty()) return { result: 'win', reason: null };
      if (hearts <= 0) return { result: 'lose', reason: '城破' };
      return { result: null, reason: null };
    },
    /**
     * Star metrics at the end (rule 27, hearts_net).
     * @returns {{heartsLost: number}}
     */
    metrics() {
      return { heartsLost: heartsMax - hearts };
    },
    /**
     * HUD readout (rule 26).
     * @returns {Object} `{mode, hp, hpMax, phase, phases, steps, stepsMax, stepsLeft, tier,
     *   hearts, heartsMax, stun, shield, seal, forecast, broken, pushedSinceAttack}`
     */
    hud() {
      const stepsLeft = stepsMax - steps;
      const tier = stepsLeft <= BOSS_WARN_STEPS_2 ? 3 : (stepsLeft <= BOSS_WARN_STEPS_1 ? 2 : 1);
      return {
        mode: 'boss', hp, hpMax, phase, phases: p2 ? 2 : 1, steps, stepsMax, stepsLeft, tier,
        hearts, heartsMax, stun, shield, seal: seal ? { general: seal.general, left: seal.left } : null,
        forecast: forecast(), broken, pushedSinceAttack,
      };
    },
    /**
     * Zhang Fei's roar in boss mode (rule 22): steps - back (not below 0), stun set (not added).
     * @param {number} back steps pushed back (ZHANG_PUSHBACK)
     * @param {number} stunSteps stun to set (ZHANG_STUN)
     * @returns {number} the steps actually pushed back
     */
    roarBack(back, stunSteps) {
      const before = steps;
      steps = Math.max(0, steps - back);
      stun = stunSteps;
      return before - steps;
    },
    /** Zhao Yun's shield (rule 23b): blocks the next attack; kept across phases. @returns {void} */
    raiseShield() {
      shield = true;
    },
    /** @returns {boolean} same value as hud().shield (rule 3) */
    hasShield: () => shield,
    /**
     * Zhuge Liang's break (rule 23c): marks the next special as broken.
     * @returns {({special: string, name: string, forecast: boolean}|null)} null when
     *   the boss has no phase 2, is beaten, or is already marked
     */
    breakSpecial() {
      if (p2 === null || broken || finished()) return null;
      const lit = forecast() !== null;
      broken = true;
      const special = nextSpecial();
      return { special, name: names[special], forecast: lit };
    },
    /**
     * @param {string} general general id
     * @returns {number} steps this general stays sealed by roar (0 = not sealed)
     */
    sealed(general) {
      return seal && seal.general === general ? seal.left : 0;
    },
    /** @returns {number} the boss's current steps (TR-battle-pressure-005 `charge`) */
    charge: () => steps,
    /** Sets the steps to 0 (TR-battle-pressure-005 `resetCharge`); stun and pushback budget unchanged. @returns {void} */
    resetCharge() {
      steps = 0;
    },
    /**
     * Binds the fielded generals for the roar target (general-skills is built after pressure).
     * @param {function(): Array<{id: string, charge: number, need: number}>} fn loadout order
     * @returns {void}
     */
    bindGenerals(fn) {
      generals = typeof fn === 'function' ? fn : () => [];
    },
    /**
     * Liu Bei's heal (rule 23e): gain = min(n, heartsMax - hearts), never below 0;
     * one `heal {heart}` per heart, `heart` the position as in hostAttack.heart.
     * Touches nothing else and is not a step.
     * @param {number} n hearts to heal (LIU_HEAL)
     * @returns {number} hearts actually healed
     */
    healHeart(n) {
      const gain = Math.max(0, Math.min(n, heartsMax - hearts));
      for (let i = 0; i < gain; i++) {
        ctx.emit({ type: 'heal', heart: hearts });
        hearts += 1;
      }
      return gain;
    },
    /** @returns {boolean} hearts < heartsMax (rule 23e) */
    canHeal: () => hearts < heartsMax,
    /**
     * Dev/test seam (the GDD's "测试桩设定"): overwrites boss state fields.
     * Never called by game code.
     * @param {{steps?: number, stun?: number, hp?: number, hearts?: number,
     *   shield?: boolean, seal?: ({general: string, left: number}|null)}} patch
     * @returns {void}
     */
    debugSet(patch) {
      if (typeof patch.steps === 'number') steps = patch.steps;
      if (typeof patch.stun === 'number') stun = patch.stun;
      if (typeof patch.hp === 'number') hp = patch.hp;
      if (typeof patch.hearts === 'number') hearts = patch.hearts;
      if (typeof patch.shield === 'boolean') shield = patch.shield;
      if (patch.seal !== undefined) seal = patch.seal ? { general: patch.seal.general, left: patch.seal.left } : null;
    },
  };
  return api;
}

/**
 * Builds the press-mode wave table (rule 8): `waveList` as written, or `waves`
 * rows drawn from `stream`: `floor(cols / 2)` pairs by pool weight, EMPTY_CELL
 * for the odd cell, then the columns shuffled with the same stream. Generated
 * rows never hold roadblocks.
 * @param {{waves: number, waveList?: Array<Array<*>>}} press the chapter's `press` block
 * @param {number} cols board columns (5 or 6)
 * @param {Array<Array>} pool [kind, weight] entries in UNIT_KINDS order
 * @param {{pickWeighted: function(Array): *, shuffle: function(Array): Array}} stream the `wave` stream
 * @returns {Array<Array<*>>} fresh rows of `cols` entries
 * @example buildWaveTable({ waves: 2 }, 5, [['dao', 3], ['gu', 2]], board.rng('wave'))
 *   // [['dao', null, 'gu', 'dao', 'gu'], [...]]
 */
export function buildWaveTable(press, cols, pool, stream) {
  if (Array.isArray(press.waveList)) return press.waveList.map((row) => row.slice());
  const pairs = Math.floor(cols / 2);
  const table = [];
  for (let w = 0; w < press.waves; w++) {
    const row = [];
    for (let i = 0; i < pairs; i++) {
      const kind = stream.pickWeighted(pool);
      row.push(kind, kind);
    }
    while (row.length < cols) row.push(EMPTY_CELL);
    stream.shuffle(row);
    table.push(row);
  }
  return table;
}

/**
 * Builds the gravity-press wave table (2026-10-31): `waveList` as written, or
 * `waves` rows of `floor(cols / 2) * 2` units from `stream`, padded with
 * EMPTY_CELL. Pairs are split across consecutive rows: each row first closes the
 * halves the row before left open, then opens SPLIT_OPEN_HALVES new kinds (not
 * open, not already in the row) and fills the rest with whole pairs; the last
 * row opens nothing, so every kind ends even. Columns are shuffled with the same
 * stream; then a unit that sits under the same kind in the row before (a free
 * vertical match once dropped) swaps with the first cell where neither would.
 * @param {{waves: number, waveList?: Array<Array<*>>}} press the chapter's `press` block
 * @param {number} cols board columns (5 or 6)
 * @param {Array<Array>} pool [kind, weight] entries in UNIT_KINDS order
 * @param {{int: function(number): number, pickWeighted: function(Array): *,
 *   shuffle: function(Array): Array}} stream the `wave` stream
 * @returns {Array<Array<*>>} fresh rows of `cols` entries
 * @example buildSplitWaveTable({ waves: 6 }, 5, [['dao', 3], ['qi', 3], ['jiu', 2], ['gu', 2]], board.rng('wave'))
 *   // [['qi', 'qi', 'dao', '.', 'gu'], ['jiu', 'dao', '.', 'gu', 'qi'], ...]
 */
export function buildSplitWaveTable(press, cols, pool, stream) {
  if (Array.isArray(press.waveList)) return press.waveList.map((row) => row.slice());
  const units = Math.floor(cols / 2) * 2;
  const table = [];
  let open = [];
  for (let w = 0; w < press.waves; w++) {
    const last = w === press.waves - 1;
    const row = open.slice();
    open = [];
    if (!last) {
      const fresh = pool.filter((e) => row.indexOf(e[0]) === -1);
      if (fresh.length >= SPLIT_OPEN_HALVES && units - row.length >= SPLIT_OPEN_HALVES) {
        for (let i = 0; i < SPLIT_OPEN_HALVES; i++) {
          const kind = stream.pickWeighted(pool.filter((e) => row.indexOf(e[0]) === -1));
          row.push(kind);
          open.push(kind);
        }
      }
    }
    while (row.length < units) {
      const unused = pool.filter((e) => row.indexOf(e[0]) === -1);
      const kind = stream.pickWeighted(unused.length > 0 ? unused : pool);
      row.push(kind, kind);
    }
    while (row.length < cols) row.push(EMPTY_CELL);
    const prev = w > 0 ? table[w - 1] : null;
    stream.shuffle(row);
    if (prev !== null) {
      const bad = (v, c) => v !== EMPTY_CELL && prev[c] === v;
      for (let c = 0; c < cols; c++) {
        if (!bad(row[c], c)) continue;
        for (let d = 0; d < cols; d++) {
          if (d === c || bad(row[c], d) || bad(row[d], c)) continue;
          const keep = row[c];
          row[c] = row[d];
          row[d] = keep;
          break;
        }
      }
    }
    table.push(row);
  }
  return table;
}

// Press mode 压境 (rules 7-14, 9a). Time comes only from tick(dtGame).
// Gravity press (`press.gravity`, 2026-10-31): the board settles downwards, rows
// drop onto the column stacks, and the top row (not the bottom row) is the danger line.
function createPress(ctx, K) {
  const board = ctx.board;
  const press = ctx.chapter.press || {};
  const cols = board.cols;
  const baseInterval = typeof press.interval === 'number' ? press.interval : K.PRESS_INTERVAL_MS;
  const interval = ctx.slow === true ? Math.round(baseInterval * K.SLOW_PRESS_FACTOR) : baseInterval;
  const spec = { waves: typeof press.waves === 'number' ? press.waves : K.PRESS_WAVES, waveList: press.waveList };
  const gravity = press.gravity === true;
  const table = (gravity ? buildSplitWaveTable : buildWaveTable)(spec, cols, poolEntries(ctx.chapter), board.rng('wave'));
  if (gravity) board.gravity(); // the dealt start rows settle before the first frame
  const danger = () => (gravity ? board.topOccupied() : board.bottomOccupied());
  const waves = table.length;
  const emptyRow = () => new Array(cols).fill(EMPTY_CELL);

  let t = 0;
  let nextPush = interval;
  let comboDelayW = 0;
  let wave = 0;
  let scare = false;
  let breached = false;
  let stuck = false; // gravity press: no linkable pair after the last settle
  let dangerMs = 0;

  // Rule 9: one push (a wave row while there are waves, an empty row after).
  function push() {
    const wasWave = wave < waves;
    const row = wasWave ? table[wave].slice() : emptyRow();
    const res = gravity ? board.dropRow(row) : board.pushRowFromTop(row);
    if (res.ok === false) return;
    if (wasWave) wave += 1;
    nextPush = t + interval;
    comboDelayW = 0;
    ctx.emit(res);
    if (wasWave && wave === waves) ctx.emit({ type: 'lastWave' });
  }

  return {
    /**
     * Advances the press (rules 9, 10, 13, 14): danger time first (the bottom
     * row holds a unit at the start of the frame), then an immediate push on a
     * cleared board with waves left, else the scheduled push / scare / breach.
     * @param {number} dtGame game ms; nothing happens unless > 0
     * @returns {void}
     */
    tick(dtGame) {
      if (!(dtGame > 0)) return;
      if (danger()) dangerMs += dtGame;
      t += dtGame;
      if (breached) return;
      if ((board.isEmpty() || stuck) && wave < waves) {
        stuck = false;
        push(); // rule 10: not delayed, not scared; the scare mark stays armed
        return;
      }
      if (t < nextPush) return;
      if (scare) { // rule 13
        scare = false;
        nextPush = t + interval;
        comboDelayW = 0;
        ctx.emit({ type: 'scared' });
      } else if (danger()) {
        breached = true; // 破城: no push
      } else {
        push();
      }
    },
    /** Press mode does nothing on a match (roadblock breaking is the board's). @returns {void} */
    onMatch() {},
    /** @returns {void} */
    onMiss() {},
    /** @returns {void} */
    onClear() {},
    /**
     * Combo delay (rule 12, press_delay): nextPush += pressDelay(comboDelayW).
     * @returns {number} ms delayed now
     */
    comboReward() {
      const delay = pressDelay(comboDelayW);
      nextPush += delay;
      comboDelayW += delay;
      return delay;
    },
    /**
     * Rules 9, 11: win when every wave is pushed and the board is clear; lose
     * 破城 after a breach. Win is checked first.
     * @returns {{result: ('win'|'lose'|null), reason: (string|null)}}
     */
    outcome() {
      if (wave >= waves && board.isEmpty()) return { result: 'win', reason: null };
      if (breached) return { result: 'lose', reason: '破城' };
      return { result: null, reason: null };
    },
    /** @returns {{dangerMs: number}} floored (rule 14) */
    metrics: () => ({ dangerMs: Math.floor(dangerMs) }),
    /**
     * @returns {{mode: string, msToNextPush: number, interval: number, wave: number,
     *   waves: number, bottomOccupied: boolean, danger: boolean, gravity: boolean,
     *   scareArmed: boolean}} rule 26; `danger`: the next push breaches (top row
     *   occupied under gravity, bottom row otherwise)
     */
    hud: () => ({
      mode: 'press', msToNextPush: Math.max(0, nextPush - t), interval, wave, waves,
      bottomOccupied: board.bottomOccupied(), danger: danger(), gravity, scareArmed: scare,
    }),
    /** @returns {boolean} the next push would breach and no scare is armed (rule 13) */
    canScare: () => danger() && !scare,
    /**
     * Gravity press: settles the columns after the board changed (round-flow calls
     * it at the settle point, before the outcome) and notes whether any pair is
     * left to link: with none, the next tick pushes at once, like a cleared
     * board (rule 10). Plain press does nothing.
     * @returns {(Object|null)} the board's `{type: 'fall', moves}`, or null
     */
    settleBoard() {
      if (!gravity) return null;
      const fall = board.gravity();
      stuck = !board.isEmpty() && !board.hasPlayablePair();
      return fall;
    },
    /**
     * Gravity press leaves unpaired halves on the board until their wave comes,
     * so a board with no playable pair waits for the next push instead of being
     * reshuffled while waves are left.
     * @returns {boolean}
     */
    holdReshuffle: () => gravity && wave < waves,
    /** Zhang Fei (rule 13): the next scheduled push is scared off. @returns {void} */
    scareNextPush() {
      scare = true;
    },
    /** @returns {Array<Array<*>>} a copy of the wave table (fixed at round start) */
    waveTable: () => table.map((row) => row.slice()),
  };
}

/**
 * Starting food (food_start): pairs - wipePairs + slack, where wipePairs counts,
 * for each effect kind present in the deck, the pairs of its target kind.
 * @param {Object<string, number>} deck unit counts
 * @param {number} slack spare food
 * @returns {number}
 * @example foodStart({ huo: 2, ying: 6, ma: 2, gong: 6, shui: 2, cheng: 8, dao: 4, gu: 4, dun: 4, shu: 4, qi: 6 }, 2) // 16
 */
export function foodStart(deck, slack) {
  let pairs = 0;
  for (const kind of UNIT_KINDS) pairs += (deck[kind] || 0) / 2;
  let wipe = 0;
  for (const effect of Object.keys(EFFECT_TARGETS)) {
    if ((deck[effect] || 0) > 0) wipe += (deck[EFFECT_TARGETS[effect]] || 0) / 2;
  }
  return pairs - wipe + slack;
}

// Food mode 粮草 (rules 15-19, 18a). tick changes nothing.
function createFood(ctx, K) {
  const board = ctx.board;
  const foodCfg = ctx.chapter.food || {};
  const food0 = foodStart(ctx.chapter.deck || {}, typeof foodCfg.slack === 'number' ? foodCfg.slack : K.FOOD_SLACK);
  let food = food0;
  let misses = 0;

  function spend(cause) {
    food -= 1;
    ctx.emit({ type: 'foodSpent', amount: 1, cause });
  }

  return {
    /** @returns {void} food mode is untimed (rule 15) */
    tick() {},
    /**
     * Rule 17: a player match spends 1 food; Zhao Yun's forced pair does not.
     * @param {{forced?: boolean}} match
     * @returns {void}
     */
    onMatch(match) {
      if (!(match && match.forced === true)) spend('match');
    },
    /** Rule 17: a miss spends 1 food and counts a miss. @returns {void} */
    onMiss() {
      misses += 1;
      spend('miss');
    },
    /** Effect / skill clears cost nothing (rule 17). @returns {void} */
    onClear() {},
    /**
     * Rule 19: a clear board wins; else food <= 0 loses 粮草断绝.
     * @returns {{result: ('win'|'lose'|null), reason: (string|null)}}
     */
    outcome() {
      if (board.isEmpty()) return { result: 'win', reason: null };
      if (food <= 0) return { result: 'lose', reason: '粮草断绝' };
      return { result: null, reason: null };
    },
    /** @returns {{foodLeft: number, misses: number}} rule 27 */
    metrics: () => ({ foodLeft: Math.max(0, food), misses }),
    /** @returns {{mode: string, food: number, food0: number, misses: number}} rule 26 */
    hud: () => ({ mode: 'food', food, food0, misses }),
    /**
     * Zhang Fei (rule 18): adds food, may exceed food0.
     * @param {number} n food to add (ROAR_FOOD)
     * @returns {number} food added
     */
    addFood(n) {
      const gain = n > 0 ? n : 0;
      food += gain;
      return gain;
    },
    /**
     * Liu Bei (rule 18a): gain = min(n, food0 - food), never below 0; emits
     * `foodRefill {amount}` when gain > 0. Misses unchanged.
     * @param {number} n food to refill (LIU_FOOD)
     * @returns {number} food refilled
     */
    refillFood(n) {
      const gain = Math.max(0, Math.min(n, food0 - food));
      food += gain;
      if (gain > 0) ctx.emit({ type: 'foodRefill', amount: gain });
      return gain;
    },
    /** @returns {boolean} food < food0 (rule 18a) */
    canRefill: () => food < food0,
  };
}
