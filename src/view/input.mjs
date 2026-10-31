// Pointer input -> round-flow intents (ui-interaction rules 14-16, ADR-0003 section 2).
// Only produces intents; never changes rule state. Ported from the vertical slice.
import { SAME_CELL_GUARD_MS, CARD_AFTER_BOARD_MS } from './ui-constants.mjs';
import { cellAt, LAYOUT } from './layout.mjs';

function inside(node, e) {
  const r = node.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

/**
 * Builds a button intent from a button's data attributes. The open card's slot
 * picker (general-loadout rules 10-12) needs `slot` (0-based, for slot / clear)
 * or `general` (for pick); round-flow passes the intent whole to picker.press.
 * @param {string} button data-button
 * @param {(string|null)} slot data-slot, a 0-based index
 * @param {(string|null)} general data-general
 * @returns {{type: string, button: string, slot?: number, general?: string}}
 * @example buttonIntent('clear', '2', null) // { type: 'button', button: 'clear', slot: 2 }
 */
export function buttonIntent(button, slot, general) {
  const intent = { type: 'button', button };
  if (slot !== null && slot !== undefined && slot !== '' && Number.isInteger(Number(slot))) intent.slot = Number(slot);
  if (general) intent.general = general;
  return intent;
}

/**
 * Wires the view's elements to the intent queue.
 * Intents: {type:'cell',row,col}, {type:'offBoard'}, {type:'card',general},
 * {type:'pauseStamp'}, {type:'button',button} (open-card picker buttons add `slot`
 * (0-based) or `general`, see buttonIntent). Catalog picks go to `onCatalogPick`,
 * 开始游戏 on the start screen to `onTitleStart`.
 * @param {Object} view createView's result
 * @param {{enqueue: function(Object): void, onCatalogPick: function(string): void,
 *   onTitleStart?: function(): void}} deps
 */
export function attachInput(view, deps) {
  const enqueue = deps.enqueue;
  let lastBoardTapAt = -1e9;
  let lastCellKey = '';
  let lastCellAt = -1e9;
  let cardDown = null;

  view.frame.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary) return;
    e.preventDefault();
    const L = view.layout();
    if (!L) return;
    const rect = view.frame.getBoundingClientRect();
    const x = (e.clientX - rect.left) / L.scale - LAYOUT.FRAME_SIDE;
    const y = (e.clientY - rect.top) / L.scale;
    const cell = cellAt(L, x, y);
    const key = cell.r + ',' + cell.c;
    if (key === lastCellKey && e.timeStamp - lastCellAt < SAME_CELL_GUARD_MS) return;
    lastCellKey = key;
    lastCellAt = e.timeStamp;
    lastBoardTapAt = e.timeStamp;
    enqueue({ type: 'cell', row: cell.r, col: cell.c });
  });

  // A press on the stage outside the board, the cards, the pause stamp and any open
  // overlay card is `offBoard` (cancels a row / column select, round-flow rule 5a).
  view.stage.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary) return;
    const t = e.target;
    if (view.frame.contains(t) || view.cardsEl.contains(t) || view.pauseEl.contains(t)) return;
    if (t.closest && t.closest('.card.on')) return;
    enqueue({ type: 'offBoard' });
  });

  view.cardsEl.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary) return;
    const card = e.target.closest('.gcard');
    cardDown = card ? { card, id: card.getAttribute('data-general'), at: e.timeStamp } : null;
  });
  view.cardsEl.addEventListener('pointerup', function (e) {
    if (!e.isPrimary || !cardDown) return;
    const down = cardDown;
    cardDown = null;
    if (!inside(down.card, e)) return;
    if (down.at - lastBoardTapAt < CARD_AFTER_BOARD_MS) return;
    enqueue({ type: 'card', general: down.id });
  });
  view.cardsEl.addEventListener('pointercancel', function () { cardDown = null; });

  view.pauseEl.addEventListener('pointerup', function (e) {
    if (e.isPrimary) enqueue({ type: 'pauseStamp' });
  });

  // 开始游戏 on the start screen is a screen change, not a round intent.
  view.titleStart.addEventListener('pointerup', function (e) {
    if (e.isPrimary && inside(view.titleStart, e) && deps.onTitleStart) deps.onTitleStart();
  });

  for (const id of Object.keys(view.overlayCards)) {
    view.overlayCards[id].addEventListener('pointerup', function (e) {
      if (!e.isPrimary) return;
      const btn = e.target.closest('button[data-button]');
      if (!btn || !inside(btn, e)) return;
      const pick = btn.getAttribute('data-chapter');
      if (pick) {
        deps.onCatalogPick(pick);
        return;
      }
      enqueue(buttonIntent(btn.getAttribute('data-button'), btn.getAttribute('data-slot'), btn.getAttribute('data-general')));
    });
  }

  // No double-tap zoom, long-press menu or pull-to-refresh on the stage (rule 14).
  view.stage.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  view.stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}
