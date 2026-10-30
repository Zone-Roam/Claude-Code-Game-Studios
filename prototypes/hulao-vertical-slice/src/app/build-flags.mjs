// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// The slice behaves like the MVP test build (ADR-0001): it reads `seed` and `slow`.

/**
 * @param {string} search location.search
 * @returns {{seed: number|null, slow: boolean}}
 */
export function readUrlFlags(search) {
  const flags = { seed: null, slow: false };
  const q = (search || '').replace(/^\?/, '').split('&');
  for (const part of q) {
    const kv = part.split('=');
    if (kv[0] === 'seed' && /^\d+$/.test(kv[1] || '')) flags.seed = Number(kv[1]) >>> 0;
    if (kv[0] === 'slow' && kv[1] === '1') flags.slow = true;
  }
  return flags;
}
