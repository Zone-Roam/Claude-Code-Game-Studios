// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// 武将技能 (design/gdd/general-skills.md) — boss-mode effects only. Pure.
// Changes from the slice: Guan Yu cuts a chosen row (rule 11), Huang Zhong shoots a chosen column (rule 14b),
// Liu Bei heals a heart and gives every other general +1 (rule 14a), roster order = chapter.generals (recommend),
// need defaults per general (rule 1).
// PROTOTYPE SIMPLIFICATION: the "选排 / 选列" UI state is folded into one call, tapCard(id, {row} | {col}).
// Selecting does not move the enemy (rule 10), so this changes no numbers.

import { GENERALS, KINDS, KIND_NAMES, NEED_DEFAULT, SKILL_SHOW_MS, LIU_GIFT, LIU_HEAL } from '../core/constants.mjs';
import { devAssert } from '../core/assert.mjs';

const NUMERALS = ['零', '一', '两', '三', '四'];

/**
 * Targets for cutting one line (rule 11 for a row, 14b for a column; shared implementation).
 * @param {object} board board API
 * @param {{tiles: Array, buried: Array, blocks: Array}} line rowContents / colContents result
 * @param {function({r:number,c:number}): boolean} inLine whether a cell is in the chosen line
 * @returns {Array<{r:number,c:number,layer:string}>} clearCells targets
 */
export function lineTargets(board, line, inLine) {
  const targets = [];
  const counts = {};
  for (const t of line.tiles) {
    targets.push({ r: t.r, c: t.c, layer: 'stack' });
    counts[t.kind] = (counts[t.kind] || 0) + 1;
  }
  for (const u of line.buried) counts[u.kind] = (counts[u.kind] || 0) + 1;
  for (const b of line.blocks) targets.push({ r: b.r, c: b.c, layer: 'block' });
  for (const k of KINDS) {
    if (!counts[k] || counts[k] % 2 === 0) continue;
    let found = null;
    // top layer first: bottom row upward, each row left to right, outside the line
    for (let r = board.rows; r >= 1 && !found; r--) {
      for (let c = 1; c <= board.cols && !found; c++) {
        if (!inLine({ r, c }) && board.kindAt(r, c) === k) found = { r, c, layer: 'top' };
      }
    }
    // then a buried tile: top row downward, left to right, outside the line
    if (!found) {
      const b = board.buriedCells(k).find((p) => !inLine(p));
      if (b) found = { r: b.r, c: b.c, layer: 'under' };
    }
    devAssert(found, 'extra tile for ' + k);
    if (found) targets.push(found);
  }
  return targets;
}

/** Guan Yu (rule 11, formula guan_cut): targets for row r. */
export function guanTargets(board, r) {
  return lineTargets(board, board.rowContents(r), (p) => p.r === r);
}

/** Huang Zhong (rule 14b, formula huang_cut): targets for column c. */
export function huangTargets(board, c) {
  return lineTargets(board, board.colContents(c), (p) => p.c === c);
}

function lineHasBlocks(line) {
  return line.tiles.length + line.blocks.length > 0;
}

/**
 * The kind Zhuge Liang clears: most tiles on the board, ties broken by kind-table order (formula kongming_pick).
 * @param {object} board board API
 * @returns {string|null}
 */
export function zhugeKind(board) {
  let best = null;
  let bestCount = 0;
  for (const k of KINDS) {
    const n = board.count(k);
    if (n > bestCount) { best = k; bestCount = n; }
  }
  return best;
}

/**
 * @param {object} ctx round context plus `pressure`
 * @returns {object} skills API
 */
export function createSkills(ctx) {
  const { chapter, board, pressure, emit, acquire, release, dispatch } = ctx;
  const ids = chapter.generals;
  const roster = ids.map((id) => GENERALS.find((g) => g.id === id)).filter(Boolean).map((g) => ({
    id: g.id, name: g.name, kind: g.kind, skill: g.skill, line: g.line,
    need: typeof chapter.need === 'object' && chapter.need ? chapter.need[g.id] || NEED_DEFAULT[g.id]
      : typeof chapter.need === 'number' ? chapter.need : NEED_DEFAULT[g.id],
    charge: 0, used: 0,
  }));

  function byId(id) {
    return roster.find((g) => g.id === id) || null;
  }

  function anyBlocks() {
    return board.occupied().length > 0 || board.blocks().length > 0;
  }

  // Rule 14a: who can receive Liu Bei's gift.
  function receivers(liu) {
    return roster.filter((g) => g !== liu && g.charge < g.need);
  }

  function hasEffect(g) {
    if (g.id === 'guan_yu' || g.id === 'huang_zhong') return anyBlocks();
    if (g.id === 'zhuge_liang') return !board.isEmpty();
    if (g.id === 'zhao_yun') return !pressure.hud().shield;
    if (g.id === 'liu_bei') return pressure.canHeal() || receivers(g).length > 0;
    return true;
  }

  function noEffectText(g) {
    if (g.id === 'zhao_yun') return '已有护盾';
    if (g.id === 'liu_bei') return '心满，众将也满';
    return '盘上已经无兵';
  }

  // Rule 7: why a card cannot be released right now, or null.
  function blocker(g) {
    const sealed = pressure.sealed(g.id);
    if (sealed > 0) return '被镇住，还剩' + NUMERALS[Math.min(sealed, 4)] + '步';
    if (g.charge < g.need) return '消' + KIND_NAMES[g.kind] + NUMERALS[g.need - g.charge] + '对';
    if (!hasEffect(g)) return noEffectText(g);
    return null;
  }

  function onMatch(match) {
    for (const g of roster) {
      if (g.kind !== match.kind || g.charge >= g.need) continue;
      g.charge += 1;
      if (g.charge === g.need) emit({ type: 'skillReady', general: g.id });
    }
  }

  /**
   * Rule 8: release now, compute targets now, apply when the skill token ends.
   * @param {string} id general id
   * @param {{row?: number, col?: number}} [pick] Guan Yu's row / Huang Zhong's column (prototype: one call)
   * @returns {boolean} whether the skill was released
   */
  function tapCard(id, pick) {
    const g = byId(id);
    if (!g) return false;
    const why = blocker(g);
    if (why) {
      emit({ type: 'cardHint', general: g.id, text: why });
      return false;
    }
    let targets = [];
    if (g.id === 'guan_yu') {
      const r = pick && pick.row;
      if (!r || !lineHasBlocks(board.rowContents(r))) return false; // rule 11: an empty row does not respond
      targets = guanTargets(board, r);
    }
    if (g.id === 'huang_zhong') {
      const c = pick && pick.col;
      if (!c || !lineHasBlocks(board.colContents(c))) return false;
      targets = huangTargets(board, c);
    }
    board.clearSelection();
    g.charge = 0;
    g.used += 1;
    let kind = null;
    let gifted = [];
    if (g.id === 'zhuge_liang') kind = zhugeKind(board);
    if (g.id === 'liu_bei') gifted = receivers(g).map((x) => x.id);
    acquire('skill', SKILL_SHOW_MS, (tok) => {
      if (g.id === 'guan_yu' || g.id === 'huang_zhong') dispatch(board.clearCells(targets, 'skill'));
      else if (g.id === 'zhuge_liang') {
        dispatch(board.clearKind(kind, 'skill'));
        if (pressure.breakSpecial()) emit({ type: 'specialBroken' });
      } else if (g.id === 'zhang_fei') pressure.roarBack();
      else if (g.id === 'zhao_yun') {
        pressure.raiseShield();
        emit({ type: 'shield', on: true });
      } else if (g.id === 'liu_bei') {
        pressure.healHeart(LIU_HEAL);
        for (const gid of gifted) {
          const x = byId(gid);
          const before = x.charge;
          x.charge = Math.min(x.need, x.charge + LIU_GIFT);
          if (before < x.need && x.charge === x.need) emit({ type: 'skillReady', general: x.id });
        }
      }
      release(tok);
    }, { general: g.id, name: g.name, skill: g.skill, line: g.line, targets });
    return true;
  }

  return {
    onMatch,
    tapCard,
    cards() {
      return roster.map((g) => ({
        id: g.id, name: g.name, kind: g.kind, skill: g.skill, charge: g.charge, need: g.need,
        sealed: pressure.sealed(g.id),
        state: pressure.sealed(g.id) > 0 ? 'sealed' : g.charge >= g.need ? 'ready' : 'charging',
      }));
    },
    /** Test hook: set a general's charge directly. */
    setCharge(id, n) { const g = byId(id); if (g) g.charge = n; },
    skillsUsed() {
      const out = {};
      for (const g of roster) out[g.id] = g.used;
      return out;
    },
  };
}
