// Round flow (design/gdd/round-flow.md rules 1, 3-8, 12, 13; ADR-0002, ADR-0003).
// Stories round-flow/001-004: the game clock (dt_game), the token set with its
// foreground clock, the open/play/end/settle states with the settle-card exits,
// and the board lock that discards taps. Stories 005-009: the frame steps with
// 3b and the settle points, the match/miss notify order and dispatch table,
// the pressure tick (push -> skills.onPush), win-before-lose and reshuffle at
// the settle point, and the RoundResult handed to progress.settle on entering end.
// Stories 010-012 (rules 3, 10, 11): background (explicit and implicit), the
// pause stamp, landscape and the back key as `background` / `pause` tokens,
// 接着讲, and 回书目 abandoning the round. Page events are wired by
// src/platform/lifecycle.mjs to onHidden / onVisible / setLandscape / onBack.
// Stories 013-017 (rules 2, 5a, 9): Guan Yu's row select and Huang Zhong's
// column select as an input mode (no token, no step), its cancels and
// interrupts; CARD_GUARD_MS on overlay-card buttons (overlayAgeMs); 开讲 with
// the slot picker, the loadout handed to createSkills and the `starting`
// fade (OPEN_FADE_MS). One round object per attempt; the
// assembly root passes `systems` (Core must not import Feature modules).
// Time only enters through frame(dtReal). No page, clock, global random or
// storage access.
import * as DEFAULTS from '../core/constants.mjs';

/** Timed token reasons -> the constant holding their default duration (rule 4). */
const TIMED = Object.freeze({
  effect: 'EFFECT_HIGHLIGHT_MS',
  skill: 'SKILL_SHOW_MS',
  hostAttack: 'HOST_ATTACK_MS',
  phase: 'PHASE_SHOW_MS',
  reshuffle: 'RESHUFFLE_SHOW_MS',
});
/** Untimed reasons: held until 接着讲 / continue, exempt from TOKEN_MAX_MS. */
const UNTIMED = Object.freeze(['background', 'pause', 'tutorial']);
/** Reasons held at most once (rule 4): acquiring again returns the held token. They also freeze the token clock. */
const SINGLE = Object.freeze(['background', 'pause']);
/** Overlay card -> its buttons while in play (rules 10, 11); the landscape card has none. */
const CARD_BUTTONS = Object.freeze({ resume: Object.freeze(['resume']), pause: Object.freeze(['resume', 'catalog']) });
/** The open card's buttons (rule 2): 开讲, then the picker's slot / pick / × buttons (general-loadout rules 10-12). */
const OPEN_BUTTONS = Object.freeze(['start', 'slot', 'pick', 'clear']);
/** Intents subject to the board lock (rule 5, ADR-0003 section 2). */
const BOARD_INTENTS = Object.freeze(['cell', 'card', 'offBoard']);
/** Events pressure emits from tick when it changes the board (rule 6.4 table): push, attack, phase change. */
const TICK_CHANGES = Object.freeze(['push', 'hostAttack', 'bossPhase']);

/**
 * Creates one round (ADR-0002 assembly order): `createBoard(chapter, {seed, streams})`
 * -> ctx -> `createPressure(ctx)` -> `createEffects` and `createSkills` with
 * `Object.assign({}, ctx, {pressure})`. The round starts in `open`.
 * @param {{chapter: {id: string, mode: string}, seed: number, constants?: Object,
 *   progress: {settle: function(Object): Object},
 *   systems: {createBoard: function(Object, Object): Object,
 *     createPressure: function(Object): Object, createEffects: function(Object): Object,
 *     createSkills: function(Object): Object},
 *   streams?: Object, attempt?: number, loadout?: Array<(string|null)>, hasNext?: boolean,
 *   picker?: {press: function(Object): void, slots: function(): Array<(string|null)>, collapse: function(): void},
 *   warn?: function(string, Object): void}} options `constants` override the
 *   defaults in src/core/constants.mjs; `progress` comes from the assembly root
 *   (ADR-0004) and is called once on entering end; `attempt` (default 1) goes
 *   into the RoundResult; `picker` is general-loadout's slot picker on the open
 *   card (slot / pick / × button intents go to `press`); without a picker the
 *   slots are `loadout` (general ids in slot order, null = empty slot). At 开讲
 *   the filled slots become the RoundResult loadout (1-3) and go to createSkills;
 *   `hasNext` is false on the last loadable chapter; `warn` receives dev-build
 *   warnings (default: ignored).
 * @returns {Object} the round: frame, start, endingDone, onHidden, onVisible,
 *   setLandscape, onBack, acquire, release, dispatch and the queries state,
 *   gameTime, tokens, boardLocked, selecting, slots, exits, overlay, buttons,
 *   result, settleOutcome, systems, drainEvents
 * @throws {TypeError} when `systems` is missing a factory
 * @throws {RangeError} when BG_GAP_MS is not greater than MAX_STEP_MS
 * @example
 * const round = createRound({ chapter, seed, constants: {}, progress, systems });
 * round.start();
 * round.frame(16.7, []);
 * round.gameTime(); // 16.7
 */
export function createRound(options) {
  const opts = options || {};
  const systems = opts.systems;
  const factories = ['createBoard', 'createPressure', 'createEffects', 'createSkills'];
  if (!systems || factories.some((name) => typeof systems[name] !== 'function')) {
    throw new TypeError('createRound: systems must be passed by the assembly root (ADR-0002)');
  }
  const progress = opts.progress;
  const K = Object.assign({}, DEFAULTS, opts.constants);
  if (!(K.BG_GAP_MS > K.MAX_STEP_MS)) throw new RangeError('BG_GAP_MS must be greater than MAX_STEP_MS');
  const warn = typeof opts.warn === 'function' ? opts.warn : function () {};
  const hasNext = opts.hasNext === true;

  let state = 'open';
  let gameTimeMs = 0;
  let frameNo = 0;
  let nextTokenId = 1;
  let ending = null;
  let roundResult = null;
  let settleOutcome = null;
  // Something happened since the last settle point (rule 6.5): a tap result,
  // a result handed back, or a push / attack / phase change in tick.
  let pending = false;
  // A holder handed back a result (dispatch) since the last settle point: frame step 3b.
  let handedBack = false;
  let inTick = false;
  // The phone is held sideways (setLandscape); picks the landscape card over the pause card.
  let landscape = false;
  // 回书目 was pressed (rule 11): the round is dropped and does nothing more.
  let abandoned = false;
  const tokens = [];
  let outbox = [];
  const attempt = typeof opts.attempt === 'number' ? opts.attempt : 1;
  const picker = opts.picker || null;
  // The slots (null = empty) and the generals fielded; both fixed at 开讲 (rule 2).
  let slots = Array.isArray(opts.loadout) ? opts.loadout.slice() : [];
  let loadout = [];
  // Rule 5a input mode, not a token: null | 'row' (Guan Yu) | 'col' (Huang Zhong).
  let selecting = null;
  // Rule 9: foreground ms since the current card (shownCard) appeared or settle began.
  let shownCard = 'open';
  let overlayAgeMs = 0;
  // Foreground ms spent in `starting` (rule 2, OPEN_FADE_MS).
  let fadeMs = 0;

  // Every event goes to the view. While pressure.tick runs, a push / attack /
  // phase change marks the board as changed, and a push is passed on to
  // skills.onPush() at once (ADR-0002 section 3 step 4; direct call, not an event).
  // A push cancels a row select (row numbers moved) but keeps a column select;
  // skills reads ctx.selecting() in onPush to redraw the column highlight (rule 5a).
  function emit(ev) {
    outbox.push(ev);
    if (!inTick || TICK_CHANGES.indexOf(ev.type) === -1) return;
    pending = true;
    if (ev.type !== 'push') return;
    if (selecting === 'row') selecting = null;
    skills.onPush();
  }

  // Rule 9: a new card (any change of overlay()) restarts its button guard.
  function syncOverlay() {
    const card = overlay();
    if (card === shownCard) return;
    shownCard = card;
    overlayAgeMs = 0;
  }

  // Entering settle restarts the guard even when the card stays 'win' (its buttons appear now).
  function setState(to) {
    const from = state;
    state = to;
    emit({ type: 'state', from, to });
    if (to === 'settle') overlayAgeMs = 0;
    syncOverlay();
  }

  function holds(reason) {
    return tokens.some((token) => token.reason === reason);
  }

  /**
   * Acquires a token (rule 4). Timed reasons default their duration to the
   * matching constant; untimed reasons carry `durationMs: null`. Emits `tokenStart`.
   * A token acquired during a frame starts counting on the next frame.
   * `background` and `pause` are held at most once: acquiring again returns the held token.
   * @param {string} reason one of the 8 reasons in rule 4
   * @param {number} [durationMs] timed reasons only
   * @param {function(Object): void} [onEnd] called once when the token runs out
   * @param {*} [detail] passed to the view with tokenStart / tokenEnd
   * @returns {Object} the token `{id, reason, durationMs, elapsedMs, bornFrame, notified, onEnd, detail}`
   */
  function acquire(reason, durationMs, onEnd, detail) {
    if (SINGLE.indexOf(reason) !== -1) {
      const held = tokens.find((token) => token.reason === reason);
      if (held) return held;
    }
    let duration = null;
    if (Object.prototype.hasOwnProperty.call(TIMED, reason)) {
      duration = typeof durationMs === 'number' ? durationMs : K[TIMED[reason]];
    } else if (UNTIMED.indexOf(reason) === -1) {
      throw new RangeError('unknown token reason: ' + reason);
    }
    const token = {
      id: nextTokenId++,
      reason,
      durationMs: duration,
      elapsedMs: 0,
      bornFrame: frameNo,
      notified: false,
      onEnd: typeof onEnd === 'function' ? onEnd : null,
      detail: detail === undefined ? null : detail,
    };
    tokens.push(token);
    emit({ type: 'tokenStart', reason, durationMs: duration, detail: token.detail });
    syncOverlay();
    return token;
  }

  /**
   * Returns a token. Releasing a token not in the set does nothing. Emits `tokenEnd`.
   * @param {Object} token a token returned by acquire
   * @returns {void}
   */
  function release(token) {
    const index = tokens.indexOf(token);
    if (index === -1) return;
    tokens.splice(index, 1);
    emit({ type: 'tokenEnd', reason: token.reason, durationMs: token.durationMs, detail: token.detail });
    syncOverlay();
  }

  // The dispatch table (rule 6.4): any `clear` (effect, skill, the row cut,
  // the reshuffle fallback) goes to pressure.onClear and then the view; a
  // `reshuffle` goes to the view and holds the board for RESHUFFLE_SHOW_MS.
  function route(result) {
    if (result.type === 'clear') pressure.onClear(result);
    emit(result);
    if (result.type === 'reshuffle') acquire('reshuffle', undefined, release);
  }

  /**
   * A holder hands back the result of changing the board (rule 6.4), usually
   * from a token's onEnd before releasing it. Routed by the dispatch table and
   * counted for the next settle point (frame step 3b).
   * @param {Object} result e.g. `{type: 'clear', source: 'effect', ...}`
   * @returns {void}
   * @example ctx.dispatch(board.clearKind('ying')); ctx.release(token);
   */
  function dispatch(result) {
    pending = true;
    handedBack = true;
    route(result);
  }

  const gameTime = () => gameTimeMs;
  const board = systems.createBoard(opts.chapter, { seed: opts.seed, streams: opts.streams });
  // ctx.selecting() lets skills show the select state on its cards (skills.cards()).
  const ctx = {
    chapter: opts.chapter, constants: K, board, emit, acquire, release, dispatch, gameTime, selecting: () => selecting,
  };
  const pressure = systems.createPressure(ctx);
  const effects = systems.createEffects(Object.assign({}, ctx, { pressure }));
  // Built at 开讲 with the loadout (ADR-0002 section 2 "开讲撤遮罩"; null in open).
  let skills = null;

  function notifyToken(token) {
    token.notified = true;
    if (token.onEnd) token.onEnd(token);
  }

  function paused() {
    return SINGLE.some(holds);
  }

  // Frame step 3: the foreground token clock (Formulas, token_clock). A frame
  // that began or ends under a background / pause token counts 0.
  function runTokenClock(dtReal, pausedAtStart) {
    const frozen = pausedAtStart || paused() || !(dtReal > 0) || dtReal > K.BG_GAP_MS;
    const dtTok = frozen ? 0 : dtReal;
    const snapshot = tokens.slice();
    for (const token of snapshot) {
      if (token.durationMs === null || tokens.indexOf(token) === -1) continue;
      if (token.bornFrame < frameNo) token.elapsedMs += dtTok;
      if (!token.notified && token.elapsedMs >= token.durationMs) notifyToken(token);
      if (tokens.indexOf(token) !== -1 && token.elapsedMs >= K.TOKEN_MAX_MS) {
        release(token);
        warn('token force-released after TOKEN_MAX_MS', { reason: token.reason, id: token.id });
        if (!token.notified) notifyToken(token);
      }
    }
  }

  // Board match/miss in rule 6.3 order, written only here: effects -> skills ->
  // pressure -> view. A miss skips skills (nothing to charge); effects still
  // hear it because the combo drops to 0 (clear-effects rule 6).
  function notifyBoardEvent(ev) {
    if (ev.type === 'match') {
      effects.onMatch(ev);
      skills.onMatch(ev);
      pressure.onMatch(ev);
    } else if (ev.type === 'miss') {
      effects.onMiss(ev);
      pressure.onMiss(ev);
    }
    emit(ev);
  }

  // Frame step 2 for one intent. Board and card taps are dropped, never queued,
  // when the state is not play or the set was non-empty at frame start or is now.
  // A tap with a result is followed at once by a settle point (rule 6.7 step 2).
  // The pause stamp ignores the board lock and the card guard (rules 9, 11);
  // overlay-card buttons ignore the board lock and are dropped while
  // overlayAgeMs < CARD_GUARD_MS. skills.tapCard returning 'row' / 'col'
  // enters row / column select (rule 5a; no token, no step); an offBoard tap
  // only means something while selecting.
  function handleIntent(intent, lockedAtStart) {
    if (intent.type === 'pauseStamp') {
      pause();
      return;
    }
    if (intent.type === 'button') {
      if (overlayAgeMs >= K.CARD_GUARD_MS) pressButton(intent);
      return;
    }
    if (BOARD_INTENTS.indexOf(intent.type) === -1) return;
    if (state !== 'play' || lockedAtStart || tokens.length > 0) return;
    if (selecting) {
      selectTap(intent);
    } else if (intent.type === 'cell') {
      const ev = board.tap(intent.row, intent.col);
      if (ev) notifyBoardEvent(ev);
      if (ev && (ev.type === 'match' || ev.type === 'miss')) pending = true;
    } else if (intent.type === 'card') {
      const mode = skills.tapCard(intent.general);
      if (mode === 'row' || mode === 'col') {
        selecting = mode;
        board.clearSelection();
      }
    }
    if (pending) settlePoint();
  }

  // A tap while selecting (rule 5a), never passed to board.tap. A selectable
  // row / column fires the skill (skills takes the `skill` token and clears the
  // charge); an unselectable one does nothing; any general card (the other
  // general's too) or offBoard cancels and does nothing else.
  function selectTap(intent) {
    if (intent.type !== 'cell') {
      selecting = null;
      return;
    }
    const byRow = selecting === 'row';
    if (!(byRow ? skills.rowSelectable(intent.row) : skills.colSelectable(intent.col))) return;
    selecting = null;
    if (byRow) skills.cutRow(intent.row);
    else skills.cutCol(intent.col);
  }

  // An overlay-card button (rules 2, 10, 11, 13); a button the current card does
  // not show is ignored. Open card: 开讲, or a picker button passed on whole.
  // 接着讲 returns pause and background together.
  function pressButton(intent) {
    const button = intent.button;
    if (buttons().indexOf(button) === -1) return;
    if (state === 'settle') {
      emit({ type: 'exit', to: button });
    } else if (state === 'open') {
      if (button === 'start') begin();
      else picker.press(intent);
    } else if (button === 'resume') {
      for (const token of tokens.filter((t) => SINGLE.indexOf(t.reason) !== -1)) release(token);
    } else {
      abandon();
    }
  }

  // 回书目 (rule 11): every token is dropped without notifying its holder or
  // emitting tokenEnd; no RoundResult, no progress.settle; the round does
  // nothing more and screens drops it on the exit event.
  function abandon() {
    tokens.length = 0;
    abandoned = true;
    selecting = null;
    emit({ type: 'exit', to: 'catalog' });
    syncOverlay();
  }

  // 开讲 (rule 2): the picker's expansion closes, the filled slots in slot
  // order become the loadout and go to createSkills; then `starting` (the
  // card becomes null and the view fades the mask) until OPEN_FADE_MS of
  // foreground time has passed, then play.
  function begin() {
    if (state !== 'open') return;
    if (picker) {
      picker.collapse();
      slots = picker.slots().slice();
    }
    loadout = slots.filter((id) => typeof id === 'string');
    skills = systems.createSkills(Object.assign({}, ctx, { pressure, loadout: loadout.slice() }));
    setState('starting');
    if (fadeMs >= K.OPEN_FADE_MS) setState('play');
  }

  // The pause stamp, landscape and the back key (rule 11): only in play.
  function pause() {
    if (state === 'play' && !abandoned) acquire('pause');
  }

  /**
   * The card the view shows (ADR-0002 section 2 table): 'open' in open; null
   * in starting; in play 'landscape' / 'pause' while holding pause (sideways / upright), else
   * 'resume' while holding background, else null; 'win' in end and settle
   * after a win; null in end and 'lose' in settle after a loss.
   * @returns {(string|null)}
   */
  function overlay() {
    if (state === 'open') return 'open';
    if (state === 'starting') return null;
    if (state === 'end' || state === 'settle') {
      if (ending.result === 'win') return 'win';
      return state === 'settle' ? 'lose' : null;
    }
    if (abandoned) return null;
    if (holds('pause')) return landscape ? 'landscape' : 'pause';
    return holds('background') ? 'resume' : null;
  }

  /**
   * The buttons of the current card: pause card -> resume, catalog; 接着讲
   * card -> resume; settle -> exits(); open card -> start, plus slot, pick,
   * clear when a picker was given; otherwise [].
   * @returns {string[]}
   */
  function buttons() {
    if (state === 'settle') return exits();
    if (state === 'open') return picker ? OPEN_BUTTONS.slice() : OPEN_BUTTONS.slice(0, 1);
    const card = state === 'play' ? overlay() : null;
    return Object.prototype.hasOwnProperty.call(CARD_BUTTONS, card) ? CARD_BUTTONS[card].slice() : [];
  }

  // Asks pressure once (rule 7: outcome() itself checks win before lose) and
  // enters end when it decides. Returns true when decided.
  function decide() {
    const outcome = pressure.outcome();
    if (!outcome || !outcome.result) return false;
    enterEnd(outcome);
    return true;
  }

  // The settle point (rules 6.5, 7). Nothing is checked while any token is held.
  // Outcome first; when undecided and something happened since the last settle
  // point, board.ensurePlayable(): a reshuffle holds the board, a fallback
  // clear goes to pressure.onClear and the outcome is asked for once more.
  function settlePoint() {
    if (state !== 'play' || tokens.length > 0) return;
    const changed = pending;
    pending = false;
    handedBack = false;
    if (decide() || !changed) return;
    const fixed = board.ensurePlayable();
    if (!fixed) return;
    route(fixed);
    if (fixed.type === 'clear') decide();
  }

  // Entering end (rule 8): the clock stops and the board locks with the state
  // change, then progress.settle gets the RoundResult once, at once.
  function enterEnd(outcome) {
    if (ending) {
      warn('entered end twice', { result: outcome.result });
      return;
    }
    if (tokens.length > 0) warn('entered end while holding tokens', { count: tokens.length });
    const win = outcome.result === 'win';
    selecting = null; // void, charge kept (rule 5a)
    ending = { result: outcome.result, reason: win || outcome.reason === undefined ? null : outcome.reason };
    setState('end');
    roundResult = buildResult(win, ending.reason);
    const settled = progress.settle(roundResult);
    settleOutcome = settled === undefined ? null : settled;
  }

  // RoundResult (rule 8). skillsUsed lists exactly the loadout's generals.
  function buildResult(win, reason) {
    const used = skills.skillsUsed() || {};
    const skillsUsed = {};
    for (const id of loadout) skillsUsed[id] = used[id] || 0;
    const mode = opts.chapter.mode;
    return {
      chapterId: opts.chapter.id,
      mode,
      win,
      reason,
      gameTimeMs: Math.floor(gameTimeMs),
      maxCombo: effects.maxCombo(),
      attempt,
      loadout: loadout.slice(),
      skillsUsed,
      bossPhase: mode === 'boss' ? pressure.hud().phase : null,
      metrics: pressure.metrics(),
    };
  }

  /**
   * Allowed settle-card exits (rule 13): win with a next chapter ->
   * next, retry, catalog; last chapter won or lost -> retry, catalog; [] outside settle.
   * @returns {string[]}
   */
  function exits() {
    if (state !== 'settle' || !ending) return [];
    return ending.result === 'win' && hasNext ? ['next', 'retry', 'catalog'] : ['retry', 'catalog'];
  }

  return {
    /**
     * Runs one frame (rule 6.7): step 2 taps (each followed by a settle point),
     * step 3 token clock, 3b settle point when a token end empties the set with
     * results handed back (skips step 4 when it ends the round or reshuffles),
     * step 4 pressure.tick when dtGame > 0, step 5 settle point after a tick.
     * dtReal is passed raw; clamping happens here only.
     * @param {number} dtReal ms since the previous frame, as measured by the main loop
     * @param {Array<Object>} [intents] this frame's intents in arrival order (ADR-0003)
     * @returns {void}
     */
    frame(dtReal, intents) {
      frameNo++;
      if (abandoned) return;
      // Foreground real time (rule 9 card_guard; rule 2 fade): a negative
      // dtReal or a background gap counts 0; tokens do not stop it.
      const dtFg = dtReal > 0 && dtReal <= K.BG_GAP_MS ? dtReal : 0;
      overlayAgeMs += dtFg;
      // `starting` reads no taps (the state is not play) and runs no clock.
      if (state === 'starting') {
        fadeMs += dtFg;
        if (fadeMs >= K.OPEN_FADE_MS) setState('play');
        return;
      }
      // Step 1, implicit background (rule 3): the frame ends here, taps unread.
      if (state === 'play' && dtReal > K.BG_GAP_MS) {
        acquire('background');
        return;
      }
      const lockedAtStart = tokens.length > 0;
      const pausedAtStart = paused();
      const list = intents || [];
      for (let i = 0; i < list.length && !abandoned; i++) handleIntent(list[i], lockedAtStart);
      if (abandoned) return;
      const heldBeforeClock = tokens.length > 0;
      runTokenClock(dtReal, pausedAtStart);
      if (heldBeforeClock && tokens.length === 0 && handedBack) {
        settlePoint(); // step 3b
        if (state !== 'play' || tokens.length > 0) return;
      }
      if (state !== 'play' || tokens.length > 0 || dtReal > K.BG_GAP_MS) return;
      const dtGame = dtReal > 0 ? Math.min(dtReal, K.MAX_STEP_MS) : 0;
      gameTimeMs += dtGame;
      if (!(dtGame > 0)) return;
      inTick = true;
      try {
        pressure.tick(dtGame);
      } finally {
        inTick = false;
      }
      settlePoint(); // step 5
    },

    /**
     * 开讲 (rule 2), what the open card's 'start' button does once its guard
     * has passed: fixes the loadout, builds skills with it, enters `starting`
     * and, after OPEN_FADE_MS of foreground frames, play. Ignored outside open.
     * @returns {void}
     */
    start: begin,

    /**
     * end -> settle, called by the view after ENDING_WIN_MS / ENDING_LOSE_MS
     * of foreground time (rule 8). Ignored in any other state.
     * @returns {void}
     */
    endingDone() {
      if (state === 'end') setState('settle');
    },

    /**
     * The page went hidden (visibilitychange or pagehide, rule 10): holds
     * `background` in play only; open, end and settle are left as they are.
     * @returns {void}
     */
    onHidden() {
      if (state === 'play' && !abandoned) acquire('background');
    },

    /**
     * The page is visible again. Nothing to record: the 接着讲 card follows
     * from the held `background` token (overlay()).
     * @returns {void}
     */
    onVisible() {},

    /**
     * The phone turned sideways (on) or upright (rule 11). Sideways in play
     * holds `pause` and shows the landscape card; upright shows the pause card.
     * @param {boolean} on true when sideways
     * @returns {void}
     */
    setLandscape(on) {
      landscape = on === true;
      if (landscape) pause();
      syncOverlay();
    },

    /**
     * The Android back key (ADR-0002 section 4): in play, the same as the
     * pause stamp. Other screens are handled by screens.mjs.
     * @returns {void}
     */
    onBack() {
      pause();
    },

    acquire,
    release,
    dispatch,
    exits,
    overlay,
    buttons,

    /** @returns {string} 'open' | 'starting' (the 开讲 fade) | 'play' | 'end' | 'settle' */
    state: () => state,

    /** @returns {(string|null)} rule 5a input mode: 'row' (Guan Yu), 'col' (Huang Zhong) or null */
    selecting: () => selecting,

    /**
     * The slots in slot order, null for an empty slot: the picker's while in
     * open, fixed from 开讲 on. screens hands them to the next round on 再来一回.
     * @returns {Array<(string|null)>}
     */
    slots: () => (picker && state === 'open' ? picker.slots() : slots).slice(),

    /** @returns {number} game time in ms */
    gameTime,

    /** @returns {Array<{reason: string, remainingMs: (number|null)}>} read-only snapshot, acquire order */
    tokens: () => tokens.map((token) => ({
      reason: token.reason,
      remainingMs: token.durationMs === null ? null : Math.max(0, token.durationMs - token.elapsedMs),
    })),

    /** @returns {boolean} true when the state is not play, any token is held (rule 5) or the round was abandoned */
    boardLocked: () => state !== 'play' || tokens.length > 0 || abandoned,

    /** @returns {(Object|null)} the RoundResult (rule 8) once the round entered end */
    result: () => roundResult,

    /** @returns {(Object|null)} what progress.settle returned on entering end */
    settleOutcome: () => settleOutcome,

    /** @returns {{board: Object, effects: Object, pressure: Object, skills: (Object|null)}} for view queries; skills is null before 开讲 */
    systems: () => ({ board, effects, pressure, skills }),

    /** @returns {Array<Object>} every event since the last call, in order; empties the outbox */
    drainEvents() {
      const events = outbox;
      outbox = [];
      return events;
    },
  };
}
