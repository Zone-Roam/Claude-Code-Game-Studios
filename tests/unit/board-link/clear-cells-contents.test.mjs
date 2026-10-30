// Story board-link/008: clearCells, rowContents, colContents (T1-T4 + edge cases).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS } from '../../../src/core/constants.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

// Row 6: 刀, 鼓 over 书, 拒马, 盾, 盾. Extra-cut cells: 刀 (1,1), 鼓 (1,2),
// 书 buried under 旗 at (2,1). Every kind even.
const ROW6 = [
  'dao  gu     .  .   .',
  'qi/shu qi   .  .   .',
  '.    .      .  .   .',
  '.    .      .  .   .',
  '.    .      .  .   .',
  'dao  gu/shu jm dun dun',
];

// Column 2 top to bottom: 营 (over 旗), 书, 拒马, 刀, 营, 鼓 (GDD huang_cut example).
// Extra-cut cells: 书 (1,1), 刀 (1,3), 鼓 (1,4), 旗 buried under 马 at (1,5).
const COL2 = [
  'shu ying/qi dao gu ma/qi',
  '.   shu     .   .  ma',
  '.   jm      .   .  .',
  '.   dao     .   .  .',
  '.   ying    .   .  .',
  '.   gu      .   .  .',
];

function evenCounts(board) {
  return UNIT_KINDS.every((k) => board.count(k) % 2 === 0);
}

// Guan Yu / Huang Zhong style targets for a line: units 'stack', roadblocks 'block'.
function lineTargets(contents) {
  return contents.units.map((u) => ({ r: u.r, c: u.c, layer: 'stack' }))
    .concat(contents.blocks.map((b) => ({ r: b.r, c: b.c, layer: 'block' })));
}

test('T1 clearCells on row 6 (stack + block + extra cut) empties the row, breaks the roadblock, counts only units', () => {
  const board = boardFromPicture(ROW6);
  const targets = lineTargets(board.rowContents(6)).concat([
    { r: 1, c: 1, layer: 'top' }, { r: 1, c: 2, layer: 'top' }, { r: 2, c: 1, layer: 'under' },
  ]);
  const ev = board.clearCells(targets, 'skill');
  assert.equal(ev.type, 'clear');
  assert.equal(ev.source, 'skill');
  assert.deepEqual(ev.cells, [
    { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 6, c: 5 },
  ]);
  assert.equal(ev.buried, 2);
  assert.deepEqual(ev.blocks, [{ r: 6, c: 3 }]);
  assert.deepEqual(ev.revealed, []);
  assert.equal(ev.pairs, 4, '(6 top + 2 buried) / 2; the roadblock is not counted');
  for (let c = 1; c <= 5; c++) {
    assert.equal(board.get(6, c), null);
    assert.equal(board.depthAt(6, c), 0);
  }
  assert.equal(board.get(2, 1), 'qi', 'an under target leaves the top card');
  assert.equal(board.depthAt(2, 1), 0);
  assert.ok(evenCounts(board), 'I1 holds after the clear');
});

test('T2 clearCells that would leave a kind odd returns {ok:false} and changes nothing', () => {
  const board = boardFromPicture(ROW6);
  board.tap(6, 1);
  const before = board.cells();
  const ev = board.clearCells(lineTargets(board.rowContents(6)), 'skill');
  assert.deepEqual(ev, { ok: false });
  assert.deepEqual(board.cells(), before);
  assert.deepEqual(board.selection(), { r: 6, c: 1 });
});

test('T3 colContents(2) lists 5 top units, 1 buried 旗 and 1 roadblock', () => {
  const board = boardFromPicture(COL2);
  assert.deepEqual(board.colContents(2), {
    units: [
      { r: 1, c: 2, kind: 'ying' }, { r: 2, c: 2, kind: 'shu' }, { r: 4, c: 2, kind: 'dao' },
      { r: 5, c: 2, kind: 'ying' }, { r: 6, c: 2, kind: 'gu' },
    ],
    buried: [{ r: 1, c: 2, kind: 'qi' }],
    blocks: [{ r: 3, c: 2 }],
  });
});

test('T4 clearCells shooting column 2 (stack + block + extra cut) gives pairs = 5', () => {
  const board = boardFromPicture(COL2);
  const targets = lineTargets(board.colContents(2)).concat([
    { r: 1, c: 1, layer: 'top' }, { r: 1, c: 3, layer: 'top' },
    { r: 1, c: 4, layer: 'top' }, { r: 1, c: 5, layer: 'under' },
  ]);
  const ev = board.clearCells(targets, 'skill');
  assert.equal(ev.pairs, 5);
  assert.deepEqual(ev.blocks, [{ r: 3, c: 2 }]);
  for (let r = 1; r <= 6; r++) assert.equal(board.get(r, 2), null);
  assert.equal(board.get(1, 5), 'ma');
  assert.ok(evenCounts(board), 'I1 holds after the clear');
});

test('rowContents has the same shape as colContents', () => {
  const board = boardFromPicture(ROW6);
  assert.deepEqual(board.rowContents(6), {
    units: [
      { r: 6, c: 1, kind: 'dao' }, { r: 6, c: 2, kind: 'gu' },
      { r: 6, c: 4, kind: 'dun' }, { r: 6, c: 5, kind: 'dun' },
    ],
    buried: [{ r: 6, c: 2, kind: 'shu' }],
    blocks: [{ r: 6, c: 3 }],
  });
});

test('clearCells top target flips the buried card up and records it in revealed', () => {
  const board = boardFromPicture(ROW6);
  // 鼓 (6,2) and 鼓 (1,2) leave; 书 under (6,2) flips up.
  const ev = board.clearCells([{ r: 6, c: 2, layer: 'top' }, { r: 1, c: 2, layer: 'top' }], 'skill');
  assert.deepEqual(ev.revealed, [{ r: 6, c: 2, kind: 'shu' }]);
  assert.equal(ev.buried, 0);
  assert.equal(ev.pairs, 1);
  assert.equal(board.get(6, 2), 'shu');
});

test('clearCells: top + under on one cell acts as stack; ignored targets change nothing', () => {
  const board = boardFromPicture(ROW6);
  const ev = board.clearCells([
    { r: 6, c: 2, layer: 'top' }, { r: 6, c: 2, layer: 'under' },
    { r: 1, c: 2, layer: 'top' }, { r: 2, c: 1, layer: 'under' },
    { r: 3, c: 3, layer: 'stack' }, { r: 2, c: 2, layer: 'under' }, { r: 1, c: 1, layer: 'block' },
  ], 'skill');
  assert.equal(ev.pairs, 2);
  assert.deepEqual(ev.revealed, []);
  assert.deepEqual(ev.blocks, []);
  assert.equal(board.get(6, 2), null);
  assert.equal(board.get(1, 1), 'dao', 'block on a unit is ignored');
  assert.equal(board.get(2, 2), 'qi', 'under with nothing buried is ignored');
});

test('clearCells, rowContents and colContents throw RangeError off the playable area', () => {
  const board = boardFromPicture(ROW6);
  assert.throws(() => board.clearCells([{ r: 0, c: 1, layer: 'top' }], 'skill'), RangeError);
  assert.throws(() => board.clearCells([{ r: 1, c: 1, layer: 'all' }], 'skill'), RangeError);
  assert.throws(() => board.rowContents(7), RangeError);
  assert.throws(() => board.colContents(0), RangeError);
});
