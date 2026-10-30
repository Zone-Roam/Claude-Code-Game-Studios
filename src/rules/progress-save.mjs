// progress-save: stars, best records, the versioned save and its storage states.
// Implements design/gdd/progress-save.md (rules 1-20, Edge Cases) under
// ADR-0004 (local save). Pure rules: storage arrives as an injected port
// ({read, write, remove}) and the clock as an injected `now`; every port call
// is wrapped so that no storage exception ever leaves this module.

/** Current save data version (rule 10). */
export const SAVE_VERSION = 1;
/** Storage key of the save record (rule 10). */
export const SAVE_KEY = 'pslk.save';
/** Storage key of the corrupt-save backup, one copy only (rule 16). */
export const SAVE_BAD_KEY = 'pslk.save.bad';
/** Storage key of the boot write-read-remove probe (rule 14). */
export const SAVE_PROBE_KEY = 'pslk.probe';
/** Fixed probe payload (rule 14). */
export const SAVE_PROBE_VALUE = 'pslk-probe-1';
/** Longest valid per-chapter loadout (rule 11). */
export const SLOT_MAX = 3;
/** Boss mode default star thresholds on heartsLost (registry star_boss_t3_t2). */
export const STAR_BOSS_T3 = 0;
export const STAR_BOSS_T2 = 1;
/** Press mode default star thresholds on dangerMs (registry star_press_t3_t2). */
export const STAR_PRESS_T3 = 2000;
export const STAR_PRESS_T2 = 8000;
/** Food mode default thresholds (registry star_food_t3_miss_t2). */
export const STAR_FOOD_T3 = 2;
export const STAR_MISS_T2 = 2;

/** Notice kinds in priority order, highest first (rule 18). */
export const NOTICE_PRIORITY = ['noStorage', 'noWrite', 'corrupt', 'newer'];

/**
 * Default player-facing text (rules 6, 18). The view may pass its own `texts`
 * to createProgress; these are only the defaults, copied from the GDD.
 */
export const PROGRESS_TEXTS = {
  heartsLost: '丢了 {n} 颗心',
  dangerMs: '压线 {n} 秒',
  misses: '连不上 {n} 次',
  foodLeft: '余粮只剩 {n} 份',
  noStorage: '这台手机存不了进度，关掉后要从头讲起',
  noWrite: '这台手机存不了新进度，这次打的关掉后不会保留',
  corrupt: '存档读不出来，已从头开始',
  newer: '存档来自新版本，这次的进度不会保存',
};

function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function isNonNegInt(x) {
  return Number.isInteger(x) && x >= 0;
}

function num(x) {
  return typeof x === 'number' && isFinite(x) ? x : 0;
}

/**
 * Rule 11 shape check of one loadout: an array of 1..SLOT_MAX distinct strings.
 * Content (known ids, slots) belongs to general-loadout.
 * @param {*} loadout
 * @returns {boolean}
 */
export function isValidLoadout(loadout) {
  if (!Array.isArray(loadout) || loadout.length < 1 || loadout.length > SLOT_MAX) return false;
  for (let i = 0; i < loadout.length; i += 1) {
    if (typeof loadout[i] !== 'string') return false;
    if (loadout.indexOf(loadout[i]) !== i) return false;
  }
  return true;
}

/**
 * Rule 11 check of one chapter record. An invalid loadout alone does not make
 * the record invalid; it is dropped and reported in `loadoutDropped`.
 * @param {*} rec stored chapter record
 * @returns {{ok: boolean, record: (Object|null), loadoutDropped: boolean}}
 */
export function validateChapterRecord(rec) {
  if (!isPlainObject(rec)) return { ok: false, record: null, loadoutDropped: false };
  const { stars, wins, plays } = rec;
  const ok = Number.isInteger(stars) && stars >= 0 && stars <= 3 &&
    isNonNegInt(wins) && isNonNegInt(plays) && wins <= plays && !(stars > 0 && wins < 1);
  if (!ok) return { ok: false, record: null, loadoutDropped: false };
  const record = { stars, wins, plays };
  let loadoutDropped = false;
  if (rec.loadout !== undefined) {
    if (isValidLoadout(rec.loadout)) record.loadout = rec.loadout.slice();
    else loadoutDropped = true;
  }
  return { ok: true, record, loadoutDropped };
}

/**
 * Parses and checks a stored save string (rules 11, 15, 16): version first,
 * then the whole-record shape, then each chapter record.
 * Chapter ids not in `knownIds` are kept raw and unchecked (rule 19).
 * @param {(string|null)} text what the port read
 * @param {{version?: number, migrations?: Object<number, function(Object): Object>,
 *   knownIds?: string[], warn?: function(string, Object): void}} [opts]
 *   `migrations[n]` turns a version-n record into version n+1
 * @returns {{status: ('empty'|'ok'|'newer'|'corrupt'), record: (Object|null)}}
 *   `record` is {v, chapters, extras}; null for 'empty' and 'corrupt'
 */
export function parseSave(text, opts) {
  const o = opts || {};
  const version = o.version || SAVE_VERSION;
  const migrations = o.migrations || {};
  const known = o.knownIds || null;
  const warn = typeof o.warn === 'function' ? o.warn : function () {};
  if (text === null || text === undefined) return { status: 'empty', record: null };
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { status: 'corrupt', record: null };
  }
  if (!isPlainObject(raw) || !Number.isInteger(raw.v) || raw.v < 1) return { status: 'corrupt', record: null };
  let status = 'ok';
  if (raw.v > version) {
    status = 'newer';
    if (!isPlainObject(raw.chapters)) return { status, record: { v: raw.v, chapters: {}, extras: {} } };
  } else {
    if (!isPlainObject(raw.chapters)) return { status: 'corrupt', record: null };
    try {
      raw = migrate(raw, version, migrations);
    } catch (e) {
      return { status: 'corrupt', record: null };
    }
    if (!isPlainObject(raw) || !isPlainObject(raw.chapters)) return { status: 'corrupt', record: null };
  }
  const chapters = {};
  for (const id of Object.keys(raw.chapters)) {
    const value = raw.chapters[id];
    if (known && known.indexOf(id) === -1) {
      chapters[id] = value; // rule 19: kept as is, ignored by queries
      continue;
    }
    const checked = validateChapterRecord(value);
    if (!checked.ok) {
      warn('progress-save: dropped invalid chapter record', { chapterId: id });
      continue;
    }
    if (checked.loadoutDropped) warn('progress-save: dropped invalid loadout', { chapterId: id, field: 'loadout' });
    chapters[id] = checked.record;
  }
  const extras = {};
  for (const key of Object.keys(raw)) {
    if (key !== 'v' && key !== 'chapters' && key !== 'updatedAt') extras[key] = raw[key];
  }
  return { status, record: { v: status === 'newer' ? raw.v : version, chapters, extras } };
}

/**
 * Rule 15: migrates a record version by version up to `version`.
 * Throws when a step is missing or throws (callers treat that as corrupt).
 * @param {Object} raw parsed record with integer `v`
 * @param {number} version target version
 * @param {Object<number, function(Object): Object>} migrations
 * @returns {Object}
 */
export function migrate(raw, version, migrations) {
  let rec = raw;
  while (rec.v < version) {
    const step = migrations[rec.v];
    if (typeof step !== 'function') throw new Error('no migration from v' + rec.v);
    const from = rec.v;
    rec = step(rec);
    if (!isPlainObject(rec) || rec.v !== from + 1) throw new Error('bad migration from v' + from);
  }
  return rec;
}

function copyChapter(rec) {
  if (!isPlainObject(rec)) return rec;
  const out = Object.assign({}, rec);
  if (Array.isArray(rec.loadout)) out.loadout = rec.loadout.slice();
  return out;
}

/**
 * Rule 13 merge of the in-memory record with a re-read stored one: stars, wins
 * and plays each take the larger value; loadout is not maxed but taken from
 * the stored record when it has a valid one, else from memory. Chapter ids not
 * in `knownIds` keep the stored raw value (else memory's). Stored top-level
 * extras win over memory's.
 * @param {{chapters: Object, extras: Object}} memory
 * @param {{chapters: Object, extras: Object}} stored a parseSave 'ok' record
 * @param {string[]} knownIds chapter ids in the chapter data
 * @returns {{chapters: Object, extras: Object}}
 */
export function mergeRecords(memory, stored, knownIds) {
  const chapters = {};
  const ids = Object.keys(memory.chapters).concat(Object.keys(stored.chapters).filter((id) => !(id in memory.chapters)));
  for (const id of ids) {
    const m = memory.chapters[id];
    const s = stored.chapters[id];
    if (knownIds.indexOf(id) === -1) {
      chapters[id] = copyChapter(s !== undefined ? s : m);
      continue;
    }
    if (!m) { chapters[id] = copyChapter(s); continue; }
    if (!s) { chapters[id] = copyChapter(m); continue; }
    const rec = {
      stars: Math.max(m.stars, s.stars),
      wins: Math.max(m.wins, s.wins),
      plays: Math.max(m.plays, s.plays),
    };
    const loadout = s.loadout || m.loadout;
    if (loadout) rec.loadout = loadout.slice();
    chapters[id] = rec;
  }
  return { chapters, extras: Object.assign({}, memory.extras, stored.extras) };
}

/**
 * The chapter's star thresholds: rule 3 overrides from `chapter.stars` when
 * their shape is right, else the defaults (the chapter loader reports bad shapes).
 * @param {{mode: string, stars?: Object}} chapter
 * @returns {Object} {t3, t2} for boss / press, {foodT3, missT2} for food
 */
export function starThresholds(chapter) {
  const over = chapter && isPlainObject(chapter.stars) ? chapter.stars : null;
  if (chapter && chapter.mode === 'food') {
    if (over && isNonNegInt(over.foodT3) && isNonNegInt(over.missT2)) return { foodT3: over.foodT3, missT2: over.missT2 };
    return { foodT3: STAR_FOOD_T3, missT2: STAR_MISS_T2 };
  }
  if (over && isNonNegInt(over.t3) && isNonNegInt(over.t2) && over.t3 <= over.t2) return { t3: over.t3, t2: over.t2 };
  if (chapter && chapter.mode === 'press') return { t3: STAR_PRESS_T3, t2: STAR_PRESS_T2 };
  return { t3: STAR_BOSS_T3, t2: STAR_BOSS_T2 };
}

/**
 * Rules 1, 2, 6 and the stars formula. Thresholds are inclusive.
 * @param {{win: boolean, mode: string, metrics?: Object}} result the RoundResult
 * @param {{mode: string, stars?: Object}} chapter
 * @returns {{stars: number, reason: ({kind: string, value: number}|null)}}
 *   `reason` is set when a win scored under 3 stars; for dangerMs `value` is
 *   seconds rounded up to one decimal
 */
export function computeStars(result, chapter) {
  if (!result || result.win !== true) return { stars: 0, reason: null };
  const m = result.metrics || {};
  const mode = result.mode || (chapter && chapter.mode);
  const th = starThresholds({ mode, stars: chapter && chapter.stars });
  let stars;
  let reason;
  if (mode === 'food') {
    const misses = num(m.misses);
    const foodLeft = num(m.foodLeft);
    stars = misses === 0 && foodLeft >= th.foodT3 ? 3 : misses <= th.missT2 ? 2 : 1;
    reason = misses > 0 ? { kind: 'misses', value: misses } : { kind: 'foodLeft', value: foodLeft };
  } else if (mode === 'press') {
    const d = num(m.dangerMs);
    stars = d <= th.t3 ? 3 : d <= th.t2 ? 2 : 1;
    reason = { kind: 'dangerMs', value: Math.ceil(d / 100) / 10 };
  } else {
    const h = num(m.heartsLost);
    stars = h <= th.t3 ? 3 : h <= th.t2 ? 2 : 1;
    reason = { kind: 'heartsLost', value: h };
  }
  return { stars, reason: stars === 3 ? null : reason };
}

function formatReason(reason, texts) {
  if (!reason) return null;
  const value = reason.kind === 'dangerMs' ? reason.value.toFixed(1) : String(reason.value);
  return texts[reason.kind].replace('{n}', value);
}

/**
 * Creates the progress system (ADR-0004 section 3).
 * @param {{storage: {read: function(string): (string|null), write: function(string, string): void,
 *   remove: function(string): void}, chapters: Array<{id: string, mode: string, stars?: Object}>,
 *   now?: function(): number, version?: number, migrations?: Object,
 *   unlock?: ('all'|'story'), texts?: Object, warn?: function(string, Object): void}} opts
 *   `chapters` are the loadable chapters in story order; `now` is only used for
 *   `updatedAt`; `unlock` is 'all' for the MVP (rule 8) and 'story' from the
 *   vertical slice; `warn` receives dev-build warnings
 * @returns {Object} progress API: boot, settle, catalog, record, storageState, nextNotice
 * @example const progress = createProgress({ storage, chapters, now: () => clock() });
 */
export function createProgress(opts) {
  const storage = opts.storage;
  const chapterList = (opts.chapters || []).slice();
  const knownIds = chapterList.map((c) => c.id);
  const now = typeof opts.now === 'function' ? opts.now : function () { return 0; };
  const version = opts.version || SAVE_VERSION;
  const migrations = opts.migrations || {};
  const unlockMode = opts.unlock === 'story' ? 'story' : 'all';
  const texts = Object.assign({}, PROGRESS_TEXTS, opts.texts);
  const warn = typeof opts.warn === 'function' ? opts.warn : function () {};

  let state = 'normal';
  let memory = { chapters: {}, extras: {} };
  const pending = {}; // notice kind -> true while waiting to be shown
  const shown = {};
  const settled = new Map(); // chapterId#attempt -> SettleOutcome

  function raise(kind) {
    if (!shown[kind]) pending[kind] = true;
  }

  function chapterById(id) {
    for (const c of chapterList) if (c.id === id) return c;
    return null;
  }

  function parse(text) {
    return parseSave(text, { version, migrations, knownIds, warn });
  }

  // Rule 14 step 2: write-read-remove on the probe key.
  function probe() {
    try {
      storage.write(SAVE_PROBE_KEY, SAVE_PROBE_VALUE);
      const back = storage.read(SAVE_PROBE_KEY);
      storage.remove(SAVE_PROBE_KEY);
      return back === SAVE_PROBE_VALUE;
    } catch (e) {
      return false;
    }
  }

  function topNotice() {
    for (const kind of NOTICE_PRIORITY) if (pending[kind]) return kind;
    return null;
  }

  function applyRound(base, result, stars) {
    const id = result.chapterId;
    const old = base.chapters[id];
    const before = old && knownIds.indexOf(id) !== -1 ? old : { stars: 0, wins: 0, plays: 0 };
    const rec = {
      stars: Math.max(before.stars, stars),
      wins: before.wins + (result.win === true ? 1 : 0),
      plays: before.plays + 1,
    };
    if (isValidLoadout(result.loadout)) rec.loadout = result.loadout.slice();
    else if (before.loadout) rec.loadout = before.loadout.slice();
    const chapters = Object.assign({}, base.chapters);
    chapters[id] = rec;
    return { record: { chapters, extras: base.extras }, bestBefore: before.stars };
  }

  function serialize(rec) {
    return JSON.stringify(Object.assign({}, rec.extras, { v: version, chapters: rec.chapters, updatedAt: now() }));
  }

  // Rules 5, 12, 13: re-read, merge, apply, write. Returns whether the write landed.
  function persist(result, stars) {
    let base = memory;
    if (state === 'normal') {
      let text;
      try {
        text = storage.read(SAVE_KEY);
      } catch (e) {
        state = 'memory';
        raise('noWrite');
      }
      if (state === 'normal') {
        const parsed = parse(text);
        if (parsed.status === 'newer') {
          state = 'readonly';
          raise('newer');
        } else if (parsed.status === 'ok') {
          base = mergeRecords(memory, parsed.record, knownIds);
        }
        // 'empty' and 'corrupt': write the memory progress; the .bad backup is not touched
      }
    }
    const applied = applyRound(base, result, stars);
    memory = applied.record;
    if (state !== 'normal') return { saved: false, bestBefore: applied.bestBefore };
    try {
      storage.write(SAVE_KEY, serialize(memory));
      return { saved: true, bestBefore: applied.bestBefore };
    } catch (e) {
      state = 'memory';
      raise('noWrite');
      return { saved: false, bestBefore: applied.bestBefore };
    }
  }

  return {
    /**
     * Rule 14: reads the save, probes storage and fixes the storage state.
     * Never throws. Writes only the probe and, for a corrupt save, the backup.
     * @returns {{state: string, notice: (string|null)}} the highest pending notice kind (not consumed)
     */
    boot() {
      let text;
      try {
        text = storage.read(SAVE_KEY);
      } catch (e) {
        state = 'memory';
        memory = { chapters: {}, extras: {} };
        raise('noStorage');
        return { state, notice: topNotice() };
      }
      const parsed = parse(text);
      if (parsed.status === 'corrupt') {
        try {
          storage.write(SAVE_BAD_KEY, String(text));
        } catch (e) {
          // rule 16: a failed backup does not stop the boot
        }
        memory = { chapters: {}, extras: {} };
        raise('corrupt');
      } else if (parsed.status === 'newer') {
        memory = { chapters: parsed.record.chapters, extras: parsed.record.extras };
        state = 'readonly';
        raise('newer');
      } else if (parsed.status === 'ok') {
        memory = { chapters: parsed.record.chapters, extras: parsed.record.extras };
      }
      if (state === 'normal' && !probe()) {
        state = 'memory';
        raise('noWrite');
      }
      return { state, notice: topNotice() };
    },

    /**
     * Rules 5, 12, 13 and the duplicate-settle edge case. Synchronous; never throws.
     * @param {{chapterId: string, mode: string, win: boolean, attempt?: number,
     *   loadout?: string[], metrics?: Object}} result the RoundResult (round-flow rule 8)
     * @returns {{stars: number, bestStars: number, isNewBest: boolean,
     *   reasonLine: (string|null), reason: (Object|null), saved: boolean}} SettleOutcome
     */
    settle(result) {
      const key = String(result && result.chapterId) + '#' + String(result && result.attempt);
      if (settled.has(key)) {
        warn('progress-save: settle called twice', { key });
        return settled.get(key);
      }
      let outcome;
      try {
        const scored = computeStars(result, chapterById(result.chapterId));
        const done = persist(result, scored.stars);
        const best = memory.chapters[result.chapterId].stars;
        outcome = {
          stars: scored.stars,
          bestStars: best,
          isNewBest: scored.stars > done.bestBefore,
          reasonLine: formatReason(scored.reason, texts),
          reason: scored.reason,
          saved: done.saved,
        };
      } catch (e) {
        warn('progress-save: settle failed', { error: String(e) });
        outcome = { stars: 0, bestStars: 0, isNewBest: false, reasonLine: null, reason: null, saved: false };
      }
      settled.set(key, outcome);
      return outcome;
    },

    /**
     * Catalog rows in chapter order (rules 7-9): best stars, wins, plays,
     * last loadout and whether the chapter can be opened.
     * @returns {Array<{id: string, mode: string, bestStars: number, wins: number,
     *   plays: number, loadout: (string[]|null), unlocked: boolean}>}
     */
    catalog() {
      const rows = chapterList.map((c) => {
        const rec = memory.chapters[c.id];
        return {
          id: c.id,
          mode: c.mode,
          bestStars: rec ? rec.stars : 0,
          wins: rec ? rec.wins : 0,
          plays: rec ? rec.plays : 0,
          loadout: rec && rec.loadout ? rec.loadout.slice() : null,
          unlocked: true,
        };
      });
      if (unlockMode === 'story') {
        rows.forEach((row, i) => {
          let later = false;
          for (let j = i + 1; j < rows.length; j += 1) if (rows[j].wins > 0) later = true;
          // A chapter with its own wins was playable once and never locks again (rule 9).
          row.unlocked = i === 0 || row.wins > 0 || rows[i - 1].wins > 0 || later;
        });
      }
      return rows;
    },

    /**
     * One chapter's record (copy), or null when it has none.
     * @param {string} chapterId
     * @returns {({stars: number, wins: number, plays: number, loadout?: string[]}|null)}
     */
    record(chapterId) {
      if (knownIds.indexOf(chapterId) === -1) return null;
      const rec = memory.chapters[chapterId];
      return rec ? copyChapter(rec) : null;
    },

    /** @returns {('normal'|'readonly'|'memory')} the storage state (rules 14-17) */
    storageState() {
      return state;
    },

    /**
     * Rule 18: the highest-priority notice not yet shown this page load, marked
     * shown; the rest wait for the next call (next return to the catalog).
     * @returns {({kind: string, text: string}|null)}
     */
    nextNotice() {
      const kind = topNotice();
      if (!kind) return null;
      delete pending[kind];
      shown[kind] = true;
      return { kind, text: texts[kind] };
    },
  };
}
