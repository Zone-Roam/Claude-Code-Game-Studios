// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Screen state and composition root for rounds (ADR-0002 §2). The slice has no catalog:
// the round's 开讲 card is the first screen, and 再来一回 / 从头讲 start a new attempt.

import { hash32 } from '../core/rng.mjs';
import { createRound } from '../rules/round-flow.mjs';
import { createBoard } from '../rules/board-link.mjs';
import { createPressure } from '../rules/battle-pressure.mjs';
import { createEffects } from '../rules/clear-effects.mjs';
import { createSkills } from '../rules/general-skills.mjs';

const SYSTEMS = { createBoard, createPressure, createEffects, createSkills };

/**
 * @param {{chapter: object, progress: object, view: object, salt: number}} deps
 * @returns {object} screens API
 */
export function createScreens({ chapter, progress, view, salt }) {
  let screen = 'round';
  let round = null;
  let attempt = 0;

  function startRound() {
    attempt += 1;
    const seed = hash32(chapter.id, attempt, salt);
    round = createRound({ chapter, seed, progress, systems: SYSTEMS });
    view.bindRound(round, chapter);
    screen = 'round';
  }

  return {
    startRound,
    round() { return screen === 'round' ? round : null; },
    screen() { return screen; },
    /** Handles exit events after the view has played the frame. */
    afterFrame(events) {
      for (const e of events) if (e.type === 'exit') { startRound(); return; }
    },
    fail(err) {
      if (screen === 'error') return;
      screen = 'error';
      round = null;
      view.showError();
      if (typeof console !== 'undefined') console.error(err);
    },
  };
}
