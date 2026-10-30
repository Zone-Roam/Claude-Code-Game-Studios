// Auto-play driver for board-link simulations (story board-link/015).
// Drives a board only through its public mutation and query API, calls
// ensurePlayable() at every settle point and records invariant violations.
// Every random choice comes from injected seeded streams. Dev-only; never shipped.
import { UNIT_KINDS, ROADBLOCK, EMPTY_CELL } from '../../src/core/constants.mjs';

/**
 * Every same-kind pair of top-layer units that findPath connects, in a fixed
 * order (kinds in UNIT_KINDS order, then cells row-major).
 * @param {Object} board a board from createBoard
 * @returns {Array<Array<{r: number, c: number}>>} `[a, b]` cell pairs; empty when none
 * @example playablePairs(board)[0] // [{ r: 1, c: 1 }, { r: 1, c: 4 }]
 */
export function playablePairs(board) {
  const byKind = {};
  for (const cell of board.cells()) {
    if (cell.top === EMPTY_CELL || cell.top === ROADBLOCK) continue;
    if (byKind[cell.top] === undefined) byKind[cell.top] = [];
    byKind[cell.top].push({ r: cell.r, c: cell.c });
  }
  const out = [];
  for (const kind of UNIT_KINDS) {
    const list = byKind[kind];
    if (list === undefined) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (board.findPath(list[i], list[j]) !== null) out.push([list[i], list[j]]);
      }
    }
  }
  return out;
}

/**
 * Checks the structural invariants that hold at any time: I1 (every kind's
 * count over top and under layers is even) and I3 (empty and roadblock cells
 * hold no buried card; no cell holds more than the board's `stackDepth()`).
 * @param {Object} board a board from createBoard
 * @returns {Array<string>} violation labels, empty when both hold
 * @example checkI1I3(board) // []
 */
export function checkI1I3(board) {
  const counts = {};
  const problems = [];
  for (const cell of board.cells()) {
    const isUnit = cell.top !== EMPTY_CELL && cell.top !== ROADBLOCK;
    if (isUnit) counts[cell.top] = (counts[cell.top] || 0) + 1;
    if (!isUnit && cell.under.length > 0) problems.push('I3 at (' + cell.r + ',' + cell.c + ')');
    if (cell.under.length > board.stackDepth()) problems.push('stackDepth at (' + cell.r + ',' + cell.c + ')');
    for (const k of cell.under) counts[k] = (counts[k] || 0) + 1;
  }
  for (const kind of UNIT_KINDS) {
    if ((counts[kind] || 0) % 2 !== 0) problems.push('I1 ' + kind + '=' + counts[kind]);
  }
  return problems;
}

/**
 * Settle-point invariant I2: a board with units has a connectable pair on top.
 * @param {Object} board a board from createBoard
 * @returns {boolean}
 * @example holdsI2(board) // true right after ensurePlayable()
 */
export function holdsI2(board) {
  return board.isEmpty() || board.hasPlayablePair();
}

/**
 * Turns a deck into pick weights in UNIT_KINDS order (weight = pairs, the
 * chapter `pool` default; proportional to the deck counts).
 * @param {Object<string, number>} deck kind id to unit count
 * @returns {Array<Array>} `[kind, weight]` entries for stream.pickWeighted
 * @example deckWeights({ dao: 6, gu: 4 }) // [['dao', 3], ['gu', 2]]
 */
export function deckWeights(deck) {
  const out = [];
  for (const kind of UNIT_KINDS) if (deck[kind] > 0) out.push([kind, deck[kind] / 2]);
  return out;
}

/**
 * Draws `n` pair kinds by weight.
 * @param {{pickWeighted: function(Array): *}} stream e.g. `board.rng('wave')`
 * @param {Array<Array>} weights from deckWeights
 * @param {number} n pairs to draw
 * @returns {Array<string>} one kind per pair
 * @example drawPairs(board.rng('add'), deckWeights(deck), 2) // ['dao', 'gu']
 */
export function drawPairs(stream, weights, n) {
  const kinds = [];
  for (let i = 0; i < n; i++) kinds.push(stream.pickWeighted(weights));
  return kinds;
}

/**
 * Minimal Guan Yu row cut (general-skills rule 11, board-link rule 15): every
 * unit in row `r` as 'stack', every roadblock as 'block'; then for each kind
 * cut an odd number of times (top and buried together) one extra cut outside
 * the row: the first top-layer unit of that kind scanning from the bottom row
 * up, left to right ('top'); failing that, the first `buriedCells(kind)` cell
 * outside the row; failing that (stacks deeper than 1), the first cell outside
 * the row, row-major, with that kind anywhere in its under layer. Buried
 * extras are 'under' targets with `kind`. Mirrors general-skills lineTargets.
 * @param {Object} board a board from createBoard
 * @param {number} r the chosen row
 * @returns {Array<{r: number, c: number, layer: string}>} targets for clearCells
 * @example board.clearCells(guanYuTargets(board, 6), 'skill')
 */
export function guanYuTargets(board, r) {
  const row = board.rowContents(r);
  const targets = row.units.map((u) => ({ r: u.r, c: u.c, layer: 'stack' }))
    .concat(row.blocks.map((b) => ({ r: b.r, c: b.c, layer: 'block' })));
  const cut = {};
  for (const u of row.units.concat(row.buried)) cut[u.kind] = (cut[u.kind] || 0) + 1;
  for (const kind of UNIT_KINDS) {
    if (((cut[kind] || 0) % 2) === 0) continue;
    let extra = null;
    for (let rr = board.rows; rr >= 1 && extra === null; rr--) {
      if (rr === r) continue;
      for (let c = 1; c <= board.cols; c++) {
        if (board.get(rr, c) === kind) {
          extra = { r: rr, c, layer: 'top' };
          break;
        }
      }
    }
    if (extra === null) {
      const buried = board.buriedCells(kind).filter((p) => p.r !== r);
      const deep = board.cells().find((p) => p.r !== r && p.under.indexOf(kind) !== -1);
      const at = buried.length > 0 ? buried[0] : deep;
      if (at !== undefined) extra = { r: at.r, c: at.c, layer: 'under', kind };
    }
    if (extra !== null) targets.push(extra);
  }
  return targets;
}

/**
 * Rows Guan Yu may pick: those holding a top-layer unit or a roadblock.
 * @param {Object} board a board from createBoard
 * @returns {Array<number>} row numbers, top down
 * @example occupiedRows(board) // [1, 2, 3, 4]
 */
export function occupiedRows(board) {
  const out = [];
  for (let r = 1; r <= board.rows; r++) {
    const row = board.rowContents(r);
    if (row.units.length > 0 || row.blocks.length > 0) out.push(r);
  }
  return out;
}

/**
 * Plays one game to the end. Each step taps a random connectable pair (chosen
 * with `chooser`); after every `every`-th step one interjection, picked
 * uniformly with `chooser`, runs. Each step and each interjection ends at a
 * settle point: ensurePlayable(), then I1, I2 and I3 are checked. I1 and I3
 * are also checked straight after every mutation. A level-4 result of
 * ensurePlayable (`clear` with source 'reshuffle') is a dev-build assertion
 * (GDD rule 12) and is recorded as a violation.
 * @param {{board: Object, chooser: {int: function(number): number},
 *   interjections: Array<function(Object, Object): (Object|null)>,
 *   every: number, maxSteps: number}} options each interjection gets
 *   `(board, chooser)` and returns its event, `null` when it does not apply
 *   now (e.g. push with an occupied bottom row), or `{ok: false}` when refused
 * @returns {{steps: number, cleared: boolean, violations: Array<string>,
 *   trace: Array<string>, reshuffles: number, skipped: number}} `trace` lists
 *   event types in order (determinism checks)
 * @example
 * const result = playGame({ board, chooser: createStream(1, 'autoplay'),
 *   interjections: [clearKindOp, pushOp], every: 5, maxSteps: 400 });
 * result.cleared // true
 */
export function playGame(options) {
  const board = options.board;
  const chooser = options.chooser;
  const violations = [];
  const trace = [];
  let steps = 0;
  let reshuffles = 0;
  let skipped = 0;

  const check = (where, settle) => {
    for (const p of checkI1I3(board)) violations.push(where + ': ' + p);
    if (settle && !holdsI2(board)) violations.push(where + ': I2');
  };
  const settle = (where) => {
    const r = board.ensurePlayable();
    if (r !== null) {
      reshuffles++;
      trace.push(r.type + (r.type === 'clear' ? ':' + r.cells.length : ''));
      if (r.type === 'clear') violations.push(where + ': ensurePlayable reached level 4');
    }
    check(where, true);
  };

  check('deal', true);
  while (!board.isEmpty() && steps < options.maxSteps) {
    const pairs = playablePairs(board);
    if (pairs.length === 0) {
      violations.push('step ' + steps + ': no playable pair');
      break;
    }
    const pair = pairs[chooser.int(pairs.length)];
    board.tap(pair[0].r, pair[0].c);
    const event = board.tap(pair[1].r, pair[1].c);
    steps++;
    if (event === null || event.type !== 'match') {
      violations.push('step ' + steps + ': expected match, got ' + (event === null ? 'null' : event.type));
      break;
    }
    trace.push('match');
    check('step ' + steps, false);
    settle('step ' + steps);
    if (steps % options.every === 0 && !board.isEmpty()) {
      const index = chooser.int(options.interjections.length);
      const result = options.interjections[index](board, chooser);
      const where = 'step ' + steps + ' op ' + index;
      if (result === null) {
        skipped++;
      } else if (result.ok === false) {
        violations.push(where + ': refused');
      } else {
        trace.push(result.type);
        check(where, false);
      }
      settle(where);
    }
  }
  return { steps, cleared: board.isEmpty(), violations, trace, reshuffles, skipped };
}
