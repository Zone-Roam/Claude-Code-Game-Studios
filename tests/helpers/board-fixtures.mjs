// Shared board/deck builders for board-link tests. Dev-only; never shipped.
import { UNIT_KINDS } from '../../src/core/constants.mjs';
import { createBoard } from '../../src/rules/board-link.mjs';

/** Chapter 5 deck (GDD formula example): 鼓8 刀6 盾6 旗6 酒6 营6 弓6 = 44, for a 5x6 full board. */
export const CH05_DECK = Object.freeze({ gu: 8, dao: 6, dun: 6, qi: 6, jiu: 6, ying: 6, gong: 6 });

/**
 * A deck of `total` units dealt as pairs round-robin over the first `kinds`
 * unit kinds in UNIT_KINDS order, so every count is even.
 * @param {number} total even unit count
 * @param {number} kinds how many kinds to use (1..12)
 * @returns {Object<string, number>}
 * @example pairedDeck(20, 5) // { huo: 4, ying: 4, ma: 4, gong: 4, shui: 4 }
 */
export function pairedDeck(total, kinds) {
  if (total % 2 !== 0) throw new RangeError('total must be even');
  const deck = {};
  for (let i = 0; i < total / 2; i++) {
    const kind = UNIT_KINDS[i % kinds];
    deck[kind] = (deck[kind] === undefined ? 0 : deck[kind]) + 2;
  }
  return deck;
}

/**
 * Creates a board and deals a deck on it.
 * @param {{seed: (number|string), cols: (number|undefined), rows: number,
 *   deck: Object<string, number>, mode: (string|undefined), startRows: (number|undefined)}} options
 * @returns {Object} the dealt board
 * @example dealtBoard({ seed: 5, cols: 5, rows: 6, deck: CH05_DECK, mode: 'boss' })
 */
export function dealtBoard(options) {
  const board = createBoard({ seed: options.seed, cols: options.cols, rows: options.rows });
  board.deal({ deck: options.deck, mode: options.mode, startRows: options.startRows });
  return board;
}

/**
 * Builds an undealt board from a picture of its playable cells. Each string
 * is one row (row 1 first) of space-separated tokens: '.' empty, a unit kind id,
 * ROADBLOCK ('jm'), or 'top/under' for a unit with one buried card (e.g.
 * 'dao/gu': 刀 on top, 鼓 underneath). Row and column counts come from the picture.
 * @param {Array<string>} picture rows of tokens, 6..8 rows of 5 or 6 tokens
 * @param {{streams: (Object<string, Object>|undefined)}} [options] passed to
 *   createBoard (e.g. an injected `shuffle` stream)
 * @returns {Object} the board
 * @example boardFromPicture(['ma . . ma . .', '. . dao/gu . . .', ...])
 */
export function boardFromPicture(picture, options) {
  const grid = picture.map((line) => line.trim().split(/\s+/));
  const streams = options === undefined ? undefined : options.streams;
  const board = createBoard({ seed: 1, cols: grid[0].length, rows: grid.length, streams });
  grid.forEach((tokens, i) => {
    tokens.forEach((token, j) => {
      if (token === '.') return;
      const layers = token.split('/');
      board.set(i + 1, j + 1, layers[0]);
      if (layers.length > 1) board.bury(i + 1, j + 1, layers[1]);
    });
  });
  return board;
}

/**
 * A copy of a board's top layer with every buried card left out (hidden-info
 * checks: buried cards must not change connectivity).
 * @param {Object} board source board (not modified)
 * @returns {Object} a new undealt board of the same size
 * @example withoutBuried(dealtBoard({ seed: 5, cols: 5, rows: 6, deck: CH05_DECK })).buriedCount() // 0
 */
export function withoutBuried(board) {
  const copy = createBoard({ seed: 1, cols: board.cols, rows: board.rows });
  for (const cell of board.cells()) copy.set(cell.r, cell.c, cell.top);
  return copy;
}

/**
 * A full 5x6 board with no playable pair (every same-kind top pair is blocked),
 * one roadblock at (3,3) and six buried cards; every kind count is even.
 * Found by a one-off search with findPath; kept as data.
 */
export const DEAD_FULL = Object.freeze([
  'dun       jiu/dun shui  shu/shu huo',
  'shu       dun     cheng shui    qi',
  'shui      qi      jm    gong    dun',
  'jiu       shui    dao   huo     shui',
  'huo       dun     ma    dun     ying',
  'ying/gong cheng   huo/shui ma   shu/dao',
]);
