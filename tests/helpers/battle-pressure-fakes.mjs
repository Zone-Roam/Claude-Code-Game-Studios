// Fixtures for battle-pressure tests: a recording ctx around a real board.
// Dev-only; never shipped.
import { createPressure } from '../../src/rules/battle-pressure.mjs';
import { boardFromPicture } from './board-fixtures.mjs';

/** Lü Bu test chapter (GDD fixture: hp 12 / 18, steps 8 / 6, 3 hearts, addPairs 2). */
export function luBuChapter(over) {
  return Object.assign({
    id: 'test-boss', mode: 'boss', deck: { dao: 8, gu: 8, qi: 8 },
    boss: { enemy: 'lv_bu', hp: 12, steps: 8, hearts: 3, addPairs: 2,
      phase2: { hp: 18, steps: 6, name: '暴怒吕布', shout: '吕布暴怒！', lines: ['挡我者死！'] } },
  }, over);
}

/** A one-bar boss (Wen Chou style, no phase2). */
export function oneBarChapter(over) {
  return Object.assign({
    id: 'test-wen', mode: 'boss', deck: { dao: 8, gu: 8 },
    boss: { enemy: 'wen_chou', hp: 18, steps: 8, hearts: 3, addPairs: 2 },
  }, over);
}

/** 6x6 board, row 1 roadblocks, one empty cell (2,4), two buried cards in row 3; every kind even. */
export const SWEEP_PICTURE = Object.freeze([
  'jm     jm  jm     jm   jm   jm',
  'dao    jm  gu     .    qi   qi',
  'gu/dao shu dao/gu shu  ma   ma',
  'dao    gu  dun    dun  jiu  jiu',
  'gong   gong cheng cheng ying ying',
  'shui   shui huo   huo  dun  dun',
]);

/** A full 6x6 board with many empty cells (rows 1-3 empty). */
export const OPEN_PICTURE = Object.freeze([
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  'dao gu/gu dao gu jm gu',
  'gong gong cheng cheng ying ying',
  'shui shui huo huo dun dun',
]);

/** Only two empty cells, at (1,1) and (1,2). */
export const TWO_FREE_PICTURE = Object.freeze([
  '. . jm jm jm jm',
  'jm jm jm jm jm jm',
  'jm jm jm jm jm jm',
  'dao gu dao gu qi qi',
  'gong gong cheng cheng ying ying',
  'shui shui huo huo dun dun',
]);

/**
 * Chain fixture (AC chain): top layer 书 4, 旗 2, 营 4, 火 2; every other kind
 * 1 on top with its partner buried under it; the rest roadblocks and one empty cell.
 */
export const CHAIN_PICTURE = Object.freeze([
  'shu  shu  shu  shu  qi   qi',
  'ying ying ying ying huo  huo',
  'ma/ma gong/gong shui/shui cheng/cheng dao/dao gu/gu',
  'dun/dun jiu/jiu jm jm jm jm',
  'jm jm jm jm jm jm',
  'jm jm jm jm jm .',
]);

/**
 * Builds a pressure on a recording ctx.
 * @param {{chapter: Object, picture?: Array<string>, board?: Object, constants?: Object,
 *   generals?: Array<Object>, slow?: boolean, enemies?: Object}} o
 * @returns {{pressure: Object, board: Object, events: Array<Object>, tokens: Array<Object>,
 *   of: function(string): Array<Object>}}
 */
export function bossRig(o) {
  const board = o.board || boardFromPicture(o.picture || OPEN_PICTURE);
  const events = [];
  const tokens = [];
  const ctx = {
    chapter: o.chapter, board, constants: o.constants || {}, slow: o.slow, enemies: o.enemies,
    emit: (ev) => events.push(ev),
    acquire: (reason, durationMs, onEnd) => {
      const token = { reason, durationMs, onEnd };
      tokens.push(token);
      return token;
    },
    release: () => {},
    gameTime: () => 0,
  };
  if (o.generals) ctx.generals = () => o.generals;
  const pressure = createPressure(ctx);
  return { pressure, board, events, tokens, ctx, of: (type) => events.filter((e) => e.type === type) };
}

/** Calls onMatch n times with a plain match. */
export function matches(pressure, n) {
  for (let i = 0; i < n; i++) pressure.onMatch({ type: 'match', kind: 'dao', forced: false });
}

/** Calls onMiss n times. */
export function misses(pressure, n) {
  for (let i = 0; i < n; i++) pressure.onMiss({ type: 'miss' });
}

/** Fills the steps with misses (no hp damage) and ticks once: one attack. */
export function forceAttack(pressure) {
  const h = pressure.hud();
  misses(pressure, Math.ceil((h.stepsMax - h.steps) / 2));
  pressure.tick(16);
}

/** Ends phase 1 with an onClear of its whole hp and ticks into phase 2. */
export function enterPhase2(pressure) {
  pressure.onClear({ type: 'clear', pairs: pressure.hud().hp });
  pressure.tick(16);
}

/** Snapshot of the board's cells for equality checks. */
export function snap(board) {
  return JSON.stringify(board.cells());
}

/** Count of every kind, top and under together. */
export function kindCounts(board) {
  const out = {};
  for (const cell of board.cells()) {
    for (const k of [cell.top].concat(cell.under)) {
      if (k === null || k === 'jm') continue;
      out[k] = (out[k] || 0) + 1;
    }
  }
  return out;
}
