// ADR-0004 section 2: the storage port maps read/write/remove onto the page store
// and lets exceptions through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStoragePort } from '../../../src/platform/storage.mjs';

function fakeWin() {
  const map = new Map();
  return {
    localStorage: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => { map.set(k, String(v)); },
      removeItem: (k) => { map.delete(k); },
    },
  };
}

test('port read/write/remove round-trips through the page store', () => {
  const port = createLocalStoragePort(fakeWin());
  port.write('k', 'v');
  const back = port.read('k');
  port.remove('k');
  assert.deepEqual([back, port.read('k')], ['v', null]);
});

test('port lets a throwing store and a missing store throw', () => {
  const win = { localStorage: { setItem() { throw new Error('QuotaExceededError'); } } };
  assert.throws(() => createLocalStoragePort(win).write('k', 'v'), /QuotaExceededError/);
  assert.throws(() => createLocalStoragePort({}).read('k'));
});
