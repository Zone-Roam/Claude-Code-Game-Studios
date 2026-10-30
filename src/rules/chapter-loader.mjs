// Chapter loader (design/gdd/chapter-design.md rules 6-9 and 14; TR-chapter-design-001,
// -004, -006). Validates every chapter once at start-up: refuse / warn-only lists,
// resolves defaults (cols, pool, boss.hp, phase2.specials, need) and applies the
// `slow` multipliers. Data in, data out: no page, clock, storage or text formatting.
import { UNIT_KINDS, ROADBLOCK, EFFECT_TARGETS, STACK_DEPTH } from '../core/constants.mjs';
import { deckValid } from './board-link.mjs';

/**
 * General table used by the loader (general-skills rule 1): charge kind and default
 * `need`. `data.generals` may replace it. Owned by general-skills; mirrored here
 * until the main session consolidates constants.
 */
export const CHAPTER_GENERALS = Object.freeze({
  guan_yu: { kind: 'dao', need: 2 },
  zhang_fei: { kind: 'gu', need: 3 },
  zhao_yun: { kind: 'dun', need: 3 },
  zhuge_liang: { kind: 'shu', need: 4 },
  liu_bei: { kind: 'qi', need: 3 },
  huang_zhong: { kind: 'gong', need: 3 },
});
/** Chapter modes (rule 2). */
export const CHAPTER_MODES = Object.freeze(['press', 'food', 'boss']);
/** Legal boss special ids and the default phase-2 rotation (battle-pressure SPECIALS). */
export const SPECIAL_IDS = Object.freeze(['sweep', 'charge', 'roar', 'chain']);
export const DEFAULT_SPECIALS = Object.freeze(['sweep', 'charge', 'roar']);
/** Known fail reasons (rule 7). */
export const FAIL_REASONS = Object.freeze(['破城', '粮草断绝', '城破']);
/**
 * Parameter ranges: `legal` refuses, `safe` only warns (battle-pressure variable
 * tables and Tuning Knobs; chapter-design rule 6).
 */
export const CHAPTER_RANGES = Object.freeze({
  'press.startRows': { legal: [3, 5], safe: [3, 5] },
  'press.waves': { legal: [4, 16], safe: [6, 12] },
  'press.interval': { legal: [4000, 12000], safe: [6000, 12000] },
  'food.slack': { legal: [0, 6], safe: [1, 4] },
  'boss.steps': { legal: [3, 20], safe: [5, 12] },
  'boss.hearts': { legal: [1, 5], safe: [2, 4] },
  'boss.addPairs': { legal: [0, 4], safe: [1, 3] },
  'boss.phase2.hp': { legal: [1, 60], safe: [1, 60] },
  'boss.phase2.steps': { legal: [3, 20], safe: [4, 10] },
});
/** Press rows must be 8; non-press 6-8 (rule 6). */
export const PRESS_ROWS = 8;
export const CHAPTER_ROWS = Object.freeze([6, 8]);
export const SLOTS_RANGE = Object.freeze([1, 3]);
export const NEED_RANGE = Object.freeze([1, 4]);
/** Safe range for `stars` foodT3 / missT2 overrides (progress-save rule 3). */
export const STARS_FOOD_SAFE = Object.freeze([0, 6]);
/** Display length limits (rule 7; art bible section 7). */
export const TITLE_MAX_CHARS = 12;
export const LINE_MAX_CHARS = 8;
export const SPECIAL_NAME_MAX_CHARS = 4;
/** `slow=1` multipliers (rule 14): press interval x1.3, every boss phase's steps x1.5, rounded. */
export const SLOW_INTERVAL_FACTOR = 1.3;
export const SLOW_STEPS_FACTOR = 1.5;

const isInt = Number.isInteger;
const inRange = (v, r) => isInt(v) && v >= r[0] && v <= r[1];
const chars = (s) => Array.from(String(s)).length;
const has = (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/**
 * The `need` of one general in one chapter (rule 9): a chapter integer applies to
 * everyone; an object entry overrides that general; otherwise the general's default.
 * @param {{need: (number|Object<string, number>|undefined)}} chapter
 * @param {string} generalId
 * @param {Object<string, {kind: string, need: number}>} [generals] defaults to CHAPTER_GENERALS
 * @returns {number|undefined} undefined for an unknown general with no override
 * @example resolveNeed({}, 'huang_zhong') // 3
 */
export function resolveNeed(chapter, generalId, generals) {
  const table = generals || CHAPTER_GENERALS;
  const need = chapter.need;
  if (isInt(need)) return need;
  if (isObj(need) && isInt(need[generalId])) return need[generalId];
  return has(table, generalId) ? table[generalId].need : undefined;
}

/**
 * Checks a `stars` override's shape (progress-save rule 3, chapter-design rule 8).
 * @returns {string|null} a reason when the shape is wrong, else null
 */
function starsProblem(mode, stars) {
  if (!isObj(stars)) return 'not an object';
  const nonNeg = (v) => isInt(v) && v >= 0;
  if (mode === 'food') {
    for (const key of Object.keys(stars)) if (key !== 'foodT3' && key !== 'missT2') return 'unknown key ' + key;
    if (has(stars, 'foodT3') && !nonNeg(stars.foodT3)) return 'foodT3 not a non-negative integer';
    if (has(stars, 'missT2') && !nonNeg(stars.missT2)) return 'missT2 not a non-negative integer';
    return null;
  }
  for (const key of Object.keys(stars)) if (key !== 't3' && key !== 't2') return 'unknown key ' + key;
  if (!nonNeg(stars.t3) || !nonNeg(stars.t2)) return 't3 and t2 must be non-negative integers';
  if (stars.t3 > stars.t2) return 't3 looser than t2';
  return null;
}

/** Validates one enemy table entry's specialNames (rule 6) and lengths (rule 7). */
function checkEnemy(id, enemy, reject, warn) {
  if (!isObj(enemy)) { reject('enemies.' + id, 'enemy entry is not an object'); return; }
  if (enemy.specialNames !== undefined) {
    if (!isObj(enemy.specialNames)) reject('enemies.' + id + '.specialNames', 'not an object');
    else {
      for (const key of Object.keys(enemy.specialNames)) {
        if (SPECIAL_IDS.indexOf(key) === -1) reject('enemies.' + id + '.specialNames', 'unknown special id ' + key);
        else if (chars(enemy.specialNames[key]) > SPECIAL_NAME_MAX_CHARS) {
          warn('enemies.' + id + '.specialNames', key + ' display name over ' + SPECIAL_NAME_MAX_CHARS + ' chars');
        }
      }
    }
  }
  (Array.isArray(enemy.lines) ? enemy.lines : []).forEach((line) => {
    if (chars(line) > LINE_MAX_CHARS) warn('enemies.' + id + '.lines', 'line over ' + LINE_MAX_CHARS + ' chars: ' + line);
  });
}

/**
 * Loads the chapter data file (chapter-design rules 6-9, 14).
 * Refused chapters leave the list; warnings keep the chapter. A broken `stars`
 * override is dropped (default thresholds); in a dev build it is reported in
 * `errors`, in a release build in `log`. The caller prints `rejected`/`warnings`/
 * `errors` to the console in dev, and logs them in release.
 * @param {{chapters: Array<Object>, enemies: Object, texts: Object, starters: Array<string>,
 *   generals: (Object|undefined)}} data the shape of CHAPTER_DATA in src/data/chapters.mjs
 * @param {{dev: (boolean|undefined), slow: (boolean|undefined)}} [flags] build and URL flags
 *   (`readUrlFlags`); `slow` scales press interval x1.3 and boss steps x1.5 after validation
 * @returns {{chapters: Array<Object>, enemies: Object, texts: Object, starters: Array<string>,
 *   generals: Object, rejected: Array<{id: string, field: string, reason: string}>,
 *   warnings: Array<{id: string, field: string, reason: string}>,
 *   errors: Array<{id: string, field: string, reason: string}>,
 *   log: Array<{id: string, field: string, reason: string}>, allRejected: boolean}}
 *   loaded chapters are deep copies in data order with defaults filled, `needs`
 *   ({generalId: need} for every known general) and `next` ({id, title} of the next
 *   loadable chapter, or null on the last one)
 * @example const book = loadChapters(CHAPTER_DATA, { dev: true, slow: false });
 */
export function loadChapters(data, flags) {
  const opts = flags || {};
  const generals = data.generals || CHAPTER_GENERALS;
  const enemies = data.enemies || {};
  const rejected = [];
  const warnings = [];
  const errors = [];
  const log = [];
  const isGeneral = (g) => typeof g === 'string' && has(generals, g);

  // Global tables: enemies (specialNames, line lengths) and starters.
  const badEnemies = {};
  for (const id of Object.keys(enemies)) {
    checkEnemy(id, enemies[id],
      (field, reason) => { badEnemies[id] = true; rejected.push({ id: 'enemies', field, reason }); },
      (field, reason) => warnings.push({ id: 'enemies', field, reason }));
  }
  const starters = [];
  (Array.isArray(data.starters) ? data.starters : []).forEach((g) => {
    if (isGeneral(g)) starters.push(g);
    else rejected.push({ id: 'starters', field: 'starters', reason: 'unknown general ' + g });
  });

  const seenIds = {};
  const seenUnlocks = {};
  const loaded = [];
  (Array.isArray(data.chapters) ? data.chapters : []).forEach((source, index) => {
    const ch = clone(source) || {};
    const id = typeof ch.id === 'string' && ch.id !== '' ? ch.id : '#' + index;
    let refused = false;
    const reject = (field, reason) => { refused = true; rejected.push({ id, field, reason }); };
    const warn = (field, reason) => warnings.push({ id, field, reason });
    const range = (key, value) => {
      const r = CHAPTER_RANGES[key];
      if (!inRange(value, r.legal)) reject(key, 'outside ' + r.legal[0] + '-' + r.legal[1] + ': ' + value);
      else if (!inRange(value, r.safe)) warn(key, 'outside safe range ' + r.safe[0] + '-' + r.safe[1] + ': ' + value);
    };

    // Identity.
    if (id.charAt(0) === '#') reject('id', 'missing id');
    else if (seenIds[id]) reject('id', 'duplicate id');
    if (typeof ch.no !== 'string' || ch.no === '') reject('no', 'missing');
    if (typeof ch.title !== 'string' || ch.title === '') reject('title', 'missing');
    else if (chars(ch.title) > TITLE_MAX_CHARS) warn('title', 'over ' + TITLE_MAX_CHARS + ' chars');
    const mode = ch.mode;
    if (CHAPTER_MODES.indexOf(mode) === -1) reject('mode', 'unknown mode ' + mode);

    // Board size.
    if (ch.cols === undefined) ch.cols = 6;
    const sizeOk = [];
    if (ch.cols !== 5 && ch.cols !== 6) reject('cols', 'cols must be 5 or 6: ' + ch.cols);
    else sizeOk.push('cols');
    if (!inRange(ch.rows, CHAPTER_ROWS)) reject('rows', 'rows outside 6-8: ' + ch.rows);
    else if (mode === 'press' && ch.rows !== PRESS_ROWS) reject('rows', 'press rows must be ' + PRESS_ROWS);
    else sizeOk.push('rows');

    // Deck: kinds and parity first so the message names the kind, then deck_valid.
    let deckSum = 0;
    let deckKindsOk = isObj(ch.deck);
    if (!deckKindsOk) reject('deck', 'missing');
    else {
      for (const kind of Object.keys(ch.deck)) {
        const n = ch.deck[kind];
        if (UNIT_KINDS.indexOf(kind) === -1) { deckKindsOk = false; reject('deck.' + kind, 'unknown unit kind'); }
        else if (!isInt(n) || n < 0 || n % 2 !== 0) { deckKindsOk = false; reject('deck.' + kind, 'odd or invalid count: ' + n); }
        else deckSum += n;
      }
    }
    const inDeck = (kind) => deckKindsOk && isInt(ch.deck[kind]) && ch.deck[kind] > 0;

    // Mode parameters.
    if (mode === 'press') {
      const p = ch.press;
      if (!isObj(p)) reject('press', 'missing');
      else {
        range('press.startRows', p.startRows);
        range('press.waves', p.waves);
        range('press.interval', p.interval);
        if (p.waveList !== undefined) checkWaveList(p, ch.cols, reject);
      }
    } else if (mode === 'food') {
      if (!isObj(ch.food)) reject('food', 'missing');
      else range('food.slack', ch.food.slack);
    } else if (mode === 'boss') {
      const b = ch.boss;
      if (!isObj(b)) reject('boss', 'missing');
      else {
        if (!has(enemies, b.enemy)) reject('boss.enemy', 'not in enemies: ' + b.enemy);
        else if (badEnemies[b.enemy]) reject('boss.enemy', 'enemy ' + b.enemy + ' has invalid specialNames');
        range('boss.steps', b.steps);
        range('boss.hearts', b.hearts);
        range('boss.addPairs', b.addPairs);
        if (b.hp !== undefined && !inRange(b.hp, [1, Math.floor(deckSum / 2)])) reject('boss.hp', 'outside 1-' + deckSum / 2 + ': ' + b.hp);
        if (b.phase2 !== undefined) {
          const p2 = b.phase2;
          if (!isObj(p2)) reject('boss.phase2', 'not an object');
          else {
            range('boss.phase2.hp', p2.hp);
            range('boss.phase2.steps', p2.steps);
            if (p2.specials !== undefined) {
              if (!Array.isArray(p2.specials) || p2.specials.length === 0) reject('phase2.specials', 'empty list');
              else p2.specials.forEach((s) => { if (SPECIAL_IDS.indexOf(s) === -1) reject('phase2.specials', 'unknown special id ' + s); });
            }
            (Array.isArray(p2.lines) ? p2.lines : []).forEach((line) => {
              if (chars(line) > LINE_MAX_CHARS) warn('boss.phase2.lines', 'line over ' + LINE_MAX_CHARS + ' chars: ' + line);
            });
          }
        }
      }
    }

    // deck_valid (board-link) once the sizes and kinds are known to be sane.
    if (deckKindsOk && sizeOk.length === 2 && CHAPTER_MODES.indexOf(mode) !== -1) {
      const startRows = mode === 'press' && isObj(ch.press) ? ch.press.startRows : undefined;
      if (!deckValid(ch.deck, { cols: ch.cols, rows: ch.rows, mode, startRows })) {
        const cells = ch.cols * ch.rows;
        reject('deck', mode === 'press'
          ? 'press deck must be startRows x cols = ' + ch.cols * startRows + ', got ' + deckSum
          : 'deck must be ' + cells + '-' + cells * (1 + STACK_DEPTH) + ' blocks, got ' + deckSum);
      }
    }

    // Pool.
    if (ch.pool !== undefined) {
      if (!isObj(ch.pool) || Object.keys(ch.pool).length === 0) reject('pool', 'empty');
      else {
        for (const kind of Object.keys(ch.pool)) {
          if (UNIT_KINDS.indexOf(kind) === -1) reject('pool', 'unknown unit kind ' + kind);
          else if (!isInt(ch.pool[kind]) || ch.pool[kind] < 1) reject('pool', 'weight not a positive integer: ' + kind);
        }
      }
    }

    // Generals: slots, lead, recommend, unlock, need.
    if (!inRange(ch.slots, SLOTS_RANGE)) reject('slots', 'outside 1-3: ' + ch.slots);
    if (!isGeneral(ch.lead)) reject('lead', 'missing or unknown general ' + ch.lead);
    else if (deckKindsOk && !inDeck(generals[ch.lead].kind)) reject('lead', 'lead charge kind ' + generals[ch.lead].kind + ' not in deck');
    if (!Array.isArray(ch.recommend)) reject('recommend', 'missing');
    else {
      if (ch.recommend.length !== ch.slots) reject('recommend', 'length ' + ch.recommend.length + ' != slots ' + ch.slots);
      if (ch.recommend[0] !== ch.lead) reject('recommend', 'first entry is not the lead');
      const seen = {};
      ch.recommend.forEach((g) => {
        if (!isGeneral(g)) reject('recommend', 'unknown general ' + g);
        else if (seen[g]) reject('recommend', 'duplicate general ' + g);
        seen[g] = true;
      });
    }
    if (ch.unlock !== undefined && !isGeneral(ch.unlock)) reject('unlock', 'unknown general ' + ch.unlock);
    if (ch.need !== undefined) {
      if (isInt(ch.need)) { if (!inRange(ch.need, NEED_RANGE)) reject('need', 'outside 1-4: ' + ch.need); }
      else if (isObj(ch.need)) {
        for (const g of Object.keys(ch.need)) {
          if (!isGeneral(g)) reject('need', 'unknown general ' + g);
          else if (!inRange(ch.need[g], NEED_RANGE)) reject('need', g + ' outside 1-4: ' + ch.need[g]);
        }
      } else reject('need', 'not an integer or object');
    }

    if (refused) return;
    seenIds[id] = true;

    // Warn-only checks (rule 7).
    ch.recommend.forEach((g) => {
      const kind = generals[g].kind;
      const pairs = (ch.deck[kind] || 0) / 2;
      const need = resolveNeed(ch, g, generals);
      if (pairs === 0) warn('recommend', g + ': charge kind ' + kind + ' not in deck (skipped when filling slots)');
      else if (pairs < need) warn('recommend', g + ': ' + pairs + ' pairs of ' + kind + ' < need ' + need);
    });
    if (ch.unlock !== undefined) {
      if (starters.indexOf(ch.unlock) !== -1) warn('unlock', ch.unlock + ' is already a starter');
      if (seenUnlocks[ch.unlock]) warn('unlock', ch.unlock + ' also unlocked by ' + seenUnlocks[ch.unlock]);
      else seenUnlocks[ch.unlock] = id;
    }
    for (const effect of Object.keys(EFFECT_TARGETS)) {
      if (inDeck(effect) && !inDeck(EFFECT_TARGETS[effect])) warn('deck', effect + ' without its target ' + EFFECT_TARGETS[effect]);
    }
    if (ch.newEffect !== undefined && ch.newEffect !== null && !inDeck(ch.newEffect)) {
      warn('newEffect', ch.newEffect + ' not in deck (rule line hidden)');
      ch.newEffect = null;
    }
    (Array.isArray(ch.enemyLines) ? ch.enemyLines : []).forEach((line) => {
      if (chars(line) > LINE_MAX_CHARS) warn('enemyLines', 'line over ' + LINE_MAX_CHARS + ' chars: ' + line);
    });
    if (ch.failHint !== undefined) {
      if (!isObj(ch.failHint)) { warn('failHint', 'not an object'); delete ch.failHint; }
      else {
        for (const key of Object.keys(ch.failHint)) {
          if (FAIL_REASONS.indexOf(key) === -1) { warn('failHint', 'unknown fail reason ' + key); delete ch.failHint[key]; }
        }
      }
    }
    if (ch.stars !== undefined) {
      const problem = starsProblem(mode, ch.stars);
      if (problem) {
        (opts.dev ? errors : log).push({ id, field: 'stars', reason: problem + '; default thresholds used' });
        delete ch.stars;
      } else if (mode === 'food') {
        ['foodT3', 'missT2'].forEach((key) => {
          if (has(ch.stars, key) && !inRange(ch.stars[key], STARS_FOOD_SAFE)) warn('stars.' + key, 'outside safe range 0-6: ' + ch.stars[key]);
        });
      }
    }

    // Defaults (rules 2, 9; Edge Cases).
    if (ch.pool === undefined) {
      ch.pool = {};
      for (const kind of UNIT_KINDS) if (ch.deck[kind] > 0) ch.pool[kind] = ch.deck[kind] / 2;
    }
    if (mode === 'boss') {
      if (ch.boss.hp === undefined) ch.boss.hp = deckSum / 2;
      if (ch.boss.phase2 && ch.boss.phase2.specials === undefined) ch.boss.phase2.specials = DEFAULT_SPECIALS.slice();
    }
    ch.needs = {};
    for (const g of Object.keys(generals)) ch.needs[g] = resolveNeed(ch, g, generals);

    // slow=1 (rule 14): applied after validation, never re-checked (Edge Cases).
    if (opts.slow) {
      if (mode === 'press') ch.press.interval = Math.round(ch.press.interval * SLOW_INTERVAL_FACTOR);
      if (mode === 'boss') {
        ch.boss.steps = Math.round(ch.boss.steps * SLOW_STEPS_FACTOR);
        if (ch.boss.phase2) ch.boss.phase2.steps = Math.round(ch.boss.phase2.steps * SLOW_STEPS_FACTOR);
      }
    }
    loaded.push(ch);
  });

  // "Next" follows the loadable list only (rule 9).
  loaded.forEach((ch, i) => {
    const next = loaded[i + 1];
    ch.next = next ? { id: next.id, title: next.title } : null;
  });

  return {
    chapters: loaded, enemies: clone(enemies), texts: clone(data.texts || {}), starters, generals,
    rejected, warnings, errors, log, allRejected: loaded.length === 0,
  };
}

/** Validates press.waveList (rule 6): length, width, ids, soldier count, per-kind parity. */
function checkWaveList(press, cols, reject) {
  const list = press.waveList;
  if (!Array.isArray(list) || list.length !== press.waves) {
    reject('press.waveList', 'length must equal press.waves');
    return;
  }
  const soldiers = 2 * Math.floor(cols / 2);
  list.forEach((wave, w) => {
    const at = 'wave ' + (w + 1) + ': ';
    if (!Array.isArray(wave) || wave.length !== cols) { reject('press.waveList', at + 'must have ' + cols + ' entries'); return; }
    const counts = {};
    let n = 0;
    for (const cell of wave) {
      if (cell === null || cell === ROADBLOCK) continue;
      if (UNIT_KINDS.indexOf(cell) === -1) { reject('press.waveList', at + 'unknown id ' + cell); return; }
      counts[cell] = (counts[cell] || 0) + 1;
      n += 1;
    }
    if (n !== soldiers) { reject('press.waveList', at + n + ' units, needs ' + soldiers); return; }
    for (const kind of Object.keys(counts)) {
      if (counts[kind] % 2 !== 0) { reject('press.waveList', at + 'odd count of ' + kind); return; }
    }
  });
}
