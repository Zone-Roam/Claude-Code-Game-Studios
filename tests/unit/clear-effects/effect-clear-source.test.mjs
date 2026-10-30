// Story clear-effects/003: an effect clear is a non-player clear. This module
// only hands back a `clear` with source 'effect' and the right pairs; damage,
// food, charge and steps by source belong to battle-pressure / general-skills
// (hp 12 -> 8 and food 8 -> 7 are checked in their integration tests later).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeEffects, tapPair } from '../../helpers/effects-fakes.mjs';

const FIRE = [{ r: 5, c: 1 }, { r: 5, c: 2 }];

// 4 top + 2 buried 营; a roadblock at (6,5) next to the 营 at (6,6).
const YING_4_2 = [
  'ying/dao qi qi       qi qi qi',
  'qi       qi ying/dun qi qi qi',
  '.        .  ying/ying . . .',
  '.     gu/ying .      .  .  .',
  'huo      huo .       .  .  .',
  'dao      dun gu      .  jm ying',
];

const SIX_YING = [
  'ying ying ying . . .',
  'ying ying ying . . .',
  '.    .    .    . . .',
  '.    .    .    . . .',
  'huo  huo  .    . . .',
  '.    .    .    . . .',
];

function runEffect(picture) {
  const board = boardFromPicture(picture);
  const f = fakeEffects(board);
  const token = f.effects.onMatch(tapPair(board, FIRE[0], FIRE[1]));
  token.onEnd(token);
  const dispatched = f.calls.filter((c) => c[0] === 'dispatch').map((c) => c[1]);
  return { board, f, dispatched };
}

test('AC1 boss mode: 4 top + 2 buried 营 hand back one clear, source effect, pairs 3', () => {
  const { dispatched } = runEffect(YING_4_2);
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].source, 'effect');
  assert.equal(dispatched[0].pairs, 3);
});

test('AC2 food mode: six 营 burned give a source-effect clear; this module never calls pressure', () => {
  const { f, dispatched } = runEffect(SIX_YING);
  assert.equal(dispatched[0].source, 'effect');
  assert.equal(dispatched[0].pairs, 3);
  assert.deepEqual(f.pressureCalls, [], 'no onClear / comboReward from effects; the round routes the clear');
});

test('AC3 three pairs of 营: no pressure call, clear not emitted here, no roadblock broken, no other hook', () => {
  const { board, f } = runEffect(YING_4_2);
  assert.deepEqual(f.pressureCalls, []);
  assert.ok(f.calls.every((c) => c[0] !== 'emit'), 'round-flow emits after pressure.onClear');
  assert.deepEqual(board.blocks(), [{ r: 6, c: 5 }]);
  assert.deepEqual(Object.keys(f.effects), ['onMatch', 'onMiss', 'combo', 'maxCombo'],
    'no clear, charge or step hook exists');
  assert.equal(f.effects.combo(), 1, 'only the 火 pair counted; the effect clear did not');
});
