// ui-interaction rule 5 / fit_scale (D1, 2026-10-30): shrink the pitch to CELL_MIN first, then scale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, cellSize, cellAt, pointCenter } from '../../../src/view/layout.mjs';

test('cell_size examples', () => {
  assert.equal(cellSize(375, 6), 53);
  assert.equal(cellSize(360, 6), 52);
  assert.equal(cellSize(375, 5), 66);
  assert.equal(cellSize(412, 5), 72);
  assert.equal(cellSize(360, 5), 63);
});

test('5x8 press at 375x734: pitch 60, scale 1', () => {
  const L = computeLayout({ width: 375, height: 734, rows: 8, cols: 5 });
  assert.equal(L.cell, 60);
  assert.equal(L.scale, 1);
  assert.equal(L.top, 115);
  assert.equal(L.cards, 80);
});

test('5x8 press at 375x600 (667-tall phone): pitch 52, scale ~0.905', () => {
  const L = computeLayout({ width: 375, height: 600, rows: 8, cols: 5 });
  assert.equal(L.cell, 52);
  assert.ok(Math.abs(L.scale - 600 / 663) < 1e-9);
  assert.equal(L.scaleWarn, false);
});

test('6x8 at H=734 keeps the full top band; H=660 scales to ~0.995', () => {
  const a = computeLayout({ width: 375, height: 734, rows: 8, cols: 6 });
  assert.deepEqual([a.cell, a.scale, a.top, a.cards], [53, 1, 160, 96]);
  const b = computeLayout({ width: 375, height: 660, rows: 8, cols: 6 });
  assert.equal(b.cell, 52);
  assert.ok(Math.abs(b.scale - 660 / 663) < 1e-9);
});

test('5x6 at 360x600: pitch 58, scale 1', () => {
  const L = computeLayout({ width: 360, height: 600, rows: 6, cols: 5 });
  assert.deepEqual([L.cell, L.scale], [58, 1]);
});

test('scale below 0.85 is flagged', () => {
  assert.equal(computeLayout({ width: 375, height: 550, rows: 8, cols: 5 }).scaleWarn, true);
});

test('cellAt inverts pointCenter, lane is the outer ring', () => {
  const L = computeLayout({ width: 375, height: 734, rows: 8, cols: 5 });
  for (const [r, c] of [[1, 1], [8, 5], [0, 0], [9, 6], [4, 3]]) {
    const p = pointCenter(L, r, c);
    assert.deepEqual(cellAt(L, p.x, p.y), { r, c });
  }
});
