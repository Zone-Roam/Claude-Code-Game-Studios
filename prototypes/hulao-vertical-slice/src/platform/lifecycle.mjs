// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Page lifecycle → direct round calls (ADR-0002 §4). Never queued: rAF stops in the background.

/**
 * @param {{getRound: function(): object, onResize: function(number, number): void}} deps
 */
export function attachLifecycle(deps) {
  const { getRound, onResize } = deps;
  const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

  document.addEventListener('visibilitychange', () => {
    const r = getRound();
    if (!r) return;
    if (document.visibilityState === 'hidden') r.onHidden();
    else r.onVisible();
  });
  window.addEventListener('pagehide', () => { const r = getRound(); if (r) r.onHidden(); });
  window.addEventListener('pageshow', () => { const r = getRound(); if (r) r.onVisible(); });

  function checkOrientation() {
    const r = getRound();
    const landscape = !!(coarse && coarse.matches) && window.innerWidth > window.innerHeight;
    if (r) r.setLandscape(landscape);
  }

  let pending = false;
  window.addEventListener('resize', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      onResize(window.innerWidth, window.innerHeight);
      checkOrientation();
    });
  });

  // Android back key, when the host turns it into popstate (ui-interaction rule 24).
  try { history.pushState({ slice: 1 }, ''); } catch (e) { /* history may be unavailable in some hosts */ }
  window.addEventListener('popstate', () => {
    const r = getRound();
    if (r) r.onBack();
    try { history.pushState({ slice: 1 }, ''); } catch (e) { /* ignore */ }
  });

  return { checkOrientation };
}
