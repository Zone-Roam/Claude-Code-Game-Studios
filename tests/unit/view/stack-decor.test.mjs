// Buried-card look (user choice "A + C", 2026-10-30): a tile with a card under it
// gets the stack edge class and the 「叠」 seal; a tile with nothing under it gets neither.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stackDecor, stackSealSize } from '../../../src/view/view.mjs';
import { UI_TEXT } from '../../../src/view/strings.mjs';

test('stackDecor: depth 1 has the edge and the 叠 seal', () => {
  assert.deepEqual(stackDecor(1), { stack: true, badge: '叠' });
  assert.equal(UI_TEXT.stackBadge, '叠');
});

test('stackDecor: depth 0 (nothing buried, or the buried card revealed) has neither', () => {
  assert.deepEqual(stackDecor(0), { stack: false, badge: '' });
});

test('stackSealSize: 18 px at the 60 px pitch, 16 px at the smallest 52 px pitch', () => {
  assert.equal(stackSealSize(60), 18);
  assert.equal(stackSealSize(52), 16);
});
