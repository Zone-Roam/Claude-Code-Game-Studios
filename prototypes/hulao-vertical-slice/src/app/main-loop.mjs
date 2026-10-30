// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// The only requestAnimationFrame loop (ADR-0002 §1).

/**
 * @param {function(number): void} onFrame called with dtReal; exceptions go to onError
 * @param {function(Error): void} onError called once per failing frame
 */
export function startLoop(onFrame, onError) {
  let last = null;
  function tick(now) {
    requestAnimationFrame(tick);
    const dtReal = last === null ? 0 : now - last;
    last = now;
    try {
      onFrame(dtReal);
    } catch (err) {
      onError(err);
    }
  }
  requestAnimationFrame(tick);
}
