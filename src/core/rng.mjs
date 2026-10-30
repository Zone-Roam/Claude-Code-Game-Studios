// Seed hashing and seeded random streams (ADR-0002 section 5).
// Changing any algorithm here changes every stored seed: it needs a new ADR,
// and tests/unit/core/rng.test.mjs pins the golden values.

/**
 * Hashes any parts into an unsigned 32-bit integer (FNV-1a followed by fmix32).
 * @param {...*} parts values, each converted with String()
 * @returns {number} uint32
 * @example hash32('ch05', 2, 12345) // same inputs always give the same uint32
 */
export function hash32(...parts) {
  const s = parts.map(String).join('\u001f');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Creates one mulberry32 random stream. Streams with different names share no state.
 * Not thread-safe (single-threaded page code); each stream is mutated by its calls.
 * @param {number|string} seed round seed
 * @param {string} name stream name, e.g. 'wave'
 * @returns {{next: function(): number, int: function(number): number,
 *   shuffle: function(Array): Array, pickWeighted: function(Array): *}}
 * @example
 * const s = createStream(42, 'wave');
 * s.int(6);              // 0..5
 * s.shuffle([1, 2, 3]);  // in place, returns the same array
 */
export function createStream(seed, name) {
  let state = hash32(seed, name);

  /** @returns {number} next uint32 */
  function next() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** @param {number} n upper bound, 0 < n <= 2^20 @returns {number} integer in [0, n) */
  function int(n) {
    return Math.floor(next() * n / 4294967296);
  }

  /** Fisher-Yates from the last index down; shuffles in place and returns the array. */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /**
   * Picks a kind by weight. Entries are [kind, weight] pairs in the fixed kind
   * order (callers must not build them from object key order).
   * @returns {*} the chosen kind, or undefined when total weight is 0
   */
  function pickWeighted(entries) {
    let total = 0;
    for (const entry of entries) total += entry[1];
    if (total <= 0) return undefined;
    let roll = int(total);
    for (const entry of entries) {
      if (roll < entry[1]) return entry[0];
      roll -= entry[1];
    }
    return undefined;
  }

  return { next, int, shuffle, pickWeighted };
}
