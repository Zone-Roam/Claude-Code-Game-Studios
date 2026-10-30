// Stage layout (design/gdd/ui-interaction.md rules 4, 5, 7; formulas cell_size and fit_scale).
// Fit order decided 2026-10-30 (D1): the top band and the card rail give way first,
// then the cell pitch shrinks toward CELL_MIN, and only then the whole stage scales.
// Pure: no page access, so it is unit-tested in Node. Ported from the vertical slice.

/** Stage constants (ui-interaction Formulas). Layout constants, not gameplay knobs. */
export const LAYOUT = Object.freeze({
  FRAME_SIDE: 6,
  LANE: 32,
  DEAD_ZONE: 20,
  STAGE_MAX: 480,
  CELL_MIN: 52,
  CELL_MAX: 72,
  CELL_MAX_6: 53,
  TOP_FULL: 160,
  TOP_COMPACT: 115,
  CARDS_FULL: 96,
  CARDS_MIN: 80,
  SCALE_WARN: 0.85,
});
const TRIES = [[LAYOUT.TOP_FULL, LAYOUT.CARDS_FULL], [LAYOUT.TOP_COMPACT, LAYOUT.CARDS_FULL], [LAYOUT.TOP_COMPACT, LAYOUT.CARDS_MIN]];

/**
 * Cell pitch from the width (formula cell_size).
 * @param {number} width available CSS width
 * @param {number} cols 5 or 6
 * @returns {number} pitch before the height fit
 * @example cellSize(375, 5) // 66
 */
export function cellSize(width, cols) {
  const ws = Math.min(width, LAYOUT.STAGE_MAX);
  const max = cols === 6 ? LAYOUT.CELL_MAX_6 : LAYOUT.CELL_MAX;
  return Math.min(max, Math.max(LAYOUT.CELL_MIN, Math.floor((ws - 2 * LAYOUT.FRAME_SIDE - LAYOUT.LANE) / cols)));
}

/**
 * Full stage layout (formula fit_scale, three steps).
 * @param {{width: number, height: number, rows: number, cols: number}} viewport
 * @returns {Object} sizes in unscaled stage px: cell, scale, top, cards, compact, stageW,
 *   stageH, topY, boardX, boardY, boardW, boardH, deadY, cardsY, lane, rows, cols, scaleWarn
 * @example computeLayout({ width: 375, height: 734, rows: 8, cols: 5 }) // cell 60, scale 1
 */
export function computeLayout(viewport) {
  const width = viewport.width;
  const height = viewport.height;
  const rows = viewport.rows;
  const cols = viewport.cols || 6;
  const lane = LAYOUT.LANE;
  const ws = Math.min(width, LAYOUT.STAGE_MAX);
  const need = (t, k, c) => t + rows * c + lane + LAYOUT.DEAD_ZONE + k;
  let cell = cellSize(width, cols);
  let pick = null;
  let scale = 1;
  for (const t of TRIES) {
    if (need(t[0], t[1], cell) <= height) { pick = t; break; }
  }
  if (!pick) {
    pick = TRIES[TRIES.length - 1];
    const shrunk = Math.min(cell, Math.floor((height - pick[0] - lane - LAYOUT.DEAD_ZONE - pick[1]) / rows));
    if (shrunk >= LAYOUT.CELL_MIN) {
      cell = shrunk;
    } else {
      cell = LAYOUT.CELL_MIN;
      scale = height / need(pick[0], pick[1], cell);
    }
  }
  const boardW = cols * cell + lane;
  const boardH = rows * cell + lane;
  const stageW = Math.max(ws, boardW + 2 * LAYOUT.FRAME_SIDE);
  if (stageW * scale > width) scale = width / stageW;
  const top = pick[0];
  const cards = pick[1];
  const stageH = height / scale;
  const spare = Math.max(0, stageH - need(top, cards, cell));
  const topY = spare / 2;
  const boardY = topY + top + spare / 2;
  return {
    cell, rows, cols, scale, stageW, stageH, top, cards, lane, topY, boardY, boardW, boardH,
    boardX: (stageW - boardW) / 2,
    deadY: boardY + boardH,
    cardsY: boardY + boardH + LAYOUT.DEAD_ZONE,
    compact: top === LAYOUT.TOP_COMPACT,
    scaleWarn: scale < LAYOUT.SCALE_WARN,
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
  return { x: axis(c, layout.cols), y: axis(r, layout.rows) };
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
  return { r: axis(y, layout.rows), c: axis(x, layout.cols) };
}
