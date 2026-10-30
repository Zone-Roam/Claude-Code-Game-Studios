// In-memory storage port for progress-save tests (ADR-0004 section 2).
// Dev-only test helper; never shipped.

/** Three loadable chapters, one per mode, in story order (MVP shape). */
export const TEST_CHAPTERS = [
  { id: 'ch01', mode: 'boss' },
  { id: 'ch02', mode: 'press' },
  { id: 'ch03', mode: 'food' },
];

/**
 * A fake storage port over a plain map. `fail` switches make calls throw.
 * @param {Object<string, string>} [initial] preset keys
 * @returns {{port: Object, data: Object, calls: {read: number, write: number, remove: number},
 *   fail: {read: boolean, write: boolean, remove: boolean, writeKeys: (string[]|null)}}}
 *   `fail.writeKeys` limits write failures to those keys
 */
export function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  const calls = { read: 0, write: 0, remove: 0 };
  const fail = { read: false, write: false, remove: false, writeKeys: null };
  const port = {
    read(key) {
      calls.read += 1;
      if (fail.read) throw new Error('read failed');
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    write(key, value) {
      calls.write += 1;
      if (fail.write && (!fail.writeKeys || fail.writeKeys.indexOf(key) !== -1)) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      data[key] = String(value);
    },
    remove(key) {
      calls.remove += 1;
      if (fail.remove) throw new Error('remove failed');
      delete data[key];
    },
  };
  return { port, data, calls, fail };
}

/**
 * A RoundResult (round-flow rule 8) with the fields progress-save reads.
 * @param {Object} over fields to set (chapterId, mode, win, attempt, loadout, metrics)
 * @returns {Object}
 */
export function roundResult(over) {
  return Object.assign({ chapterId: 'ch01', mode: 'boss', win: true, attempt: 1, loadout: ['guan_yu'], metrics: {} }, over);
}

/**
 * A save string in the v1 shape.
 * @param {Object} chapters
 * @param {Object} [extra] top-level fields (v overrides)
 * @returns {string}
 */
export function saveText(chapters, extra) {
  return JSON.stringify(Object.assign({ v: 1, chapters, updatedAt: 1 }, extra));
}
