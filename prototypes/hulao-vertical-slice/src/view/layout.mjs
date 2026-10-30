// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Layout from ui-interaction.md formulas cell_size and fit_scale. Pure: testable in Node (ADR-0003).
// SLICE v6 (DESIGN-v6.md): the column count comes from the chapter, and with 5 columns a cell may grow to
// CELL_MAX so the tiles fill the width (bigger tiles for older players).

const FRAME_SIDE = 6;
const LANE = 32;
const DEAD_ZONE = 20;
const STAGE_MAX = 480;
const TRIES = [[160, 96], [115, 96], [115, 80]];
const CELL_MIN = 52;
const CELL_MAX = 72;

/**
 * @param {{width: number, height: number, rows: number}} viewport available CSS size and board rows
 * @returns {object} sizes in unscaled stage pixels plus the stage scale
 */
export function computeLayout({ width, height, rows, cols }) {
  const n = cols || 6;
  const ws = Math.min(width, STAGE_MAX);
  const cell = Math.min(n === 6 ? 53 : CELL_MAX, Math.max(CELL_MIN, Math.floor((ws - 2 * FRAME_SIDE - LANE) / n)));
  const boardW = n * cell + LANE;
  const boardH = rows * cell + LANE;
  const need = (top, cards) => top + boardH + DEAD_ZONE + cards;
  let pick = null;
  for (const t of TRIES) {
    if (need(t[0], t[1]) <= height) { pick = t; break; }
  }
  let scale = 1;
  if (!pick) {
    pick = TRIES[TRIES.length - 1];
    scale = height / need(pick[0], pick[1]);
  }
  const stageW = Math.max(ws, boardW + 2 * FRAME_SIDE);
  if (stageW * scale > width) scale = width / stageW;
  const [top, cards] = pick;
  const stageH = height / scale;
  const spare = Math.max(0, stageH - need(top, cards));
  const topY = spare / 2;
  const boardY = topY + top + spare / 2;
  return {
    cell, rows, cols: n, scale, stageW, stageH, top, cards, lane: LANE,
    topY,
    boardX: (stageW - boardW) / 2,
    boardY,
    boardW,
    boardH,
    deadY: boardY + boardH,
    cardsY: boardY + boardH + DEAD_ZONE,
    compact: top === 115,
  };
}

/**
 * Board-local pixel centre of a grid point; the outer ring sits in the middle of the lane.
 * @returns {{x: number, y: number}}
 */
export function pointCenter(layout, r, c) {
  const half = layout.lane / 2;
  const axis = (i, n) => {
    if (i <= 0) return half / 2;
    if (i >= n + 1) return half + n * layout.cell + half / 2;
    return half + (i - 1) * layout.cell + layout.cell / 2;
  };
  return { x: axis(c, layout.cols || 6), y: axis(r, layout.rows) };
}

/**
 * Grid coordinate under a board-local point; the lane counts as the outer ring.
 * @returns {{r: number, c: number}}
 */
export function cellAt(layout, x, y) {
  const half = layout.lane / 2;
  const axis = (v, n) => {
    if (v < half) return 0;
    const i = Math.floor((v - half) / layout.cell) + 1;
    return i > n ? n + 1 : i;
  };
  return { r: axis(y, layout.rows), c: axis(x, layout.cols || 6) };
}
