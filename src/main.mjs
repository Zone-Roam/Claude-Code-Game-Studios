// Composition root (ADR-0002 assembly order): build flags -> chapters -> progress ->
// screens (round factory: loadout picker, board, pressure, effects, skills) -> view ->
// input -> lifecycle -> main loop. The only module that touches every layer.

import { BUILD } from './app/build-flags.mjs';
import { createMainLoop } from './app/main-loop.mjs';
import { createScreens, resolveSalt } from './app/screens.mjs';
import { createRoundFactory } from './app/round-factory.mjs';
import { CHAPTER_DATA } from './data/chapters.mjs';
import { loadChapters } from './rules/chapter-loader.mjs';
import { createProgress } from './rules/progress-save.mjs';
import { createLocalStoragePort } from './platform/storage.mjs';
import { attachLifecycle } from './platform/lifecycle.mjs';
import { createView } from './view/view.mjs';
import { attachInput } from './view/input.mjs';

function devLog(label, value) {
  if (BUILD.dev && typeof console !== 'undefined') console.warn(label, value);
}

function random32() {
  try {
    const a = new Uint32Array(1);
    window.crypto.getRandomValues(a);
    return a[0];
  } catch (e) {
    return Math.floor(Math.random() * 4294967296);
  }
}

const book = loadChapters(CHAPTER_DATA, { dev: BUILD.dev, slow: /[?&]slow=1(?:&|$)/.test(window.location.search) });
if (book.rejected.length || book.errors.length) devLog('chapter-loader', { rejected: book.rejected, errors: book.errors });
const chapters = book.chapters;

const progress = createProgress({
  storage: createLocalStoragePort(window),
  chapters,
  now: () => Date.now(),
  unlock: 'story',
  warn: devLog,
});
progress.boot();

// One round per attempt (screens calls this on open, 再来一回 and 下一回).
const factory = createRoundFactory({ book, progress, warn: devLog });

const screens = createScreens({ chapters, salt: resolveSalt(window.location.search, BUILD.dev, random32), newRound: factory.newRound, title: true });
const queue = [];
const view = createView(document.getElementById('app'), {
  texts: book.texts,
  enemies: book.enemies,
  chapters,
  screen: () => screens.screen(),
  round: () => screens.round(),
  chapter: () => factory.chapter(),
  picker: () => factory.picker(),
  catalog: () => progress.catalog(),
});

attachInput(view, {
  enqueue: (intent) => queue.push(intent),
  onTitleStart: () => screens.start(),
  onCatalogPick(chapterId) {
    if (screens.screen() !== 'catalog') return;
    const row = progress.catalog().find((r) => r.id === chapterId);
    if (!row || !row.unlocked) return;
    queue.length = 0; // taps made on the catalog are not round intents
    screens.open(chapterId);
  },
});

const life = attachLifecycle({
  getRound: () => (screens.screen() === 'round' ? screens.round() : null),
  onResize: (w, h) => view.applyLayout(w, h),
});
life.checkOrientation();

const loop = createMainLoop({
  screens,
  view,
  inputQueue: { takeAll: () => queue.splice(0, queue.length) },
  logError: (err) => devLog('frame error', err),
});
loop.start();
