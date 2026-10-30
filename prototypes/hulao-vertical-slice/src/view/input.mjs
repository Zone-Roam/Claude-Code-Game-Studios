// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Pointer input → intents (ui-interaction rules 14–16, ADR-0003 §2). Only produces intents.

import { SAME_CELL_GUARD_MS, CARD_AFTER_BOARD_MS } from '../core/constants.mjs';
import { cellAt } from './layout.mjs';

const FRAME_SIDE = 6;

function inside(elm, e) {
  const r = elm.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

/**
 * Wires the view's elements to the intent queue.
 * @param {object} view the view (stage, frame, pauseEl, cardsEl, overlayCards, layout())
 * @param {{enqueue: function(object): void, getRound: function(): object}} deps
 */
export function attachInput(view, deps) {
  const { enqueue, getRound } = deps;
  let lastBoardTapAt = -1e9;
  let lastCellKey = '';
  let lastCellAt = -1e9;
  let cardDown = null;

  view.frame.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    const round = getRound();
    if (!round || round.boardLocked()) return;
    const L = view.layout();
    const rect = view.frame.getBoundingClientRect();
    const x = (e.clientX - rect.left) / L.scale - FRAME_SIDE;
    const y = (e.clientY - rect.top) / L.scale;
    const cell = cellAt(L, x, y);
    const key = cell.r + ',' + cell.c;
    if (key === lastCellKey && e.timeStamp - lastCellAt < SAME_CELL_GUARD_MS) return;
    lastCellKey = key;
    lastCellAt = e.timeStamp;
    lastBoardTapAt = e.timeStamp;
    enqueue({ type: 'cell', row: cell.r, col: cell.c });
  });

  view.cardsEl.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    const card = e.target.closest('.gcard');
    cardDown = card ? { card, id: card.getAttribute('data-general'), at: e.timeStamp } : null;
  });
  view.cardsEl.addEventListener('pointerup', (e) => {
    if (!e.isPrimary || !cardDown) return;
    const down = cardDown;
    cardDown = null;
    if (!inside(down.card, e)) return;
    const round = getRound();
    if (!round || round.boardLocked()) return;
    if (down.at - lastBoardTapAt < CARD_AFTER_BOARD_MS) return;
    enqueue({ type: 'card', general: down.id });
  });
  view.cardsEl.addEventListener('pointercancel', () => { cardDown = null; });

  view.pauseEl.addEventListener('pointerup', (e) => {
    if (!e.isPrimary) return;
    enqueue({ type: 'pauseStamp' });
  });

  for (const card of Object.values(view.overlayCards)) {
    card.addEventListener('pointerup', (e) => {
      if (!e.isPrimary) return;
      const btn = e.target.closest('button[data-button]');
      if (!btn || !inside(btn, e)) return;
      enqueue({ type: 'button', button: btn.getAttribute('data-button') });
    });
  }

  // No double-tap zoom, long-press menu or pull-to-refresh on the stage (rule 14).
  view.stage.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  view.stage.addEventListener('contextmenu', (e) => e.preventDefault());
}
