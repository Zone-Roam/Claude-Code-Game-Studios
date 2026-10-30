// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// 武将技能 (design/gdd/general-skills.md) — boss-mode effects. Pure.
// SLICE v5 (DESIGN-v5.md, not yet in the GDD): each general has one job and a speed (chapter.need per
// general): Zhang Fei pushes the enemy back and stuns it, Zhao Yun raises a shield against the next attack
// (replaces "the next same-kind pair always clears"), Zhuge Liang also breaks the next special;
// a general sealed by 虎啸 cannot be released.

import { GENERALS, KINDS, KIND_NAMES, GENERAL_NEED, SKILL_SHOW_MS } from '../core/constants.mjs';
import { devAssert } from '../core/assert.mjs';

const NUMERALS = ['零', '一', '两', '三', '四'];

/**
 * Cells Guan Yu cuts: the lowest occupied row, plus one more tile for every kind left odd (formula guan_cut).
 * @param {object} board board API
 * @returns {Array<{r:number,c:number}>}
 */
export function guanCells(board) {
  const occ = board.occupied();
  if (occ.length === 0) return [];
  const bottom = Math.max(...occ.map((p) => p.r));
  const row = occ.filter((p) => p.r === bottom);
  const counts = {};
  for (const p of row) {
    const k = board.kindAt(p.r, p.c);
    counts[k] = (counts[k] || 0) + 1;
  }
  const cells = row.slice();
  for (const k of KINDS) {
    if (!counts[k] || counts[k] % 2 === 0) continue;
    let found = null;
    for (let r = bottom - 1; r >= 1 && !found; r--) {
      for (let c = 1; c <= board.cols && !found; c++) {
        if (board.kindAt(r, c) === k) found = { r, c };
      }
    }
    // slice v6: when no partner is face up, take a buried one
    if (!found) found = board.buriedOf ? board.buriedOf(k) : null;
    devAssert(found, 'guan extra tile for ' + k);
    if (found) cells.push(found);
  }
  return cells;
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
  const roster = GENERALS.filter((g) => chapter.generals.indexOf(g.id) >= 0).map((g) => ({
    id: g.id, name: g.name, kind: g.kind, skill: g.skill, line: g.line,
    need: typeof chapter.need === 'object' ? chapter.need[g.id] || GENERAL_NEED : chapter.need || GENERAL_NEED,
    charge: 0, armed: false, used: 0,
  }));

  function byId(id) {
    return roster.find((g) => g.id === id) || null;
  }

  function hasEffect(g) {
    if (g.id === 'guan_yu' || g.id === 'zhuge_liang') return !board.isEmpty();
    if (g.id === 'zhao_yun') return !pressure.hud().shield;
    return true;
  }

  function noEffectText(g) {
    if (g.id === 'zhao_yun') return '已有护盾';
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

  // Rule 8: release now, compute targets now, apply when the skill token ends.
  function tapCard(id) {
    const g = byId(id);
    if (!g) return;
    const why = blocker(g);
    if (why) {
      emit({ type: 'cardHint', general: g.id, text: why });
      return;
    }
    board.clearSelection();
    g.charge = 0;
    g.used += 1;
    let cells = [];
    let kind = null;
    if (g.id === 'guan_yu') cells = guanCells(board);
    if (g.id === 'zhuge_liang') { kind = zhugeKind(board); cells = board.cellsOf(kind); }
    acquire('skill', SKILL_SHOW_MS, (tok) => {
      if (g.id === 'guan_yu') dispatch(board.clearCells(cells, 'skill'));
      else if (g.id === 'zhuge_liang') {
        dispatch(board.clearKind(kind, 'skill'));
        if (pressure.breakSpecial()) emit({ type: 'specialBroken' });
      } else if (g.id === 'zhang_fei') pressure.roarBack();
      else if (g.id === 'zhao_yun') {
        pressure.raiseShield();
        emit({ type: 'shield', on: true });
      }
      release(tok);
    }, { general: g.id, name: g.name, skill: g.skill, line: g.line, cells });
  }

  return {
    onMatch,
    tapCard,
    cards() {
      return roster.map((g) => ({
        id: g.id, name: g.name, kind: g.kind, skill: g.skill, charge: g.charge, need: g.need, armed: g.armed,
        sealed: pressure.sealed(g.id),
        state: pressure.sealed(g.id) > 0 ? 'sealed' : g.charge >= g.need ? 'ready' : 'charging',
      }));
    },
    skillsUsed() {
      const out = {};
      for (const g of roster) out[g.id] = g.used;
      return out;
    },
  };
}
