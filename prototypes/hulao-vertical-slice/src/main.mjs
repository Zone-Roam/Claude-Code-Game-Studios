// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Composition root: flags → chapters → view → screens → lifecycle → loop.

import { readUrlFlags } from './app/build-flags.mjs';
import { startLoop } from './app/main-loop.mjs';
import { createScreens } from './app/screens.mjs';
import { loadChapters } from './rules/chapter-loader.mjs';
import { createProgress } from './rules/progress-save.mjs';
import { CHAPTERS, ENEMIES, TEXTS } from './data/chapter01.mjs';
import { createView } from './view/view.mjs';
import { attachInput } from './view/input.mjs';
import { attachLifecycle } from './platform/lifecycle.mjs';

function makeSalt(flags) {
  if (flags.seed !== null) return flags.seed;
  try {
    const a = new Uint32Array(1);
    window.crypto.getRandomValues(a);
    return a[0];
  } catch (e) {
    return Math.floor(Math.random() * 4294967296);
  }
}

const flags = readUrlFlags(window.location.search);
const loaded = loadChapters({ chapters: CHAPTERS, enemies: ENEMIES }, flags);
const root = document.getElementById('app');
const view = createView(root, { texts: TEXTS });
const queue = [];

if (loaded.chapters.length === 0) {
  view.showError();
} else {
  const screens = createScreens({ chapter: loaded.chapters[0], progress: createProgress(), view, salt: makeSalt(flags) });
  attachInput(view, { enqueue: (it) => queue.push(it), getRound: () => screens.round() });
  const life = attachLifecycle({
    getRound: () => screens.round(),
    onResize: (w, h) => view.applyLayout(w, h),
  });
  screens.startRound();
  life.checkOrientation();
  let manual = false;
  function step(dtReal) {
    const round = screens.round();
    if (!round) return;
    round.frame(dtReal, queue.splice(0, queue.length));
    const events = round.drainEvents();
    view.render(dtReal, events);
    screens.afterFrame(events);
  }
  // Dev diagnostics handle for scripted play-testing (slice only; the release build has no such hook):
  // manual(true) stops the rAF loop from stepping, step(dt) runs one full frame synchronously.
  window.__slice = {
    round: () => screens.round(),
    manual: (on) => { manual = !!on; },
    step: (dt) => { try { step(dt); } catch (err) { screens.fail(err); throw err; } },
  };
  startLoop((dtReal) => { if (!manual) step(dtReal); }, (err) => screens.fail(err));
}
