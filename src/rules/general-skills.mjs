// General skills (design/gdd/general-skills.md; ADR-0002 tokens, ADR-0003 events
// and queries; TR-general-skills-001..006).
// PART A: the general table, charging from player matches (rules 2-5), card
// states and the hint order (rules 6, 7, States and Transitions), the `skill`
// token with the effect landing at token end (rules 8-10), Zhang Fei (rule 12),
// Zhao Yun (rule 13) and Zhuge Liang with its skillResult banner (rule 14), the
// skill-line table for the open card (rule 18).
// PART B: Guan Yu's row cut (rule 11; formula guan_cut), Huang Zhong's column
// shot (rule 14b; formula huang_cut), sharing one line-cut target routine, and
// Liu Bei's heal / refill / gift (rule 14a; formulas liu_gift, liu_heal /
// liu_food). Row / column select itself is round-flow's input mode (round-flow
// rule 5a): tapCard returns 'row' / 'col', round-flow asks rowSelectable /
// colSelectable and calls cutRow / cutCol.
// No player-facing text is formatted here (control manifest, Feature layer):
// hints and banners go out as reason codes and numbers; the view words them.
import { UNIT_KINDS } from '../core/constants.mjs';

/** Skill show length (ms, default; art bible section 7 timeline). Must stay below TOKEN_MAX_MS. */
export const SKILL_SHOW_MS = 950;
/** Most generals fielded in one round (general-loadout). */
export const SLOT_MAX = 3;
/** Legal range of a per-chapter `need` override (Tuning Knobs). */
export const NEED_MIN = 1;
export const NEED_MAX = 4;
/** Zhang Fei, boss mode: steps pushed back and steps of stun (set, not added). */
export const ZHANG_PUSHBACK = 3;
export const ZHANG_STUN = 3;
/** Zhang Fei, food mode: food taken back (may exceed the opening food). */
export const ROAR_FOOD = 3;
/** Liu Bei: hearts healed, charge given to each other general, food refilled. */
export const LIU_HEAL = 1;
export const LIU_GIFT = 1;
export const LIU_FOOD = 2;

/**
 * The general table (rule 1): charge kind, default `need`, and how the card
 * fires: 'row' / 'col' enter a select mode first, 'tap' fires at once.
 */
export const GENERALS = Object.freeze({
  guan_yu: Object.freeze({ kind: 'dao', need: 2, fire: 'row' }),
  zhang_fei: Object.freeze({ kind: 'gu', need: 3, fire: 'tap' }),
  zhao_yun: Object.freeze({ kind: 'dun', need: 3, fire: 'tap' }),
  zhuge_liang: Object.freeze({ kind: 'shu', need: 4, fire: 'tap' }),
  liu_bei: Object.freeze({ kind: 'qi', need: 3, fire: 'tap' }),
  huang_zhong: Object.freeze({ kind: 'gong', need: 3, fire: 'col' }),
});

/**
 * Default open-card skill lines per general and mode (rule 18, <= 12 chars).
 * Data only: a chapter's `texts.skillLine[id][mode]` replaces an entry. The
 * numbers in these defaults match ZHANG_PUSHBACK, ZHANG_STUN, ROAR_FOOD and
 * LIU_FOOD; when those change, the chapter data carries the new line.
 */
export const SKILL_LINES = Object.freeze({
  guan_yu: Object.freeze({ boss: '点选一排，整排斩掉', press: '点选一排，整排斩掉', food: '点选一排，整排斩掉' }),
  zhang_fei: Object.freeze({ boss: '敌将退三步，三步不涨', press: '底排有兵时，吓退一次', food: '抢回三份粮' }),
  zhao_yun: Object.freeze({ boss: '挡下敌将下一招', press: '下一对同种兵必消', food: '下一对同种兵必消' }),
  zhuge_liang: Object.freeze({ boss: '清最多的兵，破下一个特技', press: '清掉最多的那种兵', food: '清掉最多的那种兵' }),
  liu_bei: Object.freeze({ boss: '补一颗心，众将各蓄一格', press: '众将各蓄一格', food: '补两份粮，众将各蓄一格' }),
  huang_zhong: Object.freeze({ boss: '点选一列，整列射穿', press: '点选一列，整列射穿', food: '点选一列，整列射穿' }),
});

/**
 * The open-card skill line for one general (rule 18): the chapter's
 * `texts.skillLine[id][mode]` when present, else SKILL_LINES.
 * @param {string} id general id
 * @param {string} mode 'boss' | 'press' | 'food'
 * @param {Object} [texts] the chapter's `texts`
 * @returns {(string|null)} null for an unknown general or mode
 * @example skillLine('zhang_fei', 'boss') // '敌将退三步，三步不涨'
 */
export function skillLine(id, mode, texts) {
  const over = texts && texts.skillLine && texts.skillLine[id];
  if (over && typeof over[mode] === 'string') return over[mode];
  const row = SKILL_LINES[id];
  return row && typeof row[mode] === 'string' ? row[mode] : null;
}

/**
 * Creates the skills system for one round (ADR-0002 assembly: round-flow calls
 * it at 开讲 with `Object.assign({}, ctx, {pressure, loadout})`).
 * @param {{loadout: string[], chapter: {mode: string, need?: Object<string, number>},
 *   constants?: Object, board: Object, pressure: Object,
 *   acquire: function(string, number, function(Object): void, *): Object,
 *   release: function(Object): void, dispatch: function(Object): void,
 *   emit: function(Object): void, selecting?: function(): (string|null)}} ctx
 *   `constants` may override SKILL_SHOW_MS, ZHANG_PUSHBACK, ZHANG_STUN, ROAR_FOOD,
 *   LIU_HEAL, LIU_GIFT, LIU_FOOD. Liu Bei also needs pressure.healHeart / canHeal
 *   (boss) and refillFood / canRefill (food) (battle-pressure rules 18a, 23e).
 * @returns {Object} onMatch, tapCard, onPush, rowSelectable, cutRow,
 *   colSelectable, cutCol and the queries cards, skillsUsed
 * @throws {RangeError} for an unknown or repeated general, more than SLOT_MAX
 *   generals, or a `need` override outside NEED_MIN..NEED_MAX
 * @example
 * const skills = createSkills(Object.assign({}, ctx, { pressure, loadout: ['zhang_fei'] }));
 * skills.onMatch({ type: 'match', kind: 'gu', forced: false });
 * skills.cards()[0].charge // 1
 */
export function createSkills(ctx) {
  const K = Object.assign({ SKILL_SHOW_MS, ZHANG_PUSHBACK, ZHANG_STUN, ROAR_FOOD, LIU_HEAL, LIU_GIFT, LIU_FOOD }, ctx.constants);
  const chapter = ctx.chapter || {};
  const mode = chapter.mode;
  const board = ctx.board;
  const pressure = ctx.pressure;
  const loadout = Array.isArray(ctx.loadout) ? ctx.loadout.slice() : [];
  if (loadout.length > SLOT_MAX) throw new RangeError('more than SLOT_MAX generals');

  const needOver = chapter.need || {};
  const cards = loadout.map((id, i) => {
    if (!Object.prototype.hasOwnProperty.call(GENERALS, id)) throw new RangeError('unknown general: ' + id);
    if (loadout.indexOf(id) !== i) throw new RangeError('general fielded twice: ' + id);
    let need = GENERALS[id].need;
    if (Object.prototype.hasOwnProperty.call(needOver, id)) {
      need = needOver[id];
      if (!Number.isInteger(need) || need < NEED_MIN || need > NEED_MAX) {
        throw new RangeError('need out of range for ' + id);
      }
    }
    return { id, kind: GENERALS[id].kind, need, charge: 0, used: 0, standby: false };
  });
  // The general whose `skill` token is held (rule 8 step 3), else null.
  let showing = null;

  function card(id) {
    return cards.find((c) => c.id === id) || null;
  }

  function sealedLeft(id) {
    return typeof pressure.sealed === 'function' ? (pressure.sealed(id) || 0) : 0;
  }

  // TR-general-skills-006: the roar (虎啸) target reads live charge / need, so
  // Liu Bei's gift changes it. Pressure is built first; skills binds itself here.
  if (typeof pressure.bindGenerals === 'function') {
    pressure.bindGenerals(() => cards.map((c) => ({ id: c.id, charge: c.charge, need: c.need })));
  }

  // Rule 3: +1 up to need; rule 5: emit skillReady on the step to full.
  function addCharge(c, n) {
    if (c.standby || c.charge >= c.need) return;
    c.charge = Math.min(c.need, c.charge + n);
    if (c.charge === c.need) ctx.emit({ type: 'skillReady', general: c.id });
  }

  // Rule 14a / formula liu_gift: the generals Liu Bei's gift reaches: fielded,
  // not `fromId`, not full, not Zhao Yun in stand-by. Sealed generals count.
  function receivers(fromId) {
    return cards.filter((c) => c.id !== fromId && !c.standby && c.charge < c.need);
  }

  // Rule 14a: give `n` charge to every receiver (not a match, not a clear: no
  // combo, no effect, no step). Emits `gift {generals}` when anyone received,
  // then skillReady (rule 5) for each one that became full. Returns the ids.
  function giveCharge(fromId, n) {
    const got = receivers(fromId);
    const ids = got.map((c) => c.id);
    if (ids.length > 0) ctx.emit({ type: 'gift', general: fromId, generals: ids });
    for (const c of got) addCharge(c, n);
    return ids;
  }

  // Rule 14a no-effect table: both halves must miss.
  function liuNoEffect(c) {
    if (receivers(c.id).length > 0) return null;
    if (mode === 'boss') return pressure.canHeal() ? null : 'heartsFullGeneralsFull';
    if (mode === 'food') return pressure.canRefill() ? null : 'foodFullGeneralsFull';
    return cards.length === 1 ? 'noGenerals' : 'generalsFull';
  }

  // Rule 7 item 4: why a full card would do nothing now, or null.
  function noEffect(c) {
    if (c.id === 'liu_bei') return liuNoEffect(c);
    if (c.id === 'zhang_fei') return mode === 'press' && !pressure.canScare() ? 'roarUseless' : null;
    if (c.id === 'zhao_yun') return mode === 'boss' && pressure.hasShield() ? 'hasShield' : null;
    if (c.id === 'zhuge_liang') return board.pairsLeft() === 0 ? 'boardEmpty' : null;
    if (c.id === 'guan_yu' || c.id === 'huang_zhong') return board.isEmpty() && board.blocks().length === 0 ? 'boardEmpty' : null;
    return null;
  }

  // Rule 7: the first reason the card cannot fire, in the GDD's order, or null.
  function hintFor(c) {
    const left = sealedLeft(c.id);
    if (left > 0) return { reason: 'sealed', left };
    if (c.standby) return { reason: 'standby' };
    if (c.charge < c.need) return { reason: 'uncharged', kind: c.kind, short: c.need - c.charge };
    const why = noEffect(c);
    return why ? { reason: 'noEffect', why } : null;
  }

  // Formulas guan_cut / huang_cut (rules 11, 14b): every top unit on the line
  // with all the cards under it, every roadblock on it, then one extra card
  // per kind cut an odd number of times (top layer + buried counted
  // together): first a top-layer unit off the line, bottom row up, left to
  // right; else the top buried card off the line in buriedCells order (top row
  // down, left to right). Kinds are visited in UNIT_KINDS order. A cell already
  // taken for an extra is skipped, so one clearCells target never asks for
  // both its top and its buried card. Returns clearCells targets.
  function lineTargets(contents, onLine) {
    const targets = [];
    const n = {};
    const tally = (kind) => { n[kind] = (n[kind] || 0) + 1; };
    for (const u of contents.units) {
      targets.push({ r: u.r, c: u.c, layer: 'stack' });
      tally(u.kind);
    }
    for (const b of contents.buried) tally(b.kind);
    for (const b of contents.blocks) targets.push({ r: b.r, c: b.c, layer: 'block' });

    const taken = {};
    const key = (p) => p.r + ':' + p.c;
    const free = (p) => !onLine(p) && !taken[key(p)];
    const bottomUp = board.cells().slice().sort((a, b) => (b.r - a.r) || (a.c - b.c));
    for (const kind of UNIT_KINDS) {
      if (!n[kind] || n[kind] % 2 === 0) continue;
      const onTop = bottomUp.find((p) => p.top === kind && free(p));
      if (onTop) {
        taken[key(onTop)] = true;
        targets.push({ r: onTop.r, c: onTop.c, layer: 'top' });
        continue;
      }
      const under = board.buriedCells(kind).find(free);
      if (under) {
        taken[key(under)] = true;
        targets.push({ r: under.r, c: under.c, layer: 'under' });
      }
      // None found breaks I1 (cannot happen, Edge Cases); clearCells then
      // refuses the whole cut with {ok: false}.
    }
    return targets;
  }

  // Whether a line holds any unit or roadblock (rules 11, 14b select).
  function lineHasBlocks(read) {
    let contents;
    try {
      contents = read();
    } catch (err) {
      if (err instanceof RangeError) return false; // off the playable area
      throw err;
    }
    return contents.units.length > 0 || contents.blocks.length > 0;
  }

  // Rule 8 step 2: the target, fixed when the token starts.
  function target(c, line) {
    if (c.id === 'guan_yu') {
      return { targets: lineTargets(board.rowContents(line), (p) => p.r === line) };
    }
    if (c.id === 'huang_zhong') {
      return { targets: lineTargets(board.colContents(line), (p) => p.c === line) };
    }
    if (c.id === 'zhuge_liang') {
      let best = null;
      let most = 0;
      for (const kind of UNIT_KINDS) {
        const n = board.count(kind);
        if (n > most) {
          best = kind;
          most = n;
        }
      }
      return { kind: best };
    }
    return null;
  }

  // Rule 8 step 4: the effect, at token end.
  const EFFECTS = {
    zhang_fei() {
      if (mode === 'boss') pressure.roarBack(K.ZHANG_PUSHBACK, K.ZHANG_STUN);
      else if (mode === 'press') pressure.scareNextPush();
      else pressure.addFood(K.ROAR_FOOD);
    },
    zhao_yun(c) {
      if (mode === 'boss') {
        pressure.raiseShield();
        return;
      }
      board.setForceNext(true);
      c.standby = true;
      ctx.emit({ type: 'skillArmed', general: c.id });
    },
    zhuge_liang(c, aim) {
      const res = board.clearKind(aim.kind, 'skill');
      if (res.ok === false) return; // I1 already broken: nothing cleared
      ctx.dispatch(res);
      const broke = mode === 'boss' && typeof pressure.breakSpecial === 'function' ? pressure.breakSpecial() : null;
      ctx.emit({
        type: 'skillResult', general: c.id, kind: aim.kind, pairs: res.pairs,
        special: broke ? broke.special : null, forecast: broke ? broke.forecast === true : false,
      });
    },
    guan_yu(c, aim) {
      lineCut(aim);
    },
    huang_zhong(c, aim) {
      lineCut(aim);
    },
    // Rule 14a: the heal / refill half by mode, then the gift; one result banner.
    liu_bei(c) {
      let healed = 0;
      let food = 0;
      if (mode === 'boss' && pressure.canHeal()) healed = pressure.healHeart(K.LIU_HEAL) || 0;
      if (mode === 'food' && pressure.canRefill()) food = pressure.refillFood(K.LIU_FOOD) || 0;
      const gifted = giveCharge(c.id, K.LIU_GIFT);
      ctx.emit({ type: 'skillResult', general: c.id, mode, healed, food, gifted: gifted.length });
    },
  };

  // Guan Yu / Huang Zhong at token end: one clearCells, handed to round-flow
  // (pressure counts the pairs). No result banner (rules 11, 14b).
  function lineCut(aim) {
    const res = board.clearCells(aim.targets, 'skill');
    if (res.ok === false) return;
    ctx.dispatch(res);
  }

  // Rule 8 steps 1-4. `line` is the chosen row / column for Guan Yu / Huang Zhong.
  function fire(c, line) {
    board.clearSelection();
    c.charge = 0;
    c.used += 1;
    const aim = target(c, line);
    showing = c.id;
    ctx.acquire('skill', K.SKILL_SHOW_MS, (token) => {
      showing = null;
      EFFECTS[c.id](c, aim);
      ctx.release(token);
    }, { general: c.id });
  }

  function stateOf(c) {
    if (showing === c.id) return 'show';
    const sel = typeof ctx.selecting === 'function' ? ctx.selecting() : null;
    if ((sel === 'row' && c.id === 'guan_yu') || (sel === 'col' && c.id === 'huang_zhong')) return 'select';
    if (c.standby) return 'standby';
    if (sealedLeft(c.id) > 0) return 'sealed';
    return c.charge >= c.need ? 'ready' : 'charging';
  }

  return {
    /**
     * Round-flow step 2 of the notify order (rule 3): a player match (forced
     * included) charges each fielded general whose kind it is. A forced match
     * spends Zhao Yun's stand-by first (skillArmedSpent), so a 盾 pair that
     * spends it charges him +1 (rule 13).
     * @param {{type: string, kind: string, forced: boolean}} ev board `match`
     * @returns {void}
     */
    onMatch(ev) {
      if (!ev || ev.type !== 'match') return;
      if (ev.forced) {
        for (const c of cards) {
          if (!c.standby) continue;
          c.standby = false;
          ctx.emit({ type: 'skillArmedSpent', general: c.id });
        }
      }
      for (const c of cards) if (c.kind === ev.kind) addCharge(c, 1);
    },

    /**
     * A tap on a general card (rules 6, 7; ADR-0003 intent table). Round-flow
     * drops it while any token is held. Cannot fire: `cardHint {general,
     * reason, ...}` with reason 'sealed' {left} | 'standby' | 'uncharged'
     * {kind, short} | 'noEffect' {why}. Can fire: 'row' / 'col' for the select
     * generals (round-flow enters the select mode), else the `skill` token is
     * acquired and null returned.
     * @param {string} general general id
     * @returns {(string|null)} 'row' | 'col' | null
     */
    tapCard(general) {
      const c = card(general);
      if (!c || showing !== null) return null;
      const hint = hintFor(c);
      if (hint) {
        ctx.emit(Object.assign({ type: 'cardHint', general: c.id }, hint));
        return null;
      }
      if (GENERALS[c.id].fire !== 'tap') return GENERALS[c.id].fire;
      fire(c);
      return null;
    },

    /**
     * Round-flow calls this right after a press-mode push (rule 11 / 14b
     * interrupts). Row select is cancelled by round-flow itself; column select
     * stays and keeps no state here: colSelectable reads the board live, so
     * the highlight follows the pushed board.
     * @returns {void}
     */
    onPush() {},

    /**
     * Whether row `r` can be chosen in Guan Yu's row select (rule 11): it
     * holds a unit or a roadblock. False off the playable area.
     * @param {number} r row
     * @returns {boolean}
     */
    rowSelectable(r) {
      return lineHasBlocks(() => board.rowContents(r));
    },
    /**
     * Fires Guan Yu on row `r` (rule 11): clears the selection, zeroes the
     * charge, fixes the cut (formula guan_cut) and holds the `skill` token; the
     * single clearCells lands at token end. Ignored unless Guan Yu can fire
     * and the row is selectable.
     * @param {number} r row
     * @returns {void}
     */
    cutRow(r) {
      const c = card('guan_yu');
      if (!c || showing !== null || hintFor(c) || !lineHasBlocks(() => board.rowContents(r))) return;
      fire(c, r);
    },
    /**
     * Whether column `col` can be chosen in Huang Zhong's column select (rule
     * 14b): it holds a unit or a roadblock. False off the playable area.
     * @param {number} col column
     * @returns {boolean}
     */
    colSelectable(col) {
      return lineHasBlocks(() => board.colContents(col));
    },
    /**
     * Fires Huang Zhong on column `col` (rule 14b; formula huang_cut), as cutRow.
     * @param {number} col column
     * @returns {void}
     */
    cutCol(col) {
      const c = card('huang_zhong');
      if (!c || showing !== null || hintFor(c) || !lineHasBlocks(() => board.colContents(col))) return;
      fire(c, col);
    },

    /**
     * The cards in slot order (ADR-0003 queries; TR-general-skills-002).
     * `state`: 'charging' | 'ready' | 'sealed' | 'select' | 'show' | 'standby';
     * `sealed` is the steps left (0 when free); `hint` is what a tap would
     * show (null when the card can fire; a ready card with `hint.reason ===
     * 'noEffect'` keeps the ready look). Fresh objects each call.
     * @returns {Array<{general: string, kind: string, charge: number, need: number,
     *   state: string, sealed: number, used: number, hint: (Object|null)}>}
     */
    cards() {
      return cards.map((c) => ({
        general: c.id, kind: c.kind, charge: c.charge, need: c.need,
        state: stateOf(c), sealed: sealedLeft(c.id), used: c.used, hint: hintFor(c),
      }));
    },

    /**
     * Times each fielded general fired this round (rule 17).
     * @returns {Object<string, number>}
     */
    skillsUsed() {
      const out = {};
      for (const c of cards) out[c.id] = c.used;
      return out;
    },
  };
}
