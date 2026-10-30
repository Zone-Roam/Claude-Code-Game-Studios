// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// 战场压力 (design/gdd/battle-pressure.md) — the slice implements boss mode only (rules 20–27).
// SLICE EXPERIMENTS, not yet in the GDD:
// - v4 (2026-10-27): an optional second phase. Phase 1 ends when its hp runs out (or the board empties);
//   the next tick refills the board, sets the phase-2 hp and holds a 'phase' token for the show.
// - v5 (2026-10-28, DESIGN-v5.md): the enemy charges by moves (a match +1 step, a miss +2), not by time.
//   Phase 2 alternates specials and normal attacks; specials are forecast; Zhao Yun's shield blocks an
//   attack, Zhang Fei pushes back and stuns, Zhuge Liang breaks the next special, 虎啸 seals a general.

import {
  KINDS, HOST_ATTACK_MS, PHASE_SHOW_MS, STEP_MATCH, STEP_MISS, COMBO_PUSHBACK, COMBO_PUSHBACK_CAP,
  ZHANG_PUSHBACK, ZHANG_STUN, ROAR_SEAL, CHARGE_BLOCKS, FORECAST_STEPS, SPECIAL_NAMES, DEFAULT_SPECIALS,
  CHAIN_PAIRS, CHAIN_SKIP,
} from '../core/constants.mjs';
import { devAssert } from '../core/assert.mjs';
import { createPress, createFood } from './press-food.mjs';

/**
 * Pressure for the chapter's mode (rule 1). Press and food live in press-food.mjs (added 2026-10-30).
 * @param {object} ctx round context
 * @returns {object} pressure API
 */
export function createPressure(ctx) {
  const mode = ctx.chapter.mode;
  if (mode === 'press') return createPress(ctx);
  if (mode === 'food') return createFood(ctx);
  devAssert(mode === 'boss', 'unknown mode ' + mode);
  return createBoss(ctx);
}

/**
 * @param {object} ctx round context
 * @returns {object} boss pressure API
 */
function createBoss(ctx) {
  const { chapter, board, emit, acquire, release } = ctx;
  const boss = chapter.boss;
  const phase2 = boss.phase2 || null;
  let phase = 1;
  let hpMax = boss.hp || board.pairsLeft();
  let hp = hpMax;
  let stepsMax = boss.steps;
  let steps = 0;
  let lines = chapter.enemyLines;
  let hearts = boss.hearts;
  let pushedSinceAttack = 0;
  let lineIndex = 0;
  let stun = 0;
  let shield = false;
  let seal = null; // { general, left }
  let attackNo = 0; // attacks made in phase 2
  let specialNo = 0; // specials made (rotation index)
  let broken = false; // Zhuge Liang broke the coming special
  let skills = null;
  let hits = 0; // normal attacks that took a heart
  let healed = 0; // hearts Liu Bei gave back
  // rule 23a: rotation from phase2.specials, default Lü Bu's three
  const specials = (phase2 && phase2.specials && phase2.specials.length ? phase2.specials : DEFAULT_SPECIALS)
    .map((id) => ({ id, name: SPECIAL_NAMES[id] }));

  function poolEntries() {
    const pool = chapter.pool || null;
    const entries = [];
    for (const k of KINDS) {
      const w = pool ? pool[k] || 0 : (chapter.deck[k] || 0) / 2;
      if (w > 0) entries.push([k, w]);
    }
    return entries;
  }

  // Each move: a stunned enemy spends stun instead of charging; seals count down either way.
  function advance(n) {
    for (let i = 0; i < n; i++) {
      if (stun > 0) stun -= 1;
      else steps = Math.min(stepsMax, steps + 1);
      if (seal) {
        seal.left -= 1;
        if (seal.left <= 0) {
          emit({ type: 'unseal', general: seal.general });
          seal = null;
        }
      }
    }
  }

  function nextIsSpecial() {
    return phase === 2 && attackNo % 2 === 0;
  }

  function nextSpecial() {
    return specials[specialNo % specials.length];
  }

  function show(detail) {
    acquire('hostAttack', HOST_ATTACK_MS, (tok) => release(tok), detail);
  }

  function normalAttack() {
    hearts -= 1;
    hits += 1;
    const stream = board.rng('add');
    const entries = poolEntries();
    const kinds = [];
    for (let i = 0; i < boss.addPairs; i++) kinds.push(stream.pickWeighted(entries));
    board.addPairs(kinds);
    const line = lineIndex % lines.length;
    lineIndex++;
    emit({ type: 'hostAttack', line, kind: 'normal', heart: hearts });
    show({ line, text: lines[line], kind: 'normal', heart: hearts });
  }

  function special() {
    const sp = nextSpecial();
    specialNo++;
    if (broken) {
      broken = false;
      emit({ type: 'hostAttack', kind: 'broken', special: sp.id });
      show({ text: '妙计已破', kind: 'broken', special: sp.id, name: sp.name });
      return;
    }
    let detail = { text: sp.name + '！', kind: 'special', special: sp.id, name: sp.name };
    if (sp.id === 'sweep') {
      const r = board.shuffleTopRows(board.rng('wave'));
      detail.cells = r.cells;
    } else if (sp.id === 'charge') {
      const r = board.placeBlocks(CHARGE_BLOCKS, board.rng('wave'));
      detail.cells = r.cells;
    } else if (sp.id === 'chain') {
      detail.cells = chain();
    } else if (sp.id === 'roar') {
      const target = roarTarget();
      if (target) {
        seal = { general: target, left: ROAR_SEAL };
        detail.general = target;
        emit({ type: 'seal', general: target, left: ROAR_SEAL });
      }
    }
    emit({ type: 'hostAttack', kind: 'special', special: sp.id });
    show(detail);
  }

  // 铁索连环 (rule 23a, formula chain_convert): CHAIN_PAIRS rounds, each turns 2 top tiles of one kind into 营.
  function chain() {
    const stream = board.rng('wave');
    const cells = [];
    for (let i = 0; i < CHAIN_PAIRS; i++) {
      const E = KINDS.filter((k) => CHAIN_SKIP.indexOf(k) < 0 && board.cellsOf(k).length >= 2);
      if (E.length === 0) break;
      const k = E[stream.int(E.length)];
      const pool = board.cellsOf(k);
      const a = pool.splice(stream.int(pool.length), 1)[0];
      const b = pool[stream.int(pool.length)];
      const res = board.convertBlocks([a, b], 'ying');
      if (res.ok === false) break;
      cells.push(...res.cells);
    }
    board.clearSelection();
    return cells;
  }

  // The general closest to a skill (most charge relative to need); ties by roster order.
  function roarTarget() {
    if (!skills) return null;
    let best = null;
    let bestScore = -1;
    for (const c of skills.cards()) {
      const score = c.charge / c.need;
      if (score > bestScore) { best = c.id; bestScore = score; }
    }
    return best;
  }

  // Rule 23 (v5): attack when the bar is full and the enemy still has hp.
  function attack() {
    const isSpecial = nextIsSpecial();
    steps = 0;
    pushedSinceAttack = 0;
    if (phase === 2) attackNo++;
    if (shield) {
      shield = false;
      if (isSpecial) specialNo++;
      emit({ type: 'hostAttack', kind: 'blocked' });
      show({ text: '赵云挡下！', kind: 'blocked' });
      return;
    }
    if (isSpecial) special();
    else normalAttack();
  }

  function phaseOver() {
    return phase2 && phase === 1 && (hp <= 0 || board.isEmpty());
  }

  // Refill the board with reinforcements and start phase 2.
  function enterPhase2() {
    phase = 2;
    const free = board.rows * board.cols - board.occupied().length - board.blocks().length;
    const stream = board.rng('add');
    const entries = poolEntries();
    const kinds = [];
    for (let i = 0; i < Math.floor(free / 2); i++) kinds.push(stream.pickWeighted(entries));
    board.addPairs(kinds);
    hpMax = phase2.hp;
    hp = hpMax;
    stepsMax = phase2.steps;
    lines = phase2.lines || lines;
    lineIndex = 0;
    steps = 0;
    stun = 0;
    pushedSinceAttack = 0;
    emit({ type: 'bossPhase', phase: 2, name: phase2.name || null });
    acquire('phase', PHASE_SHOW_MS, (tok) => release(tok), { phase: 2, name: phase2.name || null, text: phase2.shout || null });
  }

  return {
    bindSkills(s) { skills = s; },
    onMatch() {
      hp = Math.max(0, hp - 1);
      advance(STEP_MATCH);
    },
    onMiss() { advance(STEP_MISS); },
    onClear(clear) { hp = Math.max(0, hp - clear.pairs); },
    /** A 3+ combo pushes the enemy back one step (at most COMBO_PUSHBACK_CAP per attack cycle). */
    comboReward() {
      const cut = Math.min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP - pushedSinceAttack, steps);
      if (cut <= 0) return 0;
      steps -= cut;
      pushedSinceAttack += cut;
      return cut;
    },
    /** Zhang Fei. */
    roarBack() {
      steps = Math.max(0, steps - ZHANG_PUSHBACK);
      stun = ZHANG_STUN;
    },
    /** Zhao Yun. */
    raiseShield() { shield = true; },
    /** Zhuge Liang (rule 23c): valid in either phase when the enemy has a phase 2; null otherwise. */
    breakSpecial() {
      if (!phase2 || broken) return null;
      broken = true;
      const sp = nextSpecial();
      return { special: sp.id, name: sp.name, forecast: !!this.hud().forecast };
    },
    /** Liu Bei (rule 23e): heal up to n hearts, never above heartsMax; returns the gain. */
    healHeart(n) {
      const gain = Math.max(0, Math.min(n, boss.hearts - hearts));
      hearts += gain;
      healed += gain;
      for (let i = 0; i < gain; i++) emit({ type: 'heal', heart: hearts - gain + i });
      return gain;
    },
    canHeal() { return hearts < boss.hearts; },
    canScare() { return false; },
    canRefill() { return false; },
    sealed(general) { return seal && seal.general === general ? seal.left : 0; },
    charge() { return stepsMax ? (100 * steps) / stepsMax : 0; },
    /** @returns {boolean} whether the board changed (an attack or phase change) */
    tick() {
      if (phaseOver()) {
        enterPhase2();
        return true;
      }
      if (steps >= stepsMax && hp > 0) {
        attack();
        return true;
      }
      return false;
    },
    outcome() {
      if (phaseOver()) return { result: null, reason: null };
      if (hp <= 0 || board.isEmpty()) return { result: 'win', reason: null };
      if (hearts <= 0) return { result: 'lose', reason: '城破' };
      return { result: null, reason: null };
    },
    hud() {
      const special = nextIsSpecial() && stepsMax - steps <= FORECAST_STEPS ? nextSpecial() : null;
      return {
        hp, hpMax, steps, stepsMax, charge: stepsMax ? (100 * steps) / stepsMax : 0,
        hearts, heartsMax: boss.hearts, pushedSinceAttack, phase, phases: phase2 ? 2 : 1,
        stun, shield, seal: seal ? { general: seal.general, left: seal.left } : null,
        forecast: special ? { id: special.id, name: special.name, broken } : null,
      };
    },
    metrics() { return { heartsLost: boss.hearts - hearts, hits, healed }; },
  };
}
