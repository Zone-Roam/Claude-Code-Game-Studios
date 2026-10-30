// Buried-card look (2026-10-30 user feedback: the 「叠」 seal was too big): a tile with k cards
// under it gets one card edge per buried card (max 3) and a small "+k" badge; k = 0 gets neither.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stackDecor, stackBadgeSize, STACK_EDGES_MAX } from '../../../src/view/view.mjs';

test('stackDecor: depth 0 (nothing buried, or the last buried card revealed) has no edge and no badge', () => {
  assert.deepEqual(stackDecor(0), { stack: false, edges: 0, badge: '' });
});

test('stackDecor: depth 1 draws one edge and says +1', () => {
  assert.deepEqual(stackDecor(1), { stack: true, edges: 1, badge: '+1' });
});

test('stackDecor: depth 2 draws two edges and says +2', () => {
  assert.deepEqual(stackDecor(2), { stack: true, edges: 2, badge: '+2' });
});

test('stackDecor: depth 3 draws three edges and says +3', () => {
  assert.deepEqual(stackDecor(3), { stack: true, edges: 3, badge: '+3' });
});

test('stackDecor: deeper than the edge cap keeps 3 edges but the badge still counts', () => {
  assert.equal(STACK_EDGES_MAX, 3);
  assert.deepEqual(stackDecor(5), { stack: true, edges: 3, badge: '+5' });
});

test('stackDecor: a revealed card lowers the count (3 -> 2 -> 1 -> 0)', () => {
  assert.deepEqual([3, 2, 1, 0].map((d) => stackDecor(d).badge), ['+3', '+2', '+1', '']);
});

test('stackBadgeSize: 14 x 12 px at the 60 px pitch, 12 x 11 px at the smallest 52 px pitch', () => {
  assert.deepEqual(stackBadgeSize(60), { w: 14, h: 12 });
  assert.deepEqual(stackBadgeSize(52), { w: 12, h: 11 });
});
