// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash32, createStream } from '../src/core/rng.mjs';
import { createBoard } from '../src/rules/board-link.mjs';
import { guanCells, zhugeKind } from '../src/rules/general-skills.mjs';
import { loadChapters } from '../src/rules/chapter-loader.mjs';
import { CHAPTERS, ENEMIES } from '../src/data/chapter01.mjs';

// Slice v6 moved chapter 1 to 5 columns with stacking. The tests written for the 6×6 board keep that board
// (the v5 deck, no buried tiles); CH5 is the real chapter 1.
const CH5 = loadChapters({ chapters: CHAPTERS, enemies: ENEMIES }, { slow: false }).chapters[0];
const CH = Object.assign({}, CH5, { cols: 6, deck: { huo: 2, ying: 6, dao: 4, gu: 6, dun: 6, shu: 8, qi: 2, jiu: 2 } });
const KEEP_ORDER = { shuffle: (a) => a, int: () => 0, next: () => 0, pickWeighted: (e) => e[0][0] };
const EMPTY_ROW = [null, null, null, null, null, null];

function boardWith(layout, extra) {
  return createBoard(CH, Object.assign({ seed: 1, layout }, extra || {}));
}

function rowsOf(...lines) {
  const out = lines.slice();
  while (out.length < 6) out.push(EMPTY_ROW.slice());
  return out;
}

// Golden values: changing the algorithm changes every stored seed (ADR-0002).
test('hash32 and the four streams → pinned golden values', () => {
  // Arrange / Act / Assert
  assert.equal(hash32('ch01', 1, 42), 2541561753);
  assert.equal(hash32(''), 2872998923);
  const expected = {
    deal: [937995563, 3270896012, 1885364731],
    shuffle: [1470890762, 1826392633, 2598751435],
    wave: [1119651559, 100479798, 903857728],
    add: [220915213, 148408412, 812590820],
  };
  for (const name of Object.keys(expected)) {
    const s = createStream(12345, name);
    assert.deepEqual([s.next(), s.next(), s.next()], expected[name], name);
  }
});

test('chapter 1 deal → full 6×6 board, every kind even, a playable pair exists', () => {
  // Arrange
  for (let seed = 1; seed <= 50; seed++) {
    // Act
    const b = createBoard(CH, { seed });
    // Assert
    assert.equal(b.occupied().length, 36);
    for (const k of Object.keys(CH.deck)) assert.equal(b.count(k), CH.deck[k], 'seed ' + seed + ' kind ' + k);
    assert.ok(b.hasPlayablePair());
  }
});

test('same seed → same deal; different seed → different deal', () => {
  // Arrange
  const snap = (b) => b.occupied().map((p) => b.kindAt(p.r, p.c)).join(',');
  // Act / Assert
  assert.equal(snap(createBoard(CH, { seed: 7 })), snap(createBoard(CH, { seed: 7 })));
  assert.notEqual(snap(createBoard(CH, { seed: 7 })), snap(createBoard(CH, { seed: 8 })));
});

test('(2,1)-(2,4) with the middle blocked → two-turn path through row 1 (length 5 beats row 3 on corner order)', () => {
  // Arrange
  const b = boardWith(rowsOf(
    [null, null, null, null, 'qi', 'qi'],
    ['dao', 'gu', 'gu', 'dao', 'jiu', 'jiu'],
  ));
  // Act
  const path = b.findPath({ r: 2, c: 1 }, { r: 2, c: 4 });
  // Assert
  assert.deepEqual(path, [{ r: 2, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 4 }, { r: 2, c: 4 }]);
});

test('(2,1)-(4,3) with both corners free → one-turn path through the row-smaller corner (2,3)', () => {
  // Arrange
  const b = boardWith(rowsOf(
    EMPTY_ROW.slice(),
    ['dao', null, null, null, null, null],
    EMPTY_ROW.slice(),
    [null, null, 'dao', null, null, null],
  ));
  // Act
  const path = b.findPath({ r: 2, c: 1 }, { r: 4, c: 3 });
  // Assert
  assert.deepEqual(path, [{ r: 2, c: 1 }, { r: 2, c: 3 }, { r: 4, c: 3 }]);
});

// Four tiles in a 2×2 checker: no same-kind pair connects within two turns.
function deadLayout() {
  return rowsOf(
    EMPTY_ROW.slice(),
    EMPTY_ROW.slice(),
    [null, null, 'dao', 'gu', null, null],
    [null, null, 'gu', 'dao', null, null],
  );
}

test('same kind, not connectable → miss, and the selection moves to the second tile', () => {
  // Arrange
  const b = boardWith(deadLayout());
  // Act
  b.tap(3, 3);
  const res = b.tap(4, 4);
  // Assert
  assert.equal(res.type, 'miss');
  assert.deepEqual(b.selection(), { r: 4, c: 4 });
  assert.equal(b.count('dao'), 2);
});

test('Zhao Yun armed, same kind not connectable → forced match with a straight path, then disarmed', () => {
  // Arrange
  const b = boardWith(deadLayout());
  b.setForceNext(true);
  // Act
  b.tap(3, 3);
  const res = b.tap(4, 4);
  // Assert
  assert.equal(res.type, 'match');
  assert.equal(res.forced, true);
  assert.deepEqual(res.path, [{ r: 3, c: 3 }, { r: 4, c: 4 }]);
  assert.equal(b.forceNext(), false);
});

test('Zhao Yun armed, two different kinds → selection changes, still armed', () => {
  // Arrange
  const b = boardWith(deadLayout());
  b.setForceNext(true);
  // Act
  b.tap(3, 3);
  const res = b.tap(3, 4);
  // Assert
  assert.equal(res, null);
  assert.equal(b.forceNext(), true);
});

test('dead board and a shuffle stream that never helps → deterministic fallback swap, same occupied cells', () => {
  // Arrange
  const b = boardWith(deadLayout(), { streams: { shuffle: KEEP_ORDER } });
  const before = b.occupied();
  // Act
  const res = b.ensurePlayable();
  // Assert
  assert.deepEqual(res, { type: 'reshuffle', fallback: true });
  assert.deepEqual(b.occupied(), before);
  assert.ok(b.hasPlayablePair());
  assert.equal(b.count('dao'), 2);
  assert.equal(b.count('gu'), 2);
});

test('Guan Yu, bottom row 营 营 刀 鼓 盾 盾 → cuts 8 tiles (the row plus one 刀 and one 鼓)', () => {
  // Arrange
  const b = boardWith(rowsOf(
    EMPTY_ROW.slice(), EMPTY_ROW.slice(), EMPTY_ROW.slice(), EMPTY_ROW.slice(),
    ['dao', 'gu', 'qi', 'qi', null, null],
    ['ying', 'ying', 'dao', 'gu', 'dun', 'dun'],
  ));
  // Act
  const cells = guanCells(b);
  const res = b.clearCells(cells, 'skill');
  // Assert
  assert.equal(cells.length, 8);
  assert.deepEqual(cells.slice(6), [{ r: 5, c: 1 }, { r: 5, c: 2 }]);
  assert.equal(res.pairs, 4);
  assert.equal(b.count('qi'), 2);
});

test('Zhuge Liang, 营 and 酒 tied at 4 → picks 营 (earlier in the kind table)', () => {
  // Arrange
  const b = boardWith(rowsOf(
    ['jiu', 'jiu', 'jiu', 'jiu', 'dao', 'dao'],
    ['ying', 'ying', 'ying', 'ying', null, null],
  ));
  // Act / Assert
  assert.equal(zhugeKind(b), 'ying');
});

test('clearCells that would leave a kind odd → {ok:false}, board unchanged', () => {
  // Arrange
  const b = boardWith(deadLayout());
  // Act
  const res = b.clearCells([{ r: 3, c: 3 }], 'skill');
  // Assert
  assert.deepEqual(res, { ok: false });
  assert.equal(b.count('dao'), 2);
});

// Slice v5 (DESIGN-v5.md): 拒马 barricades and 画戟横扫.
test('a barricade between two 刀 → no link; it cannot be tapped; clearing the 盾 pair next to it breaks it', () => {
  // Arrange
  const layout = [
    ['dao', null, 'dao', null, null, null],
    ['dun', 'dun', null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
  ];
  const board = createBoard(CH, { seed: 1, layout });
  board.placeBlocks(1, { int: () => 0 }); // first free cell is (1,2)
  // Act
  const blockedPath = board.findPath({ r: 1, c: 1 }, { r: 1, c: 3 });
  const tapBlock = board.tap(1, 2);
  board.tap(2, 1);
  const m = board.tap(2, 2);
  // Assert
  assert.equal(board.kindAt(1, 2), null);
  assert.equal(tapBlock, null);
  assert.equal(m.type, 'match');
  assert.deepEqual(m.broken, [{ r: 1, c: 2 }]);
  assert.equal(board.blocks().length, 0);
  assert.notEqual(blockedPath && blockedPath.length, 2);
  assert.equal(board.pairsLeft(), 1);
});

test('画戟横扫 → only the top two rows with tiles change, the kinds there stay the same multiset', () => {
  // Arrange
  const board = createBoard(CH, { seed: 5 });
  const snap = () => board.occupied().map((q) => board.kindAt(q.r, q.c));
  const before = snap();
  // Act
  const res = board.shuffleTopRows(createStream(9, 'wave'));
  const after = snap();
  // Assert
  assert.ok(res.cells.every((q) => q.r <= 2));
  assert.equal(res.cells.length, 12);
  assert.deepEqual(after.slice(12), before.slice(12));
  assert.deepEqual(after.slice(0, 12).sort(), before.slice(0, 12).sort());
});

// ── slice v6: 5 columns and stacking ──

test('chapter 1 deal (v6) → 5×6 top layer, 14 buried tiles, every kind even, a playable pair exists', () => {
  for (let seed = 1; seed <= 50; seed++) {
    // Act
    const b = createBoard(CH5, { seed });
    // Assert
    assert.equal(b.cols, 5);
    assert.equal(b.occupied().length, 30);
    assert.equal(b.buriedCount(), 14);
    assert.equal(b.pairsLeft(), 22);
    for (const k of Object.keys(CH5.deck)) assert.equal(b.count(k), CH5.deck[k], 'seed ' + seed + ' kind ' + k);
    assert.ok(b.hasPlayablePair());
  }
});

test('stacked cell → only the top links; clearing it turns the buried tile face up', () => {
  // Arrange: 刀 刀 side by side, a 鼓 buried under the left one, its partner face up
  const layout = [['dao', 'dao', 'gu', null, null]];
  const b = createBoard(CH5, { seed: 1, layout, under: [{ r: 1, c: 1, kind: 'gu' }] });
  assert.equal(b.depthAt(1, 1), 1);
  // Act
  b.tap(1, 1);
  const res = b.tap(1, 2);
  // Assert
  assert.equal(res.type, 'match');
  assert.equal(b.kindAt(1, 1), 'gu');
  assert.equal(b.depthAt(1, 1), 0);
  assert.equal(b.pairsLeft(), 1);
});

test('Zhuge Liang / 火烧 clearKind → buried tiles of that kind go too, and count as pairs', () => {
  // Arrange
  const layout = [['shu', 'dao', 'dao', 'gu', 'gu']];
  const b = createBoard(CH5, { seed: 1, layout, under: [{ r: 1, c: 4, kind: 'shu' }] });
  // Act
  const res = b.clearKind('shu', 'skill');
  // Assert
  assert.equal(res.pairs, 1);
  assert.equal(b.count('shu'), 0);
  assert.equal(b.kindAt(1, 4), 'gu');
  assert.equal(b.depthAt(1, 4), 0);
});

test('Guan Yu with the odd partner buried → cuts the buried one, kinds stay even', () => {
  // Arrange: bottom row 刀 盾 盾; the other 刀 is buried under the 鼓 on row 1
  const layout = [['gu', 'gu', null, null, null], [null, null, null, null, null], ['dao', 'dun', 'dun', null, null]];
  const b = createBoard(CH5, { seed: 1, layout, under: [{ r: 1, c: 1, kind: 'dao' }] });
  // Act
  const cells = guanCells(b);
  const res = b.clearCells(cells, 'skill');
  // Assert
  assert.equal(res.pairs, 2);
  assert.equal(b.count('dao'), 0);
  assert.equal(b.kindAt(1, 1), 'gu');
  assert.equal(b.pairsLeft(), 1);
});

test('dead top layer → reshuffle mixes buried tiles in and finds a pair', () => {
  // Arrange: 刀 鼓 on top with their partners buried; no face-up pair
  const layout = [['dao', 'gu', null, null, null]];
  const b = createBoard(CH5, { seed: 1, layout, under: [{ r: 1, c: 1, kind: 'gu' }, { r: 1, c: 2, kind: 'dao' }] });
  assert.equal(b.hasPlayablePair(), false);
  // Act
  const res = b.ensurePlayable();
  // Assert
  assert.equal(res.type, 'reshuffle');
  assert.ok(b.hasPlayablePair());
  assert.equal(b.count('dao'), 2);
  assert.equal(b.count('gu'), 2);
});
