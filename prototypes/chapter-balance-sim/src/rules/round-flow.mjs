// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// 对局流程与时钟 (design/gdd/round-flow.md) as ADR-0002 implements it: one game clock,
// tokens, the five-step frame, settle points, overlay timers. Pure.

import {
  MAX_STEP_MS, BG_GAP_MS, TOKEN_MAX_MS, RESHUFFLE_SHOW_MS, CARD_GUARD_MS, OPEN_FADE_MS,
} from '../core/constants.mjs';
import { devAssert, devWarn } from '../core/assert.mjs';

const TIMELESS = { background: true, pause: true, tutorial: true };

/**
 * Creates one round. `systems` is passed in by the composition root (ADR-0002).
 * @param {{chapter: object, seed: number, progress: object, systems: object}} args
 * @returns {object} round API
 */
export function createRound({ chapter, seed, progress, systems }) {
  let state = 'open';
  let starting = false;
  let startElapsed = 0;
  let gameTime = 0;
  let frameNo = 0;
  let nextTokenId = 1;
  let tokens = [];
  let outbox = [];
  let dirty = false;
  let landscape = false;
  let overlayAgeMs = 0;
  let lastOverlay = null;
  let result = null;
  let settleOutcome = null;
  let ended = false;

  function emit(event) {
    outbox.push(event);
  }

  function findToken(reason) {
    return tokens.find((t) => t.reason === reason) || null;
  }

  function acquire(reason, durationMs, onEnd, detail) {
    if (TIMELESS[reason]) {
      const existing = findToken(reason);
      if (existing) return existing;
    }
    const token = {
      id: nextTokenId++, reason, durationMs: TIMELESS[reason] ? null : durationMs,
      elapsedMs: 0, bornFrame: frameNo, notified: false, onEnd: onEnd || null, detail: detail || null,
    };
    tokens.push(token);
    emit({ type: 'tokenStart', reason, durationMs: token.durationMs, detail: token.detail });
    return token;
  }

  function release(token) {
    const i = tokens.indexOf(token);
    if (i < 0) return;
    tokens.splice(i, 1);
    emit({ type: 'tokenEnd', reason: token.reason, detail: token.detail });
  }

  function dispatch(res) {
    if (!res || res.ok === false) return;
    if (res.type === 'clear') {
      pressure.onClear(res);
      emit(res);
    } else {
      emit(res);
    }
    dirty = true;
  }

  const board = systems.createBoard(chapter, { seed });
  const ctx = { chapter, board, emit, acquire, release, dispatch, gameTime: () => gameTime };
  const pressure = systems.createPressure(ctx);
  const effects = systems.createEffects(Object.assign({}, ctx, { pressure }));
  const skills = systems.createSkills(Object.assign({}, ctx, { pressure }));
  if (pressure.bindSkills) pressure.bindSkills(skills);

  function sanitize(dtReal) {
    return dtReal < 0 || dtReal > BG_GAP_MS ? 0 : dtReal;
  }

  function enterEnd(o) {
    devAssert(tokens.length === 0, 'tokens held when entering end');
    const win = o.result === 'win';
    state = 'end';
    result = {
      chapterId: chapter.id,
      mode: chapter.mode,
      win,
      reason: win ? null : o.reason,
      gameTimeMs: Math.floor(gameTime),
      maxCombo: effects.maxCombo(),
      skillsUsed: skills.skillsUsed(),
      metrics: pressure.metrics(),
    };
    settleOutcome = progress.settle(result);
    emit({ type: 'state', from: 'play', to: 'end', win });
  }

  // Round-flow rule 6.5: outcome first, then ensurePlayable when the board may have changed.
  function settlePoint(boardChanged) {
    dirty = false;
    const o = pressure.outcome();
    if (o.result) {
      enterEnd(o);
      return;
    }
    if (!boardChanged) return;
    const r = board.ensurePlayable();
    if (!r) return;
    if (r.type === 'reshuffle') {
      emit(r);
      acquire('reshuffle', RESHUFFLE_SHOW_MS, (tok) => { release(tok); dirty = true; }, { fallback: r.fallback });
    } else if (r.type === 'clear') {
      pressure.onClear(r);
      emit(r);
      settlePoint(false);
    }
  }

  function boardBlocked(tokensAtStart) {
    return state !== 'play' || tokensAtStart || tokens.length > 0;
  }

  function abandon(to) {
    tokens = [];
    ended = true;
    emit({ type: 'exit', to });
  }

  function handleButton(it) {
    if (overlayAgeMs < CARD_GUARD_MS) return;
    const ov = overlay();
    if (ov === 'open' && it.button === 'start') {
      starting = true;
      startElapsed = 0;
      emit({ type: 'state', from: 'open', to: 'starting' });
    } else if (ov === 'resume' && it.button === 'resume') {
      const bg = findToken('background');
      if (bg) release(bg);
    } else if (ov === 'pause' && it.button === 'resume') {
      const p = findToken('pause');
      if (p) release(p);
      const bg = findToken('background');
      if (bg) release(bg);
    } else if (ov === 'pause' && it.button === 'restart') {
      abandon('retry');
    } else if ((ov === 'win' || ov === 'lose') && state === 'settle' && it.button === 'retry') {
      ended = true;
      emit({ type: 'exit', to: 'retry' });
    }
  }

  function handleIntent(it, tokensAtStart) {
    if (ended) return;
    if (it.type === 'cell') {
      if (boardBlocked(tokensAtStart)) return;
      const res = board.tap(it.row, it.col);
      if (!res) return;
      if (res.type === 'match') {
        effects.onMatch(res);
        skills.onMatch(res);
        pressure.onMatch(res);
        emit(res);
      } else if (res.type === 'miss') {
        effects.onMiss(res);
        pressure.onMiss(res);
        emit(res);
      }
      if (tokens.length === 0) settlePoint(true);
      else dirty = true;
    } else if (it.type === 'card') {
      if (boardBlocked(tokensAtStart)) return;
      skills.tapCard(it.general, { row: it.row, col: it.col }); // prototype: Guan Yu's row / Huang Zhong's column ride on the card intent
    } else if (it.type === 'pauseStamp') {
      if (state === 'play') acquire('pause');
    } else if (it.type === 'button') {
      handleButton(it);
    }
  }

  /**
   * One frame in the five steps of round-flow rule 6.7 (ADR-0002 section 3).
   * @param {number} dtReal real milliseconds since the previous frame
   * @param {Array<object>} intents input intents in arrival order
   */
  function frame(dtReal, intents) {
    frameNo++;
    if (ended) return;
    // ① implicit background
    if (state === 'play' && dtReal > BG_GAP_MS) {
      acquire('background');
      trackOverlay(0);
      return;
    }
    // ② intents
    const tokensAtStart = tokens.length > 0;
    for (const it of intents) handleIntent(it, tokensAtStart);
    if (ended) return;
    // ③ token timers (foreground time, frozen while background/pause is held)
    const dtSan = sanitize(dtReal);
    const frozen = !!(findToken('background') || findToken('pause'));
    const dtTok = frozen ? 0 : dtSan;
    for (const t of tokens.slice()) {
      if (t.durationMs === null || t.bornFrame === frameNo) continue;
      t.elapsedMs += dtTok;
      if (!t.notified && t.elapsedMs >= t.durationMs) {
        t.notified = true;
        dirty = true;
        if (t.onEnd) t.onEnd(t);
      }
      if (tokens.indexOf(t) >= 0 && t.elapsedMs >= TOKEN_MAX_MS) {
        devWarn('token ' + t.reason + ' force-released');
        if (!t.notified) { t.notified = true; if (t.onEnd) t.onEnd(t); }
        release(t);
        dirty = true;
      }
    }
    if (state === 'open' && starting && !frozen) {
      startElapsed += dtSan;
      if (startElapsed >= OPEN_FADE_MS) {
        state = 'play';
        starting = false;
        emit({ type: 'state', from: 'starting', to: 'play' });
      }
    }
    // ④ clock and tick
    let ticked = false;
    let tickChanged = false;
    if (state === 'play' && tokens.length === 0) {
      const dtGame = Math.min(Math.max(dtReal, 0), MAX_STEP_MS);
      if (dtGame > 0) {
        gameTime += dtGame;
        tickChanged = pressure.tick(dtGame);
        ticked = true;
      }
    }
    // ⑤ settle point
    if (state === 'play' && tokens.length === 0 && (dirty || ticked)) settlePoint(dirty || tickChanged);
    trackOverlay(dtSan);
  }

  function trackOverlay(dtSan) {
    const ov = overlay();
    if (ov !== lastOverlay) {
      lastOverlay = ov;
      overlayAgeMs = 0;
    } else {
      overlayAgeMs += dtSan;
    }
  }

  function overlay() {
    if (landscape) return 'landscape';
    const bg = findToken('background');
    const p = findToken('pause');
    if (p) return 'pause';
    if (bg) return 'resume';
    if (state === 'open') return starting ? null : 'open';
    if (state === 'end') return result && result.win ? 'win' : null;
    if (state === 'settle') return result.win ? 'win' : 'lose';
    return null;
  }

  return {
    frame,
    acquire,
    release,
    dispatch,
    onHidden() { if (state === 'play' && !ended) acquire('background'); },
    onVisible() {},
    setLandscape(on) {
      landscape = !!on;
      if (landscape && state === 'play' && !ended) acquire('pause');
    },
    onBack() { if (state === 'play' && !ended) acquire('pause'); },
    endingDone() {
      if (state !== 'end') return;
      state = 'settle';
      overlayAgeMs = 0;
      lastOverlay = overlay();
      emit({ type: 'state', from: 'end', to: 'settle' });
    },
    state() { return state; },
    starting() { return starting; },
    gameTime() { return gameTime; },
    tokens() { return tokens.map((t) => ({ reason: t.reason, remainingMs: t.durationMs === null ? null : Math.max(0, t.durationMs - t.elapsedMs) })); },
    boardLocked() { return state !== 'play' || tokens.length > 0; },
    overlay,
    overlayAgeMs() { return overlayAgeMs; },
    result() { return result; },
    settleOutcome() { return settleOutcome; },
    systems() { return { board, effects, pressure, skills }; },
    drainEvents() { const out = outbox; outbox = []; return out; },
  };
}
