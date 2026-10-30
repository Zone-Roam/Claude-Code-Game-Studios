// Golden values for ADR-0002 section 5, recorded from the first implementation run.
// Changing hash32/createStream changes every stored seed: it needs a new ADR,
// not a quiet edit of these numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash32, createStream } from '../../../src/core/rng.mjs';

const GOLDEN_STREAMS = {
  deal: [2780029183, 2139171414, 2629064309, 591594964],
  shuffle: [1631531047, 895551595, 2601761054, 2948217017],
  wave: [1810175140, 3097584508, 2229914157, 24985579],
  add: [3286975067, 4190273887, 2226819122, 2698818675],
};

test('hash32 fixed inputs produce the pinned golden values', () => {
  assert.equal(hash32('ch01', 0, 12345), 3247825318);
  assert.equal(hash32(''), 2872998923);
  assert.equal(hash32(1, 2, 3), 4197825703);
});

test('hash32 is order-sensitive and part-boundary-sensitive', () => {
  assert.notEqual(hash32('a', 'bc'), hash32('ab', 'c'));
  assert.notEqual(hash32(1, 2), hash32(2, 1));
});

test('four streams from one seed produce the pinned first outputs', () => {
  for (const name of Object.keys(GOLDEN_STREAMS)) {
    const s = createStream(20261030, name);
    assert.deepEqual([s.next(), s.next(), s.next(), s.next()], GOLDEN_STREAMS[name], name);
  }
});

test('stream int stays in range and shuffle is a permutation', () => {
  const s = createStream(7, 'deal');
  for (let i = 0; i < 200; i++) {
    const v = s.int(12);
    assert.ok(v >= 0 && v < 12);
  }
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(s.shuffle(arr).slice().sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('pickWeighted skips zero weights and returns undefined at zero total', () => {
  const s = createStream(7, 'add');
  for (let i = 0; i < 50; i++) assert.equal(s.pickWeighted([['huo', 0], ['ying', 3]]), 'ying');
  assert.equal(s.pickWeighted([['huo', 0]]), undefined);
});
