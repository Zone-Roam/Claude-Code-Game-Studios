// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// 盘面与连通 (design/gdd/board-link.md). Pure: no page, clock, randomness or storage.
// Coordinates are {r, c}; playable cells are 1..rows × 1..cols, the outer ring is 0 and rows+1 / cols+1.
// SLICE v6 (DESIGN-v6.md, not yet in the GDD): `chapter.cols` (default BOARD_COLS) and stacking. A deck bigger
// than the board deals the extra tiles face down under random cells (at most STACK_DEPTH per cell). Only the top
// tile is seen, tapped and linked; clearing it turns the one below face up. Kind counts include buried tiles.

import { KINDS, BOARD_COLS, RESHUFFLE_TRIES, BLOCK, STACK_DEPTH } from '../core/constants.mjs';
import { createStream } from '../core/rng.mjs';
import { devAssert, devWarn } from '../core/assert.mjs';

/**
 * Creates the board for one round and deals it.
 * @param {object} chapter loaded chapter data (rows, deck)
 * @param {{seed: number, streams?: object}} opts seed, or test-only stream overrides
 * @returns {object} board API (board-link rules 11 and 14)
 */
export function createBoard(chapter, opts) {
  const rows = chapter.rows;
  const cols = chapter.cols || BOARD_COLS;
  const streams = Object.assign({
    deal: createStream(opts.seed, 'deal'),
    shuffle: createStream(opts.seed, 'shuffle'),
    wave: createStream(opts.seed, 'wave'),
    add: createStream(opts.seed, 'add'),
  }, opts.streams || {});

  const grid = [];
  const under = []; // under[r][c]: kinds buried below the top tile, last = next to turn up
  for (let r = 0; r <= rows + 1; r++) {
    const line = [];
    const low = [];
    for (let c = 0; c <= cols + 1; c++) { line.push(null); low.push([]); }
    grid.push(line);
    under.push(low);
  }
  let selection = null;
  let forceNext = false;
  let version = 0;

  function inPlay(r, c) {
    return r >= 1 && r <= rows && c >= 1 && c <= cols;
  }

  function at(r, c) {
    return inPlay(r, c) ? grid[r][c] : null;
  }

  function isFree(r, c) {
    return at(r, c) === null;
  }

  // Tiles only: barricades (slice v5) are never part of the tile logic.
  function occupied() {
    const list = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) if (grid[r][c] !== null && grid[r][c] !== BLOCK) list.push({ r, c });
    }
    return list;
  }

  function blocks() {
    const list = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) if (grid[r][c] === BLOCK) list.push({ r, c });
    }
    return list;
  }

  // Barricades next to (up/down/left/right) any of the cells.
  function blocksNextTo(cells) {
    const out = [];
    for (const p of cells) {
      for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const r = p.r + d[0];
        const c = p.c + d[1];
        if (at(r, c) === BLOCK && !out.some((q) => q.r === r && q.c === c)) out.push({ r, c });
      }
    }
    return out;
  }

  function changed() {
    version++;
  }

  // Every tile on the board as a slot: d = -1 is the top, d >= 0 an index into under[r][c].
  function slots() {
    const out = [];
    for (const p of occupied()) {
      out.push({ r: p.r, c: p.c, d: -1 });
      for (let d = 0; d < under[p.r][p.c].length; d++) out.push({ r: p.r, c: p.c, d });
    }
    return out;
  }

  function slotKind(s) {
    return s.d < 0 ? grid[s.r][s.c] : under[s.r][s.c][s.d];
  }

  function setSlot(s, k) {
    if (s.d < 0) grid[s.r][s.c] = k;
    else under[s.r][s.c][s.d] = k;
  }

  function freeCell() {
    for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) if (grid[r][c] === null) return { r, c };
    return null;
  }

  function buriedCount() {
    let n = 0;
    for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) n += under[r][c].length;
    return n;
  }

  function checkEven() {
    const counts = {};
    for (const s of slots()) counts[slotKind(s)] = (counts[slotKind(s)] || 0) + 1;
    for (const k of KINDS) devAssert(!counts[k] || counts[k] % 2 === 0, 'I1 broken for ' + k);
  }

  // Cells strictly between p and q (same row or column) are all free.
  function segClear(p, q) {
    if (p.r === q.r) {
      const lo = Math.min(p.c, q.c);
      const hi = Math.max(p.c, q.c);
      for (let c = lo + 1; c < hi; c++) if (!isFree(p.r, c)) return false;
      return true;
    }
    const lo = Math.min(p.r, q.r);
    const hi = Math.max(p.r, q.r);
    for (let r = lo + 1; r < hi; r++) if (!isFree(r, p.c)) return false;
    return true;
  }

  function better(x, y) {
    if (!y) return true;
    if (x.turns !== y.turns) return x.turns < y.turns;
    if (x.length !== y.length) return x.length < y.length;
    for (let i = 0; i < x.corners.length; i++) {
      if (x.corners[i].r !== y.corners[i].r) return x.corners[i].r < y.corners[i].r;
      if (x.corners[i].c !== y.corners[i].c) return x.corners[i].c < y.corners[i].c;
    }
    return false;
  }

  /**
   * Finds the chosen path between a and b, ignoring what kind they are.
   * @returns {Array<{r:number,c:number}>|null} 2–4 points from a to b, or null
   */
  function findPath(a, b) {
    let best = null;
    const dist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    if ((a.r === b.r || a.c === b.c) && segClear(a, b)) {
      return [a, b];
    }
    if (a.r !== b.r && a.c !== b.c) {
      for (const k of [{ r: a.r, c: b.c }, { r: b.r, c: a.c }]) {
        if (isFree(k.r, k.c) && segClear(a, k) && segClear(k, b)) {
          const cand = { turns: 1, length: dist, corners: [k] };
          if (better(cand, best)) best = cand;
        }
      }
    }
    if (best) return [a, best.corners[0], b];
    if (a.c !== b.c) {
      for (let x = 0; x <= rows + 1; x++) {
        if (x === a.r || x === b.r) continue;
        const p1 = { r: x, c: a.c };
        const p2 = { r: x, c: b.c };
        if (isFree(p1.r, p1.c) && isFree(p2.r, p2.c) && segClear(a, p1) && segClear(p1, p2) && segClear(p2, b)) {
          const cand = { turns: 2, length: Math.abs(a.r - x) + Math.abs(a.c - b.c) + Math.abs(x - b.r), corners: [p1, p2] };
          if (better(cand, best)) best = cand;
        }
      }
    }
    if (a.r !== b.r) {
      for (let y = 0; y <= cols + 1; y++) {
        if (y === a.c || y === b.c) continue;
        const p1 = { r: a.r, c: y };
        const p2 = { r: b.r, c: y };
        if (isFree(p1.r, p1.c) && isFree(p2.r, p2.c) && segClear(a, p1) && segClear(p1, p2) && segClear(p2, b)) {
          const cand = { turns: 2, length: Math.abs(a.c - y) + Math.abs(a.r - b.r) + Math.abs(y - b.c), corners: [p1, p2] };
          if (better(cand, best)) best = cand;
        }
      }
    }
    return best ? [a, best.corners[0], best.corners[1], b] : null;
  }

  function hasPlayablePair() {
    const byKind = {};
    for (const p of occupied()) {
      const k = grid[p.r][p.c];
      (byKind[k] = byKind[k] || []).push(p);
    }
    for (const k of KINDS) {
      const list = byKind[k];
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) if (findPath(list[i], list[j])) return true;
      }
    }
    return false;
  }

  // A cleared top tile lets the buried one below turn up.
  function removeCells(cells) {
    for (const p of cells) grid[p.r][p.c] = under[p.r][p.c].length ? under[p.r][p.c].pop() : null;
    if (selection && cells.some((p) => p.r === selection.r && p.c === selection.c)) selection = null;
    changed();
  }

  // Board-link rule 10: permute within occupied cells, then the deterministic fallback.
  // Slice v6: buried tiles are shuffled with the top ones; the stack shape stays.
  function reshuffle(stream) {
    const cells = occupied();
    const all = slots();
    const kinds = all.map(slotKind);
    selection = null;
    for (let t = 0; t < RESHUFFLE_TRIES; t++) {
      stream.shuffle(kinds);
      all.forEach((s, i) => setSlot(s, kinds[i]));
      if (hasPlayablePair()) {
        changed();
        return { type: 'reshuffle', fallback: false };
      }
    }
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const p = cells[i];
        const q = cells[j];
        if (!findPath(p, q)) continue;
        const kp = grid[p.r][p.c];
        const r = all.find((x) => (x.r !== p.r || x.c !== p.c || x.d >= 0) && slotKind(x) === kp);
        devAssert(r && (r.r !== q.r || r.c !== q.c || r.d >= 0), 'fallback partner');
        const tmp = grid[q.r][q.c];
        grid[q.r][q.c] = slotKind(r);
        setSlot(r, tmp);
        changed();
        checkEven();
        return { type: 'reshuffle', fallback: true };
      }
    }
    // Slice v6: too few tiles face up to link (e.g. the last pair stacked in one cell): lift the buried
    // tiles onto free cells and try again.
    if (buriedCount() > 0) {
      let lifted = 0;
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          while (under[r][c].length) {
            const free = freeCell();
            if (!free) break;
            grid[free.r][free.c] = under[r][c].pop();
            lifted++;
          }
        }
      }
      if (lifted) {
        changed();
        if (hasPlayablePair()) return { type: 'reshuffle', fallback: true };
        return reshuffle(stream);
      }
    }
    // board-link rule 12, level 4 (release behaviour; the slice only asserted): break every 拒马 first and
    // retry from level 1. The sim hit this on ch10 (tiles walled in by 布鹿角), so it is implemented here.
    const bars = blocks();
    if (bars.length) {
      for (const p of bars) grid[p.r][p.c] = null;
      changed();
      const again = reshuffle(stream);
      if (again.type === 'reshuffle') again.blocksBroken = bars.length;
      return again;
    }
    devWarn('reshuffle level 4: clearing the board');
    const left = occupied();
    const buriedLeft = buriedCount();
    for (const p of left) under[p.r][p.c] = [];
    removeCells(left);
    return { type: 'clear', source: 'reshuffle', cells: left, buried: buriedLeft, pairs: (left.length + buriedLeft) / 2 };
  }

  // Deal (board-link rule 4): build the deck in kind-table order, shuffle with `deal`, fill row-major.
  // `opts.layout` (rows of kind ids or null) is a test-only override that places tiles directly.
  // `opts.under` ({r, c, kind} list) is the test-only override for buried tiles.
  (function deal() {
    if (opts.layout) {
      opts.layout.forEach((line, i) => line.forEach((k, j) => { grid[i + 1][j + 1] = k; }));
      for (const u of opts.under || []) under[u.r][u.c].push(u.kind);
      return;
    }
    const deck = [];
    for (const k of KINDS) {
      const n = chapter.deck[k] || 0;
      for (let i = 0; i < n; i++) deck.push(k);
    }
    streams.deal.shuffle(deck);
    let i = 0;
    for (let r = 1; r <= rows && i < deck.length; r++) {
      for (let c = 1; c <= cols && i < deck.length; c++) grid[r][c] = deck[i++];
    }
    // Slice v6: the rest of the deck goes face down under random cells.
    while (i < deck.length) {
      const room = [];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) if (under[r][c].length < STACK_DEPTH) room.push({ r, c });
      }
      devAssert(room.length > 0, 'deck bigger than the board can stack');
      if (room.length === 0) break;
      const p = room[streams.deal.int(room.length)];
      under[p.r][p.c].push(deck[i++]);
    }
    checkEven();
    if (!hasPlayablePair()) reshuffle(streams.shuffle);
  })();

  /**
   * Handles a press on cell (r, c) (board-link rules 5–7, 12).
   * @returns {object|null} match / miss result, or null when only the selection changed
   */
  function tap(r, c) {
    const kind = at(r, c);
    if (kind === BLOCK) return null;
    if (!selection) {
      if (kind !== null) { selection = { r, c }; changed(); }
      return null;
    }
    const a = selection;
    if (a.r === r && a.c === c) { selection = null; changed(); return null; }
    if (kind === null) { selection = null; changed(); return null; }
    const ka = grid[a.r][a.c];
    if (ka !== kind) { selection = { r, c }; changed(); return null; }
    const b = { r, c };
    const path = findPath(a, b);
    if (forceNext) {
      forceNext = false;
      removeCells([a, b]);
      selection = null;
      return { type: 'match', kind, a, b, path: path || [a, b], forced: true };
    }
    if (path) {
      const broken = blocksNextTo([a, b]);
      removeCells([a, b].concat(broken));
      selection = null;
      return { type: 'match', kind, a, b, path, forced: false, broken };
    }
    selection = { r, c };
    changed();
    return { type: 'miss', kind, a, b };
  }

  /** Clears every tile of one kind, buried ones too (effects, Zhuge Liang). */
  function clearKind(kind, source) {
    let buried = 0;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const before = under[r][c].length;
        under[r][c] = under[r][c].filter((k) => k !== kind);
        buried += before - under[r][c].length;
      }
    }
    const cells = occupied().filter((p) => grid[p.r][p.c] === kind);
    removeCells(cells);
    return { type: 'clear', source, kind, cells, buried, pairs: (cells.length + buried) / 2 };
  }

  /**
   * board-link rule 13 (2026-10-30): clears targets {r, c, layer}; layer is 'top' (top tile, the one below turns
   * up), 'under' (only the buried tile), 'stack' (top and buried, cell empties) or 'block' (break the barricade).
   * Refused with {ok:false} and no change when any kind would lose an odd number of tiles (I1).
   */
  function clearCells(targets, source) {
    const plan = {}; // key r,c -> {r, c, top, under, block}
    for (const t of targets) {
      const key = t.r + ',' + t.c;
      const p = plan[key] || (plan[key] = { r: t.r, c: t.c, top: false, under: false, block: false });
      if (t.layer === 'top') p.top = true;
      else if (t.layer === 'under') p.under = true;
      else if (t.layer === 'stack') { p.top = true; p.under = true; }
      else if (t.layer === 'block') p.block = true;
    }
    const counts = {};
    const list = Object.keys(plan).map((k) => plan[k]);
    for (const p of list) {
      const top = at(p.r, p.c);
      if (p.top && top !== null && top !== BLOCK) counts[top] = (counts[top] || 0) + 1;
      const u = under[p.r][p.c];
      if (p.under && u.length) counts[u[u.length - 1]] = (counts[u[u.length - 1]] || 0) + 1;
    }
    for (const k of Object.keys(counts)) {
      if (counts[k] % 2 !== 0) {
        devWarn('clearCells would break I1');
        return { ok: false };
      }
    }
    const cells = [];
    const blocksBroken = [];
    let buried = 0;
    for (const p of list) {
      const top = at(p.r, p.c);
      if (p.block && top === BLOCK) { grid[p.r][p.c] = null; blocksBroken.push({ r: p.r, c: p.c }); continue; }
      if (p.under && under[p.r][p.c].length) { under[p.r][p.c].pop(); buried++; }
      if (p.top && top !== null && top !== BLOCK) {
        cells.push({ r: p.r, c: p.c });
        grid[p.r][p.c] = under[p.r][p.c].length ? under[p.r][p.c].pop() : null;
      }
    }
    if (selection) selection = null;
    changed();
    checkEven();
    return { type: 'clear', source, cells, buried, blocks: blocksBroken, pairs: (cells.length + buried) / 2 };
  }

  /** board-link rule 13: 铁索连环 turns the top tile of each cell into `kind`; refused when I1 would break. */
  function convertBlocks(cells, kind) {
    if (KINDS.indexOf(kind) < 0) return { ok: false };
    const delta = {};
    for (const p of cells) {
      const k = at(p.r, p.c);
      if (k === null || k === BLOCK) return { ok: false };
      if (k === kind) continue;
      delta[k] = (delta[k] || 0) - 1;
      delta[kind] = (delta[kind] || 0) + 1;
    }
    for (const k of Object.keys(delta)) if (delta[k] % 2 !== 0) return { ok: false };
    const out = [];
    for (const p of cells) {
      out.push({ r: p.r, c: p.c, from: grid[p.r][p.c] });
      grid[p.r][p.c] = kind;
    }
    selection = null;
    changed();
    checkEven();
    return { type: 'convert', cells: out, kind };
  }

  /** board-link rule 15: top tiles, buried tiles and barricades of row r. */
  function rowContents(r) {
    const tiles = [];
    const buriedList = [];
    const bars = [];
    for (let c = 1; c <= cols; c++) {
      const k = at(r, c);
      if (k === BLOCK) bars.push({ r, c });
      else if (k !== null) tiles.push({ r, c, kind: k });
      for (const u of inPlay(r, c) ? under[r][c] : []) buriedList.push({ r, c, kind: u });
    }
    return { tiles, buried: buriedList, blocks: bars };
  }

  /** PROTOTYPE addition (not in board-link rule 15, which only names rowContents): the same for column c. */
  function colContents(c) {
    const tiles = [];
    const buriedList = [];
    const bars = [];
    for (let r = 1; r <= rows; r++) {
      const k = at(r, c);
      if (k === BLOCK) bars.push({ r, c });
      else if (k !== null) tiles.push({ r, c, kind: k });
      for (const u of inPlay(r, c) ? under[r][c] : []) buriedList.push({ r, c, kind: u });
    }
    return { tiles, buried: buriedList, blocks: bars };
  }

  /** board-link rule 15: cells whose topmost buried tile is `kind`, row-major. */
  function buriedCells(kind) {
    const out = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const u = under[r][c];
        if (u.length && u[u.length - 1] === kind) out.push({ r, c });
      }
    }
    return out;
  }

  /** Places pairs on free cells using the `add` stream (enemy reinforcements). */
  function addPairs(kinds) {
    const placedCells = [];
    let placed = 0;
    for (const k of kinds) {
      const free = [];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) if (grid[r][c] === null) free.push({ r, c });
      }
      if (free.length < 2) break;
      const p = free.splice(streams.add.int(free.length), 1)[0];
      const q = free[streams.add.int(free.length)];
      grid[p.r][p.c] = k;
      grid[q.r][q.c] = k;
      placedCells.push(p, q);
      placed++;
    }
    if (placed) changed();
    return { type: 'add', cells: placedCells, placed };
  }

  /** Slice v5 画戟横扫: shuffles the tiles of the top two rows that hold tiles. */
  function shuffleTopRows(stream) {
    const occ = occupied();
    const rowsWith = [];
    for (const p of occ) if (rowsWith.indexOf(p.r) < 0) rowsWith.push(p.r);
    rowsWith.sort((x, y) => x - y);
    const pick = rowsWith.slice(0, 2);
    const cells = occ.filter((p) => pick.indexOf(p.r) >= 0);
    const kinds = cells.map((p) => grid[p.r][p.c]);
    stream.shuffle(kinds);
    cells.forEach((p, i) => { grid[p.r][p.c] = kinds[i]; });
    selection = null;
    changed();
    return { type: 'sweep', cells };
  }

  /** Slice v5 赤兔冲阵: places up to n barricades on free cells. */
  function placeBlocks(n, stream) {
    const placed = [];
    for (let i = 0; i < n; i++) {
      const free = [];
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) if (grid[r][c] === null) free.push({ r, c });
      }
      if (free.length === 0) break;
      const p = free[stream.int(free.length)];
      grid[p.r][p.c] = BLOCK;
      placed.push(p);
    }
    if (placed.length) changed();
    return { type: 'blocks', cells: placed };
  }

  /**
   * 压境 rule 9 / 9a: shift every row down one, put `row` (cols entries: kind, null or 'jm') into row 1.
   * Barricades in the bottom row leave the board (their columns are returned in `dropped`). The caller checks
   * bottomOccupied() first: a tile in the bottom row is a loss, not a push.
   * @param {Array<string|null>|null} row the wave, or null for an empty row
   * @returns {{type: string, dropped: number[], empty: boolean}}
   */
  function pushRowFromTop(row) {
    const dropped = [];
    for (let c = 1; c <= cols; c++) {
      devAssert(grid[rows][c] === null || grid[rows][c] === BLOCK, 'push with a tile in the bottom row');
      if (grid[rows][c] === BLOCK) dropped.push(c);
    }
    for (let r = rows; r >= 2; r--) {
      for (let c = 1; c <= cols; c++) { grid[r][c] = grid[r - 1][c]; under[r][c] = under[r - 1][c]; }
    }
    for (let c = 1; c <= cols; c++) {
      const k = row ? row[c - 1] : null;
      grid[1][c] = k === 'jm' ? BLOCK : k;
      under[1][c] = [];
    }
    if (selection) selection = { r: selection.r + 1, c: selection.c };
    changed();
    return { type: 'push', dropped, empty: !row || row.every((k) => k === null || k === 'jm') };
  }

  /** 压境: a tile (not a barricade) in the bottom row. */
  function bottomOccupied() {
    for (let c = 1; c <= cols; c++) if (grid[rows][c] !== null && grid[rows][c] !== BLOCK) return true;
    return false;
  }

  /** Board-link rule 9/10: at a settle point, make sure a playable pair exists. */
  function ensurePlayable() {
    if (occupied().length === 0 || hasPlayablePair()) return null;
    return reshuffle(streams.shuffle);
  }

  return {
    rows,
    cols,
    tap,
    clearKind,
    clearCells,
    convertBlocks,
    rowContents,
    colContents,
    buriedCells,
    addPairs,
    ensurePlayable,
    findPath,
    shuffleTopRows,
    placeBlocks,
    blocks,
    pushRowFromTop,
    bottomOccupied,
    setForceNext(on) { forceNext = !!on; changed(); },
    clearSelection() { if (selection) { selection = null; changed(); } },
    isEmpty() { return occupied().length === 0; },
    pairsLeft() { return (occupied().length + buriedCount()) / 2; },
    /** Tiles of a kind, buried ones included. */
    count(kind) { return slots().filter((s) => slotKind(s) === kind).length; },
    /** Slice v6: how many tiles lie under (r, c). */
    depthAt(r, c) { return inPlay(r, c) ? under[r][c].length : 0; },
    /** Slice v6: a cell whose next buried tile is of this kind, or null. */
    buriedOf(kind) {
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const u = under[r][c];
          if (u.length && u[u.length - 1] === kind) return { r, c, buried: true };
        }
      }
      return null;
    },
    buriedCount,
    cellsOf(kind) { return occupied().filter((p) => grid[p.r][p.c] === kind); },
    kindAt: at,
    occupied,
    selection() { return selection ? { r: selection.r, c: selection.c } : null; },
    forceNext() { return forceNext; },
    hasPlayablePair,
    rng(name) { return streams[name]; },
    version() { return version; },
  };
}
