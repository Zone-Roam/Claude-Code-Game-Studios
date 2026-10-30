// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Seeds and random streams exactly as ADR-0002 section 5 specifies.

/**
 * FNV-1a over the joined parts, finished with the murmur3 fmix32 avalanche.
 * @param {...(string|number)} parts values joined with U+001F
 * @returns {number} unsigned 32-bit hash
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
 * A mulberry32 stream seeded from hash32(seed, name).
 * @param {number} seed round seed
 * @param {string} name stream name: deal | shuffle | wave | add
 * @returns {{next: function(): number, int: function(number): number, shuffle: function(Array): Array, pickWeighted: function(Array): *}}
 */
export function createStream(seed, name) {
  let state = hash32(seed, name);

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  function int(n) {
    return Math.floor((next() * n) / 4294967296);
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // entries: [[kind, weight], ...] already in kind-table order
  function pickWeighted(entries) {
    let total = 0;
    for (const e of entries) total += e[1];
    let roll = int(total);
    for (const e of entries) {
      if (roll < e[1]) return e[0];
      roll -= e[1];
    }
    return entries[entries.length - 1][0];
  }

  return { next, int, shuffle, pickWeighted };
}
