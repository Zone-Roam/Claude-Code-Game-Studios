// Board-link rules: grid model, random streams, deck validation, dealing,
// tap state machine with match / miss / reveal, clearKind / clearCells /
// clearSelection, rowContents / colContents, pushRowFromTop / addPairs / placeBlocks,
// dead-board reshuffle (ensurePlayable, levels 1-3).
// Data in, data out. No page, clock, global random or storage access.
import {
  UNIT_KINDS, EMPTY_CELL, ROADBLOCK, BOARD_COLS, BOARD_COLS_ALLOWED, BOARD_ROWS_MIN, BOARD_ROWS_MAX,
  STACK_DEPTH, RNG_STREAM_NAMES, RESHUFFLE_TRIES,
} from '../core/constants.mjs';
import { createStream } from '../core/rng.mjs';

/**
 * Creates an empty board with its four independent random streams.
 * Cells use (row, col) coordinates; the playable area is rows 1..rows and
 * cols 1..cols inside an always-empty outer ring (indices 0..rows+1, 0..cols+1).
 * @param {{seed: (number|string), cols: (number|undefined), rows: number,
 *   streams: (Object<string, Object>|undefined)}} options
 *   `cols` defaults to BOARD_COLS (6) when omitted; throws RangeError for bad cols/rows.
 *   `streams` optionally replaces named random streams (dependency injection for
 *   tests), e.g. `{ shuffle: stub }`; each replacement must offer the methods its
 *   user calls (`shuffle` for the shuffle stream). Unknown names throw RangeError.
 * Each playable cell has two layers: the top layer (`get`/`set`) and an under
 * layer holding at most STACK_DEPTH face-down units (filled only by `deal`).
 * Single-threaded; every method reads or mutates this board only.
 * @returns {{cols: number, rows: number, rng: function(string): Object,
 *   get: function(number, number): *, set: function(number, number, *): void,
 *   deal: function(Object): void, cells: function(): Array<Object>,
 *   count: function(string): number, pairsLeft: function(): number,
 *   depthAt: function(number, number): number, buriedCount: function(): number,
 *   bury: function(number, number, string): void,
 *   findPath: function(Object, Object): (Array<Object>|null),
 *   selection: function(): (Object|null), tap: function(number, number): (Object|null),
 *   setForceNext: function(boolean): void, forceNext: function(): boolean,
 *   clearKind: function(string, string): Object, clearSelection: function(): void,
 *   clearCells: function(Array<Object>, string): Object,
 *   rowContents: function(number): Object, colContents: function(number): Object,
 *   pushRowFromTop: function(Array<*>): Object, addPairs: function(Array<string>): Object,
 *   placeBlocks: function(number, Object): Object,
 *   buriedCells: function(string): Array<Object>, hasPlayablePair: function(): boolean,
 *   ensurePlayable: function(): (Object|null)}}
 * @example
 * const board = createBoard({ seed: 7, cols: 5, rows: 6 });
 * board.deal({ deck: { gu: 8, dao: 6, dun: 6, qi: 6, jiu: 6, ying: 6, gong: 6 } });
 * board.pairsLeft();   // 22
 * board.buriedCount(); // 14
 * board.rng('wave').int(4);
 */
export function createBoard(options) {
  const cols = options.cols === undefined ? BOARD_COLS : options.cols;
  const rows = options.rows;
  if (BOARD_COLS_ALLOWED.indexOf(cols) === -1) throw new RangeError('cols must be 5 or 6');
  if (!Number.isInteger(rows) || rows < BOARD_ROWS_MIN || rows > BOARD_ROWS_MAX) {
    throw new RangeError('rows must be an integer in 6..8');
  }

  const streams = {};
  for (const name of RNG_STREAM_NAMES) streams[name] = createStream(options.seed, name);
  if (options.streams !== undefined) {
    for (const name of Object.keys(options.streams)) {
      if (RNG_STREAM_NAMES.indexOf(name) === -1) throw new RangeError('unknown rng stream: ' + name);
      streams[name] = options.streams[name];
    }
  }

  // top[r][c]: kind id, ROADBLOCK or EMPTY_CELL. under[r][c]: kinds buried
  // below that cell, bottom first (the last element is the one revealed next).
  const top = [];
  const under = [];
  for (let r = 0; r < rows + 2; r++) {
    top.push(new Array(cols + 2).fill(EMPTY_CELL));
    const row = [];
    for (let c = 0; c < cols + 2; c++) row.push([]);
    under.push(row);
  }

  // Selected cell {r, c} (always a top-layer unit) or null (GDD rule 6).
  let selected = null;
  // Zhao Yun stand-by (GDD rule 14): the next same-kind pair is matched regardless of path.
  let forceNextOn = false;

  function isUnit(value) {
    return value !== EMPTY_CELL && value !== ROADBLOCK;
  }

  // Empties a top cell; a buried card, if any, flips up at once (GDD rule 5, I3).
  // Returns the revealed {r, c, kind} or null.
  function removeTop(row, col) {
    const stack = under[row][col];
    if (stack.length === 0) {
      top[row][col] = EMPTY_CELL;
      return null;
    }
    const kind = stack.pop();
    top[row][col] = kind;
    return { r: row, c: col, kind };
  }

  // Clears one top-layer unit for a `clear` event (clearKind, clearCells):
  // records the cell in `cells`, a flipped-up card in `revealed`, and drops
  // the selection when it sat on this cell.
  function clearTop(row, col, cells, revealed) {
    cells.push({ r: row, c: col });
    const flipped = removeTop(row, col);
    if (flipped !== null) revealed.push(flipped);
    if (selected !== null && selected.r === row && selected.c === col) selected = null;
  }

  // Top-layer units, buried cards and roadblock cells along a list of cells
  // (rowContents / colContents). Buried cards are listed bottom first per cell.
  function lineContents(points) {
    const units = [];
    const buried = [];
    const blocks = [];
    for (const p of points) {
      const value = top[p.r][p.c];
      if (value === ROADBLOCK) blocks.push({ r: p.r, c: p.c });
      else if (value !== EMPTY_CELL) units.push({ r: p.r, c: p.c, kind: value });
      for (const kind of under[p.r][p.c]) buried.push({ r: p.r, c: p.c, kind });
    }
    return { units, buried, blocks };
  }

  function inGrid(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) &&
      row >= 0 && row <= rows + 1 && col >= 0 && col <= cols + 1;
  }

  // True when every top-layer cell strictly between two points on one row or
  // column is empty. Roadblocks and units block; under layers never do.
  function clearBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2 || c !== c2) {
      if (top[r][c] !== EMPTY_CELL) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

  // Path a -> p1 -> p2 -> b through two empty turn points; null when blocked.
  function twoTurn(a, b, p1r, p1c, p2r, p2c) {
    if (top[p1r][p1c] !== EMPTY_CELL || top[p2r][p2c] !== EMPTY_CELL) return null;
    if (!clearBetween(a.r, a.c, p1r, p1c) || !clearBetween(p1r, p1c, p2r, p2c) ||
      !clearBetween(p2r, p2c, b.r, b.c)) return null;
    return [{ r: a.r, c: a.c }, { r: p1r, c: p1c }, { r: p2r, c: p2c }, { r: b.r, c: b.c }];
  }

  // Path length (formula path_choice): cells stepped through, outer ring included.
  function pathLength(path) {
    let n = 0;
    for (let i = 1; i < path.length; i++) {
      n += Math.abs(path[i].r - path[i - 1].r) + Math.abs(path[i].c - path[i - 1].c);
    }
    return n;
  }

  // Orders two paths with the same turn count (GDD rule 7 levels 2-3): shorter
  // first, then turn points row-major (row, then col), first turn point from
  // `a` before the second. Negative when p comes first, 0 when identical.
  function comparePaths(p, q) {
    const d = pathLength(p) - pathLength(q);
    if (d !== 0) return d;
    for (let i = 1; i < p.length - 1; i++) {
      if (p[i].r !== q[i].r) return p[i].r - q[i].r;
      if (p[i].c !== q[i].c) return p[i].c - q[i].c;
    }
    return 0;
  }

  // Reshuffle level 1 (GDD rule 12): permutes every card, top and under layers,
  // among the positions they occupy now, using the `shuffle` stream. Position
  // order is row-major, each cell's top before its under layer (bottom first);
  // roadblocks and empty cells are not positions. Stack shape stays the same.
  function permuteOccupied() {
    const cards = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        if (!isUnit(top[r][c])) continue;
        cards.push(top[r][c]);
        for (const k of under[r][c]) cards.push(k);
      }
    }
    streams.shuffle.shuffle(cards);
    let next = 0;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        if (!isUnit(top[r][c])) continue;
        top[r][c] = cards[next++];
        const stack = under[r][c];
        for (let i = 0; i < stack.length; i++) stack[i] = cards[next++];
      }
    }
  }

  // Level 1 repeated: true as soon as a permutation leaves a playable pair,
  // false after RESHUFFLE_TRIES failed permutations.
  function permuteUntilPlayable() {
    for (let i = 0; i < RESHUFFLE_TRIES; i++) {
      permuteOccupied();
      if (board.hasPlayablePair()) return true;
    }
    return false;
  }

  // Reshuffle level 2 (GDD rule 12), deterministic: the first row-major pair of
  // top-layer units (p, q) that would connect if they were the same kind; then
  // the first card r of p's kind in position order other than p's top; swaps
  // q's top with r. Returns false (board unchanged) when no such pair exists.
  function swapFallback() {
    const units = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) if (isUnit(top[r][c])) units.push({ r, c });
    }
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const p = units[i];
        const q = units[j];
        if (board.findPath(p, q) === null) continue;
        const kind = top[p.r][p.c];
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            if (!isUnit(top[r][c])) continue;
            if (top[r][c] === kind && !(r === p.r && c === p.c)) {
              top[r][c] = top[q.r][q.c];
              top[q.r][q.c] = kind;
              return true;
            }
            const stack = under[r][c];
            for (let k = 0; k < stack.length; k++) {
              if (stack[k] !== kind) continue;
              stack[k] = top[q.r][q.c];
              top[q.r][q.c] = kind;
              return true;
            }
          }
        }
        // I1 guarantees r exists; reaching here means I1 is already broken.
        return false;
      }
    }
    return false;
  }

  // Reshuffle level 3 (GDD rule 12): row-major over cells, flips each buried
  // card (the one revealed next first) onto the top layer of the row-major
  // first empty cell at that moment, until none are left or no cell is empty.
  // Returns how many cards moved.
  function liftBuried() {
    let moved = 0;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const stack = under[r][c];
        while (stack.length > 0) {
          const spot = firstEmptyCell();
          if (spot === null) return moved;
          top[spot.r][spot.c] = stack.pop();
          moved++;
        }
      }
    }
    return moved;
  }

  // Every empty top-layer cell of the playable area, row-major (addPairs,
  // placeBlocks). Empty cells never hold buried cards (I3).
  function emptyCells() {
    const out = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) if (top[r][c] === EMPTY_CELL) out.push({ r, c });
    }
    return out;
  }

  function firstEmptyCell() {
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) if (top[r][c] === EMPTY_CELL) return { r, c };
    }
    return null;
  }

  const board = {
    cols,
    rows,
    /** @param {string} name one of deal, shuffle, wave, add @returns {Object} that stream */
    rng(name) {
      if (!Object.prototype.hasOwnProperty.call(streams, name)) {
        throw new RangeError('unknown rng stream: ' + name);
      }
      return streams[name];
    },
    /** @returns {*} kind id, ROADBLOCK or EMPTY_CELL */
    get(row, col) {
      if (!inGrid(row, col)) throw new RangeError('cell out of grid');
      return top[row][col];
    },
    /** Sets a cell; the outer ring must stay empty. */
    set(row, col, value) {
      if (!inGrid(row, col)) throw new RangeError('cell out of grid');
      const ring = row === 0 || row === rows + 1 || col === 0 || col === cols + 1;
      if (ring && value !== EMPTY_CELL) throw new RangeError('outer ring must stay empty');
      top[row][col] = value;
    },
    /**
     * Deals a chapter's deck (GDD rule 4). Clears both layers, builds the pile in
     * UNIT_KINDS order, shuffles it with the `deal` stream, fills the top layer
     * row-major (rows 1..startRows in press mode, every row otherwise), then buries
     * each extra card in a cell whose under layer is below STACK_DEPTH, picked
     * uniformly with the `deal` stream. Throws RangeError when deckValid fails,
     * so a bad deck is refused in release builds too (keeps I1 and I3).
     * Starts a round, so it also clears the selection and turns Zhao Yun stand-by off.
     * Does not reshuffle a board without a playable pair (that is ensurePlayable).
     * @param {{deck: Object<string, number>, mode: (string|undefined), startRows: (number|undefined)}} chapter
     *   `mode` is 'press', 'boss' or 'food'; `startRows` is required for 'press'
     * @example board.deal({ deck: { huo: 10, ying: 10 }, mode: 'press', startRows: 4 });
     */
    deal(chapter) {
      const mode = chapter.mode;
      const startRows = chapter.startRows;
      if (mode === 'press' && (!Number.isInteger(startRows) || startRows < 1 || startRows > rows)) {
        throw new RangeError('press startRows must be an integer in 1..rows');
      }
      if (!deckValid(chapter.deck, { cols, rows, mode, startRows })) {
        throw new RangeError('invalid deck for this board');
      }
      for (let r = 0; r < rows + 2; r++) {
        for (let c = 0; c < cols + 2; c++) {
          top[r][c] = EMPTY_CELL;
          under[r][c] = [];
        }
      }
      selected = null;
      forceNextOn = false;
      const pile = [];
      for (const kind of UNIT_KINDS) {
        const n = chapter.deck[kind] === undefined ? 0 : chapter.deck[kind];
        for (let i = 0; i < n; i++) pile.push(kind);
      }
      const stream = streams.deal;
      stream.shuffle(pile);

      const fillRows = mode === 'press' ? startRows : rows;
      let next = 0;
      for (let r = 1; r <= fillRows; r++) {
        for (let c = 1; c <= cols; c++) top[r][c] = pile[next++];
      }
      while (next < pile.length) {
        const open = [];
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            if (top[r][c] !== EMPTY_CELL && under[r][c].length < STACK_DEPTH) open.push(under[r][c]);
          }
        }
        open[stream.int(open.length)].push(pile[next++]);
      }
    },
    /**
     * Snapshot of every playable cell, row-major. Fresh objects; mutating them
     * does not change the board. `under` lists the buried kinds bottom first;
     * the view must show only its length (the player may not see buried kinds).
     * @returns {Array<{r: number, c: number, top: *, under: Array<string>}>}
     *   `top` is a kind id, ROADBLOCK or EMPTY_CELL
     * @example board.cells()[0] // { r: 1, c: 1, top: 'gu', under: ['dao'] }
     */
    cells() {
      const out = [];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          out.push({ r, c, top: top[r][c], under: under[r][c].slice() });
        }
      }
      return out;
    },
    /**
     * Number of units of one kind on the board, top and under layers together.
     * @param {string} kind a UNIT_KINDS id (roadblocks are not units); throws RangeError otherwise
     * @returns {number}
     * @example board.count('gu') // 8 right after dealing chapter 5
     */
    count(kind) {
      if (UNIT_KINDS.indexOf(kind) === -1) throw new RangeError('unknown unit kind: ' + kind);
      let n = 0;
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          if (top[r][c] === kind) n++;
          for (const k of under[r][c]) if (k === kind) n++;
        }
      }
      return n;
    },
    /**
     * Pairs left (formula pairs_left): (top-layer units + buried units) / 2; roadblocks excluded.
     * @returns {number}
     * @example board.pairsLeft() // 22 after dealing chapter 5
     */
    pairsLeft() {
      let n = 0;
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          if (top[r][c] !== EMPTY_CELL && top[r][c] !== ROADBLOCK) n++;
          n += under[r][c].length;
        }
      }
      return n / 2;
    },
    /**
     * Number of cards buried under one cell (0..STACK_DEPTH; always 0 on the outer ring).
     * @returns {number}
     * @example board.depthAt(1, 1) // 0 or 1
     */
    depthAt(row, col) {
      if (!inGrid(row, col)) throw new RangeError('cell out of grid');
      return under[row][col].length;
    },
    /**
     * Total buried cards on the board (formula buried_count right after a deal).
     * @returns {number}
     * @example board.buriedCount() // 14 after dealing chapter 5
     */
    buriedCount() {
      let n = 0;
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) n += under[r][c].length;
      }
      return n;
    },
    /**
     * Buries one card under a cell, like `set` for the under layer (board setup,
     * test fixtures). Keeps I3 and STACK_DEPTH: the cell must hold a unit on top
     * and have room below. Does not check I1 (the caller sets up whole pairs).
     * @param {number} row playable row
     * @param {number} col playable column
     * @param {string} kind a UNIT_KINDS id; throws RangeError otherwise, or when
     *   the cell is off the playable area, has no unit on top, or is full
     * @example board.set(2, 3, 'dao'); board.bury(2, 3, 'gu'); board.depthAt(2, 3) // 1
     */
    bury(row, col, kind) {
      if (!inGrid(row, col) || row < 1 || row > rows || col < 1 || col > cols) {
        throw new RangeError('cell outside the playable area');
      }
      if (UNIT_KINDS.indexOf(kind) === -1) throw new RangeError('unknown unit kind: ' + kind);
      if (!isUnit(top[row][col])) throw new RangeError('only a cell with a unit on top can bury a card');
      if (under[row][col].length >= STACK_DEPTH) throw new RangeError('cell is already full');
      under[row][col].push(kind);
    },
    /**
     * Cells whose top buried card (the one revealed next) is `kind`, row-major
     * (GDD rule 15; Guan Yu's extra cut when the top layer has no such unit).
     * @param {string} kind a UNIT_KINDS id; throws RangeError otherwise
     * @returns {Array<{r: number, c: number}>} fresh objects, empty when none
     * @example board.buriedCells('gu') // [{ r: 2, c: 3 }] when 刀 sits on 鼓 at (2,3)
     */
    buriedCells(kind) {
      if (UNIT_KINDS.indexOf(kind) === -1) throw new RangeError('unknown unit kind: ' + kind);
      const out = [];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const stack = under[r][c];
          if (stack.length > 0 && stack[stack.length - 1] === kind) out.push({ r, c });
        }
      }
      return out;
    },
    /**
     * Clears every card of one kind, buried ones included (GDD rule 13,
     * non-player clear). Buried cards of `kind` go first, then the top-layer
     * units of `kind` row-major; a cleared top cell flips up a remaining buried
     * card of another kind, so a cell that held `kind` on `kind` ends empty.
     * Roadblocks never break here. Clears the selection when its cell is
     * cleared. Kinds already gone still return a `clear` (all counts 0); only
     * buried cards left gives `cells: []` and `buried` = their number.
     * Returns data only; the caller emits it.
     * @param {string} kind a UNIT_KINDS id; throws RangeError otherwise
     * @param {string} source who asked: 'effect' or 'skill'
     * @returns {Object} `{type: 'clear', source, kind, cells, buried, revealed, pairs}`:
     *   `cells` lists cleared top cells `{r, c}` row-major, `buried` is the number
     *   of buried cards removed, `revealed` lists `{r, c, kind}` flipped up,
     *   `pairs = (cells.length + buried) / 2`. `{ok: false}` with the board
     *   unchanged when this kind's total is odd (I1 already broken).
     * @example board.clearKind('ying', 'effect')
     *   // { type: 'clear', source: 'effect', kind: 'ying', cells: [{r:1,c:1}, ...],
     *   //   buried: 2, revealed: [{ r: 1, c: 2, kind: 'gu' }], pairs: 3 }
     */
    clearKind(kind, source) {
      const total = board.count(kind);
      if (total % 2 !== 0) return { ok: false };
      let buried = 0;
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const kept = under[r][c].filter((k) => k !== kind);
          buried += under[r][c].length - kept.length;
          under[r][c] = kept;
        }
      }
      const cells = [];
      const revealed = [];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          if (top[r][c] === kind) clearTop(r, c, cells, revealed);
        }
      }
      return {
        type: 'clear', source, kind, cells, buried, revealed,
        pairs: (cells.length + buried) / 2,
      };
    },
    /**
     * Clears chosen positions (GDD rule 13; Guan Yu's row cut, Huang Zhong's
     * column shot). Each target is `{r, c, layer}`:
     *   'top'   - the top unit; a buried card under it flips up (`revealed`);
     *   'under' - only the buried card next to the top (the one revealed next);
     *   'stack' - the top unit and every card under it; the cell ends empty;
     *   'block' - breaks the roadblock in that cell.
     * 'top' and 'under' on the same cell act as 'stack'; repeated targets count
     * once. Ignored targets: an empty cell, 'under' with nothing buried,
     * 'top'/'stack'/'under' on a roadblock, 'block' on a cell without one.
     * I1 check: every card this call would remove (top and under) is counted per
     * kind; any odd count refuses the whole call with `{ok: false}` and the
     * board unchanged (release behaviour; logging is the caller's job, since
     * rules return data only). Clears the selection when its cell's top is cleared.
     * Returns data only; the caller emits it.
     * @param {Array<{r: number, c: number, layer: string}>} targets playable cells;
     *   throws RangeError for a cell outside the playable area or an unknown layer
     * @param {string} source who asked, e.g. 'skill'
     * @returns {Object} `{type: 'clear', source, cells, buried, blocks, revealed, pairs}`:
     *   `cells` lists cleared top cells `{r, c}` row-major, `buried` is the number
     *   of buried cards removed, `blocks` lists broken roadblocks `{r, c}`
     *   row-major, `revealed` lists `{r, c, kind}` flipped up,
     *   `pairs = (cells.length + buried) / 2` (roadblocks not counted);
     *   or `{ok: false}` as above
     * @example board.clearCells([{ r: 6, c: 1, layer: 'stack' }, { r: 6, c: 3, layer: 'block' },
     *   { r: 1, c: 1, layer: 'top' }], 'skill')
     *   // { type: 'clear', source: 'skill', cells: [{r:1,c:1},{r:6,c:1}], buried: 0,
     *   //   blocks: [{r:6,c:3}], revealed: [], pairs: 1 }
     */
    clearCells(targets, source) {
      // Merge targets per cell: plan[key] = {r, c, top, under, block}.
      const plan = {};
      for (const t of targets) {
        if (!inGrid(t.r, t.c) || t.r < 1 || t.r > rows || t.c < 1 || t.c > cols) {
          throw new RangeError('cell outside the playable area');
        }
        if (['top', 'under', 'stack', 'block'].indexOf(t.layer) === -1) {
          throw new RangeError('unknown layer: ' + t.layer);
        }
        const key = t.r * (cols + 2) + t.c;
        if (plan[key] === undefined) plan[key] = { r: t.r, c: t.c, top: false, under: false, block: false };
        const p = plan[key];
        if (t.layer === 'top' || t.layer === 'stack') p.top = true;
        if (t.layer === 'under' || t.layer === 'stack') p.under = true;
        if (t.layer === 'block') p.block = true;
      }
      const order = Object.keys(plan).map(Number).sort((x, y) => x - y).map((k) => plan[k]);

      // I1 check over every card that would go, before touching the board.
      const removed = {};
      const tally = (kind) => { removed[kind] = (removed[kind] === undefined ? 0 : removed[kind]) + 1; };
      for (const p of order) {
        if (!isUnit(top[p.r][p.c])) continue;
        const stack = under[p.r][p.c];
        if (p.top) tally(top[p.r][p.c]);
        if (p.under && p.top) stack.forEach(tally);
        else if (p.under && stack.length > 0) tally(stack[stack.length - 1]);
      }
      for (const kind of Object.keys(removed)) if (removed[kind] % 2 !== 0) return { ok: false };

      const cells = [];
      const blocks = [];
      const revealed = [];
      let buried = 0;
      for (const p of order) {
        if (top[p.r][p.c] === ROADBLOCK) {
          if (p.block) {
            top[p.r][p.c] = EMPTY_CELL;
            blocks.push({ r: p.r, c: p.c });
          }
          continue;
        }
        if (!isUnit(top[p.r][p.c])) continue;
        const stack = under[p.r][p.c];
        if (p.under && p.top) {
          buried += stack.length;
          under[p.r][p.c] = [];
        } else if (p.under && stack.length > 0) {
          stack.pop();
          buried++;
        }
        if (p.top) clearTop(p.r, p.c, cells, revealed);
      }
      return {
        type: 'clear', source, cells, buried, blocks, revealed,
        pairs: (cells.length + buried) / 2,
      };
    },
    /**
     * What one row holds (GDD rule 15; Guan Yu picks a row and works out his
     * cut from it). Fresh objects; read-only.
     * @param {number} row playable row 1..rows; throws RangeError otherwise
     * @returns {{units: Array<{r: number, c: number, kind: string}>,
     *   buried: Array<{r: number, c: number, kind: string}>,
     *   blocks: Array<{r: number, c: number}>}} top-layer units, buried cards
     *   and roadblock cells, left to right
     * @example board.rowContents(6)
     *   // { units: [{r:6,c:1,kind:'dao'}, ...], buried: [{r:6,c:2,kind:'shu'}], blocks: [{r:6,c:3}] }
     */
    rowContents(row) {
      if (!Number.isInteger(row) || row < 1 || row > rows) throw new RangeError('row outside the playable area');
      const points = [];
      for (let c = 1; c <= cols; c++) points.push({ r: row, c });
      return lineContents(points);
    },
    /**
     * What one column holds (GDD rule 15; Huang Zhong picks a column). Same
     * shape as rowContents, listed top to bottom.
     * @param {number} col playable column 1..cols; throws RangeError otherwise
     * @returns {{units: Array<Object>, buried: Array<Object>, blocks: Array<Object>}}
     * @example board.colContents(2)
     *   // { units: [{r:1,c:2,kind:'ying'}, ...], buried: [{r:1,c:2,kind:'qi'}], blocks: [{r:3,c:2}] }
     */
    colContents(col) {
      if (!Number.isInteger(col) || col < 1 || col > cols) throw new RangeError('column outside the playable area');
      const points = [];
      for (let r = 1; r <= rows; r++) points.push({ r, c: col });
      return lineContents(points);
    },
    /**
     * Press mode push (GDD rules 13, 16): every top-layer unit and roadblock
     * (and any buried card under it) moves down one row and `row` becomes row 1.
     * Roadblocks on the bottom row leave the board and are listed in `dropped`.
     * The selection moves down with its unit; Zhao Yun stand-by is unchanged.
     * Refused with `{ok: false}` and the board unchanged when the bottom row
     * holds a unit (roadblocks do not count; breaching is decided by the caller
     * first) or when some kind appears an odd number of times in `row` (I1).
     * Returns data only; the caller (battle pressure) emits it.
     * @param {Array<*>} row `cols` entries, each a UNIT_KINDS id, EMPTY_CELL or
     *   ROADBLOCK; throws RangeError for a wrong length or an unknown entry
     * @returns {Object} `{type: 'push', row, empty, dropped}`: `row` is a copy of
     *   the new row 1, `empty` is true when it holds no unit and no roadblock,
     *   `dropped` lists the columns of roadblocks pushed off the board (left to
     *   right, `[]` when none); or `{ok: false}` as above
     * @example board.pushRowFromTop(['qi', 'dao', 'jm', 'dao', 'qi'])
     *   // { type: 'push', row: ['qi','dao','jm','dao','qi'], empty: false, dropped: [] }
     */
    pushRowFromTop(row) {
      if (!Array.isArray(row) || row.length !== cols) throw new RangeError('row must have cols entries');
      const inRow = {};
      for (const value of row) {
        if (value === EMPTY_CELL || value === ROADBLOCK) continue;
        if (UNIT_KINDS.indexOf(value) === -1) throw new RangeError('unknown row entry: ' + value);
        inRow[value] = (inRow[value] === undefined ? 0 : inRow[value]) + 1;
      }
      for (const kind of Object.keys(inRow)) if (inRow[kind] % 2 !== 0) return { ok: false };
      for (let c = 1; c <= cols; c++) if (isUnit(top[rows][c])) return { ok: false };

      const dropped = [];
      for (let c = 1; c <= cols; c++) if (top[rows][c] === ROADBLOCK) dropped.push(c);
      for (let r = rows; r > 1; r--) {
        for (let c = 1; c <= cols; c++) {
          top[r][c] = top[r - 1][c];
          under[r][c] = under[r - 1][c];
        }
      }
      for (let c = 1; c <= cols; c++) {
        top[1][c] = row[c - 1];
        under[1][c] = [];
      }
      if (selected !== null) selected = { r: selected.r + 1, c: selected.c };
      return {
        type: 'push', row: row.slice(),
        empty: row.every((v) => v === EMPTY_CELL), dropped,
      };
    },
    /**
     * Adds units in pairs (GDD rule 13; enemy reinforcements, phase-two refill).
     * For each kind in order, picks two empty top-layer cells with the `add`
     * stream (first uniformly from the row-major list of empty cells, then
     * uniformly from the rest) and puts that kind on both. Never covers a unit
     * (nothing is buried) and never uses a roadblock cell. Stops when fewer
     * than 2 empty cells are left, so I1 always holds. Returns data only.
     * @param {Array<string>} kinds one UNIT_KINDS id per pair; throws RangeError otherwise
     * @returns {{type: string, cells: Array<{r: number, c: number, kind: string}>,
     *   placed: number}} `{type: 'add', cells, placed}`: `cells` in placement
     *   order (two per pair), `placed` the number of pairs put down (may be 0)
     * @example board.addPairs(['dao', 'gu'])
     *   // { type: 'add', cells: [{r:1,c:4,kind:'dao'}, {r:2,c:1,kind:'dao'}, ...], placed: 2 }
     */
    addPairs(kinds) {
      for (const kind of kinds) {
        if (UNIT_KINDS.indexOf(kind) === -1) throw new RangeError('unknown unit kind: ' + kind);
      }
      const stream = streams.add;
      const cells = [];
      let placed = 0;
      for (const kind of kinds) {
        const open = emptyCells();
        if (open.length < 2) break;
        const a = open.splice(stream.int(open.length), 1)[0];
        const b = open[stream.int(open.length)];
        for (const p of [a, b]) {
          top[p.r][p.c] = kind;
          cells.push({ r: p.r, c: p.c, kind });
        }
        placed++;
      }
      return { type: 'add', cells, placed };
    },
    /**
     * Places roadblocks (GDD rule 9; the enemy general's `charge` special).
     * One at a time, picks an empty top-layer cell uniformly from the row-major
     * list with `stream` and puts a roadblock there; at most `n`, stopping when
     * no empty cell is left. Units are never covered. Returns data only.
     * @param {number} n most roadblocks to place; throws RangeError unless a
     *   non-negative integer
     * @param {{int: function(number): number}} stream random stream to draw from,
     *   e.g. `board.rng('wave')`
     * @returns {{type: string, cells: Array<{r: number, c: number}>}}
     *   `{type: 'blocks', cells}` in placement order (may be empty)
     * @example board.placeBlocks(2, board.rng('wave')) // { type: 'blocks', cells: [{r:3,c:2}, {r:5,c:4}] }
     */
    placeBlocks(n, stream) {
      if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be a non-negative integer');
      const cells = [];
      for (let i = 0; i < n; i++) {
        const open = emptyCells();
        if (open.length === 0) break;
        const p = open[stream.int(open.length)];
        top[p.r][p.c] = ROADBLOCK;
        cells.push({ r: p.r, c: p.c });
      }
      return { type: 'blocks', cells };
    },
    /**
     * Clears the selection (GDD rule 13; general skills call it on release and
     * when Guan Yu starts picking a row). Leaves Zhao Yun stand-by as it is.
     * @example board.tap(2, 3); board.clearSelection(); board.selection() // null
     */
    clearSelection() {
      selected = null;
    },
    /**
     * Connectivity test (GDD rule 7, formula path_choice). Looks for a polyline of
     * horizontal and vertical segments from `a` to `b` with at most MAX_TURNS
     * turns that, apart from its two ends, crosses only empty top-layer cells
     * (outer ring included; roadblocks and units block, buried cards never do).
     * Picks fewest turns first, then shortest length (cells stepped through),
     * then turn points in row-major order (smaller row, then smaller column;
     * outer-ring coordinates compare like any other), comparing the first turn
     * point from `a` before the second. The result depends on the order of the
     * arguments: findPath(b, a) may return a different polyline than findPath(a, b).
     * Does not look at kinds or at the cells `a` and `b` themselves.
     * @param {{r: number, c: number}} a first cell (playable area)
     * @param {{r: number, c: number}} b second cell (playable area)
     * @returns {(Array<{r: number, c: number}>|null)} 2-4 fresh points from a to b
     *   (turns = points - 2), or null when not connected or a and b are the same cell;
     *   throws RangeError for a cell outside the grid
     * @example board.findPath({ r: 2, c: 1 }, { r: 2, c: 4 })
     *   // [{r:2,c:1},{r:1,c:1},{r:1,c:4},{r:2,c:4}] when row 1 is open and (2,2),(2,3) are not
     * @example board.findPath({ r: 2, c: 1 }, { r: 4, c: 3 })
     *   // [{r:2,c:1},{r:2,c:3},{r:4,c:3}] when both corners are open: equal length, row 2 < row 4
     */
    findPath(a, b) {
      if (!inGrid(a.r, a.c) || !inGrid(b.r, b.c)) throw new RangeError('cell out of grid');
      if (a.r === b.r && a.c === b.c) return null;
      // 0 turns: straight line.
      if ((a.r === b.r || a.c === b.c) && clearBetween(a.r, a.c, b.r, b.c)) {
        return [{ r: a.r, c: a.c }, { r: b.r, c: b.c }];
      }
      // 1 or 2 turns: every candidate with that turn count competes on
      // (length, turn points row-major); the best one wins.
      let best = null;
      const consider = (path) => {
        if (path !== null && (best === null || comparePaths(path, best) < 0)) best = path;
      };
      // 1 turn: one of the two corners.
      if (a.r !== b.r && a.c !== b.c) {
        const corners = [[a.r, b.c], [b.r, a.c]];
        for (const k of corners) {
          if (top[k[0]][k[1]] === EMPTY_CELL && clearBetween(a.r, a.c, k[0], k[1]) &&
            clearBetween(k[0], k[1], b.r, b.c)) {
            consider([{ r: a.r, c: a.c }, { r: k[0], c: k[1] }, { r: b.r, c: b.c }]);
          }
        }
        if (best !== null) return best;
      }
      // 2 turns: leave a sideways to column c (then down/up to b's row), or
      // vertically to row r (then across to b's column).
      if (a.r !== b.r) {
        for (let c = 0; c <= cols + 1; c++) {
          if (c !== a.c && c !== b.c) consider(twoTurn(a, b, a.r, c, b.r, c));
        }
      }
      if (a.c !== b.c) {
        for (let r = 0; r <= rows + 1; r++) {
          if (r !== a.r && r !== b.r) consider(twoTurn(a, b, r, a.c, r, b.c));
        }
      }
      return best;
    },
    /**
     * The selected cell (GDD rule 6), or null when nothing is selected.
     * @returns {({r: number, c: number}|null)} a fresh object
     * @example board.tap(2, 3); board.selection() // { r: 2, c: 3 }
     */
    selection() {
      return selected === null ? null : { r: selected.r, c: selected.c };
    },
    /**
     * Turns Zhao Yun stand-by on or off (GDD rule 14; press and food modes only,
     * the caller decides). While on, the next pair of the selected kind is a
     * forced `match`; that match turns it off. `deal` turns it off.
     * @param {boolean} on
     * @example board.setForceNext(true); board.forceNext() // true
     */
    setForceNext(on) {
      forceNextOn = on === true;
    },
    /**
     * Whether Zhao Yun stand-by is on (read-only).
     * @returns {boolean}
     * @example board.forceNext() // false right after deal
     */
    forceNext() {
      return forceNextOn;
    },
    /**
     * Handles one tap on a cell (GDD rules 6 and 8). Only top-layer units can be
     * selected; buried cards are never tapped. Taps on an empty cell or the outer
     * ring cancel a selection; taps on a roadblock change nothing. A tap on the
     * selected cell cancels it; a unit of another kind takes over the selection.
     * A unit of the selected kind is judged with findPath(selected, tapped):
     * connected -> both top cells empty (buried cards flip up), selection cleared,
     * returns a `match` event; not connected -> board unchanged, selection moves
     * to the tapped cell, returns a `miss` event. With Zhao Yun stand-by on
     * (GDD rule 14) a same-kind pair always matches with `forced: true` and turns
     * stand-by off: `path` is the normal polyline when one exists, otherwise the
     * 2-point straight line between the two cells; no `miss` is produced. A tap on
     * another kind keeps stand-by on. Returns data only; the caller (round flow)
     * emits it. Board lock is the caller's job: a locked board gets no taps.
     * @param {number} row grid row (outer ring allowed)
     * @param {number} col grid column (outer ring allowed); throws RangeError off the grid
     * @returns {(Object|null)} null when the tap produces no event, otherwise
     *   `{type: 'match', kind, a, b, path, forced, broken, revealed}` or
     *   `{type: 'miss', kind, a, b}`; `a` is the first selected cell, `b` the
     *   tapped one, `revealed` lists `{r, c, kind}` (a first, then b), `forced`
     *   is true for a Zhao Yun pair, `broken` stays empty until the roadblock story
     * @example board.tap(2, 1); board.tap(2, 4)
     *   // { type: 'match', kind: 'dao', a: {r:2,c:1}, b: {r:2,c:4},
     *   //   path: [...], forced: false, broken: [], revealed: [{ r: 2, c: 4, kind: 'gu' }] }
     */
    tap(row, col) {
      if (!inGrid(row, col)) throw new RangeError('cell out of grid');
      const value = top[row][col];
      if (value === ROADBLOCK) return null;
      if (value === EMPTY_CELL) {
        selected = null;
        return null;
      }
      if (selected === null) {
        selected = { r: row, c: col };
        return null;
      }
      const a = selected;
      if (a.r === row && a.c === col) {
        selected = null;
        return null;
      }
      const b = { r: row, c: col };
      if (top[a.r][a.c] !== value) {
        selected = b;
        return null;
      }
      const forced = forceNextOn;
      let path = board.findPath(a, b);
      if (path === null && forced) path = [{ r: a.r, c: a.c }, { r: b.r, c: b.c }];
      if (path === null) {
        selected = b;
        return { type: 'miss', kind: value, a: { r: a.r, c: a.c }, b: { r: b.r, c: b.c } };
      }
      const revealed = [];
      for (const p of [a, b]) {
        const flipped = removeTop(p.r, p.c);
        if (flipped !== null) revealed.push(flipped);
      }
      selected = null;
      forceNextOn = false;
      return {
        type: 'match', kind: value, a: { r: a.r, c: a.c }, b: { r: b.r, c: b.c },
        path, forced, broken: [], revealed,
      };
    },
    /**
     * Whether the top layer holds at least one pair of the same kind that
     * findPath connects (invariant I2, GDD rule 11). Buried cards never count;
     * Zhao Yun stand-by is ignored. False on a board with no units.
     * @returns {boolean}
     * @example boardFromPicture(['dao . dao . .', ...]).hasPlayablePair() // true
     */
    hasPlayablePair() {
      const byKind = {};
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const kind = top[r][c];
          if (!isUnit(kind)) continue;
          if (byKind[kind] === undefined) byKind[kind] = [];
          byKind[kind].push({ r, c });
        }
      }
      for (const kind of UNIT_KINDS) {
        const list = byKind[kind];
        if (list === undefined) continue;
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            if (board.findPath(list[i], list[j]) !== null) return true;
          }
        }
      }
      return false;
    },
    /**
     * Dead-board reshuffle (GDD rule 12), called by round flow at a settle
     * point. Returns null and changes nothing when the board has no units or
     * already has a playable pair. Otherwise fixes the board in place:
     * level 1 permutes all cards (top and under) among their current positions
     * with the `shuffle` stream, up to RESHUFFLE_TRIES times; level 2 swaps
     * deterministically (no random numbers); level 3 lifts buried cards onto
     * empty cells, then, if still dead, runs level 1 and level 2 once more.
     * Roadblocks never move; the selection is always cleared. Work is bounded
     * (formula reshuffle_bound): at most RESHUFFLE_TRIES x 2 permutations, one
     * swap and one lift. Requests no token; returns data only.
     * Level 4 (break roadblocks, clear the board) is NOT handled here (story
     * board-link/011): when levels 1-3 all fail it returns `{ok: false}` and
     * the board is left playable-less.
     * @returns {(Object|null)} `{type: 'reshuffle', fallback}` (`fallback` true when
     *   level 2 or 3 was needed), null when no reshuffle was needed, or
     *   `{ok: false}` when only level 4 could help
     * @example board.ensurePlayable() // { type: 'reshuffle', fallback: false } on a dead board
     */
    ensurePlayable() {
      let anyUnit = false;
      for (let r = 1; r <= rows && !anyUnit; r++) {
        for (let c = 1; c <= cols; c++) if (isUnit(top[r][c])) anyUnit = true;
      }
      if (!anyUnit || board.hasPlayablePair()) return null;
      selected = null;
      if (permuteUntilPlayable()) return { type: 'reshuffle', fallback: false };
      if (swapFallback()) return { type: 'reshuffle', fallback: true };
      if (liftBuried() > 0) {
        if (board.hasPlayablePair() || permuteUntilPlayable() || swapFallback()) {
          return { type: 'reshuffle', fallback: true };
        }
      }
      // Level 4 seam: story board-link/011 breaks roadblocks and clears here.
      return { ok: false };
    },
  };
  return board;
}

/**
 * Validates a chapter deck: every kind has an even count and the total fits the board.
 * Full mode: cols*rows <= sum <= cols*rows*(1+STACK_DEPTH). Press mode: sum == cols*startRows.
 * @param {Object<string, number>} deck kind id to block count (missing kinds count 0)
 * @param {{cols: (number|undefined), rows: number, mode: (string|undefined), startRows: (number|undefined)}} board
 *   `mode` is the chapter mode: 'press' checks sum == cols*startRows; 'boss', 'food' or omitted check the full-board range; `cols` defaults to 6
 * @returns {boolean} false means the chapter loader must refuse the chapter
 * @example deckValid({ huo: 14, ying: 14, ma: 2 }, { cols: 5, rows: 6 }) // 30 -> true
 */
export function deckValid(deck, board) {
  const cols = board.cols === undefined ? BOARD_COLS : board.cols;
  for (const key of Object.keys(deck)) {
    if (UNIT_KINDS.indexOf(key) === -1) return false;
  }
  let sum = 0;
  for (const kind of UNIT_KINDS) {
    const n = deck[kind] === undefined ? 0 : deck[kind];
    if (!Number.isInteger(n) || n < 0 || n % 2 !== 0) return false;
    sum += n;
  }
  if (board.mode === 'press') return sum === cols * board.startRows;
  const cells = cols * board.rows;
  return sum >= cells && sum <= cells * (1 + STACK_DEPTH);
}
