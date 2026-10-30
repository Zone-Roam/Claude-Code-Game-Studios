// Round factory (ADR-0002 assembly step "screens -> round"): one place that builds a
// round exactly as the page does, so src/main.mjs and the playthrough test share it.
// Per round: general-loadout picker -> createRound with the real board, pressure,
// effects and skills factories. Touches no page globals.

import { createLoadout, unlockedGenerals } from '../rules/general-loadout.mjs';
import { createRound } from '../rules/round-flow.mjs';
import { createBoard } from '../rules/board-link.mjs';
import { createEffects } from '../rules/clear-effects.mjs';
import { createPressure } from '../rules/battle-pressure.mjs';
import { createSkills } from '../rules/general-skills.mjs';

/**
 * Creates the round factory screens.mjs calls on open, 再来一回 and 下一回.
 * The `slow=1` multipliers are applied once, by chapter-loader (loadChapters
 * flags); pressure therefore gets `slow: false` so they are not applied twice.
 * @param {{book: {chapters: Array<Object>, enemies: Object, generals: Object, starters: Array<string>},
 *   progress: {record: function(string): (Object|null), settle: function(Object): Object},
 *   warn?: function(string, *): void, constants?: Object}} deps `book` is loadChapters' result
 * @returns {{newRound: function(Object): Object, chapter: function(): (Object|null),
 *   picker: function(): (Object|null)}} `chapter` / `picker` are the latest round's
 * @example const factory = createRoundFactory({ book, progress }); createScreens({ chapters, salt, newRound: factory.newRound });
 */
export function createRoundFactory(deps) {
  const book = deps.book;
  const progress = deps.progress;
  const warn = typeof deps.warn === 'function' ? deps.warn : function () {};
  const chapters = book.chapters;

  // general-loadout reads `{charge}`; chapter-loader's table carries `{kind, need}`.
  const loadoutGenerals = {};
  for (const id of Object.keys(book.generals)) loadoutGenerals[id] = { charge: book.generals[id].kind };

  function winsOf(chapterId) {
    const rec = progress.record(chapterId);
    return rec ? rec.wins : 0;
  }

  let currentChapter = null;
  let currentPicker = null;

  const systems = {
    createBoard(ch, options) {
      const board = createBoard({ seed: options.seed, streams: options.streams, rows: ch.rows, cols: ch.cols });
      board.deal({ deck: ch.deck, mode: ch.mode, startRows: ch.press ? ch.press.startRows : undefined, stackDepth: ch.stackDepth });
      return board;
    },
    createPressure(ctx) {
      return createPressure(Object.assign({}, ctx, { enemies: book.enemies, slow: false }));
    },
    createEffects,
    // general-skills binds pressure.bindGenerals itself (roar target).
    createSkills,
  };

  /**
   * @param {{chapter: Object, seed: number, attempt: number, hasNext: boolean,
   *   slots: (Array<(string|null)>|null)}} spec from screens.mjs
   * @returns {Object} the round
   */
  function newRound(spec) {
    const chapter = spec.chapter;
    const rec = progress.record(chapter.id);
    const picker = createLoadout({
      chapter,
      generals: loadoutGenerals,
      unlocked: unlockedGenerals({ starters: book.starters, chapters, winsOf }),
      saved: rec && rec.loadout ? rec.loadout : undefined,
      retrySlots: spec.slots || undefined,
    });
    currentChapter = chapter;
    currentPicker = picker;
    return createRound({
      chapter,
      seed: spec.seed,
      attempt: spec.attempt,
      hasNext: spec.hasNext,
      constants: deps.constants,
      picker,
      progress,
      systems,
      warn,
    });
  }

  return {
    newRound,
    /** @returns {(Object|null)} the chapter of the latest round */
    chapter: () => currentChapter,
    /** @returns {(Object|null)} the latest round's slot picker */
    picker: () => currentPicker,
  };
}
