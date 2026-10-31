// Page lifecycle -> round-flow entry points (ADR-0002 section 4; round-flow rules 10, 11;
// ui-interaction rule 24). Direct calls, never queued: rAF stops in the background.
// Vibration and sound live in platform/feedback.mjs (ui-interaction rules 21d, 21e).

/**
 * Wires visibility, pagehide/pageshow, resize/orientation and the back key.
 * @param {{getRound: function(): (Object|null), onResize: function(number, number): void}} deps
 * @returns {{checkOrientation: function(): void}}
 */
export function attachLifecycle(deps) {
  const getRound = deps.getRound;
  const onResize = deps.onResize;
  const coarse = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;

  document.addEventListener('visibilitychange', function () {
    const r = getRound();
    if (!r) return;
    if (document.visibilityState === 'hidden') r.onHidden();
    else r.onVisible();
  });
  window.addEventListener('pagehide', function () { const r = getRound(); if (r) r.onHidden(); });
  window.addEventListener('pageshow', function () { const r = getRound(); if (r) r.onVisible(); });

  function checkOrientation() {
    const r = getRound();
    const landscape = !!(coarse && coarse.matches) && window.innerWidth > window.innerHeight;
    if (r) r.setLandscape(landscape);
  }

  let pending = false;
  function onGeometry() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      onResize(window.innerWidth, window.innerHeight);
      checkOrientation();
    });
  }
  window.addEventListener('resize', onGeometry);
  window.addEventListener('orientationchange', onGeometry);

  // Android back key, when the host turns it into popstate.
  try { history.pushState({ game: 1 }, ''); } catch (e) { /* history may be unavailable in the host */ }
  window.addEventListener('popstate', function () {
    const r = getRound();
    if (r) r.onBack();
    try { history.pushState({ game: 1 }, ''); } catch (e) { /* ignore */ }
  });

  return { checkOrientation };
}

/**
 * Whether the player asked for reduced motion; false when the query cannot be read (ui-interaction rule 29).
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}
