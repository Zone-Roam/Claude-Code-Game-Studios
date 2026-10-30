// The page's only frame loop (ADR-0002 section 1). Thin shell: measures dtReal,
// hands it and the input queue to the round, drains events to the view.
// Story round-flow/003.

/**
 * Creates the main loop.
 * @param {{screens: Object, inputQueue: {takeAll: function(): Array<Object>},
 *   view: {render: function(number, Array<Object>): void},
 *   raf?: function(function(number): void): void,
 *   logError?: function(*): void}} options `raf` defaults to the page's
 *   requestAnimationFrame; `logError` is the dev build's error log
 * @returns {{start: function(): void, onFrame: function(number): void}}
 * @example createMainLoop({ screens, inputQueue, view }).start();
 */
export function createMainLoop(options) {
  const schedule = options.raf || function (cb) { requestAnimationFrame(cb); };
  const screens = options.screens;
  let last = null;

  function onFrame(now) {
    schedule(onFrame); // schedule first: an error in this frame cannot stop the page
    const dtReal = last === null ? 0 : now - last;
    last = now;
    try {
      const round = screens.screen() === 'round' ? screens.round() : null;
      if (round) round.frame(dtReal, options.inputQueue.takeAll());
      const events = round ? round.drainEvents() : [];
      options.view.render(dtReal, events);
      screens.onEvents(events);
    } catch (err) {
      if (options.logError) options.logError(err);
      screens.fail(err);
    }
  }

  return {
    /** Schedules the first frame. */
    start() {
      schedule(onFrame);
    },
    /** One frame; exposed so tests can drive it with fake timestamps. */
    onFrame,
  };
}
