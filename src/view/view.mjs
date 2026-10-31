// 界面与交互 (design/gdd/ui-interaction.md) per ADR-0003: reads rule queries, plays
// events, never changes rule state (the one exception is round.endingDone(), ADR-0002 section 2).
// Ported from prototypes/hulao-vertical-slice/src/view/view.mjs (copied and adapted, not imported).
// Animations touch transform and opacity only; no CSS filter, no emoji, no network.

import { ROADBLOCK, EFFECT_TARGETS, ENDING_WIN_MS, ENDING_LOSE_MS, RESHUFFLE_SHOW_MS, COMBO_THRESHOLD } from '../core/constants.mjs';
import { comboLabel } from '../rules/clear-effects.mjs';
import { computeLayout, pointCenter, LAYOUT } from './layout.mjs';
import { spriteMarkup } from './sprite.mjs';
import { TILE_ART, PORTRAITS as BASE_PORTRAITS } from './art-assets.mjs';
import { UI_ART } from './ui-assets.mjs';
import { TILE_BASE, WARM_UI, Q_PORTRAITS } from './warm-assets.mjs';
import { BACKGROUNDS } from './bg-assets.mjs';
import { KIND_NAMES, EFFECT_NAMES, UI_TEXT, GENERAL_NAMES, HUD_TEXT, HINT_TEXT, EVENT_TEXT, RESULT_TEXT, PICKER_TEXT, fill } from './strings.mjs';
import { SPECIAL_NAMES } from '../rules/battle-pressure.mjs';
import { skillLine } from '../rules/general-skills.mjs';
import { SHOUT_MS, VIBRATE_MS, PREVIEW_DELAY_MS } from './ui-constants.mjs';
import { vibrate } from '../platform/lifecycle.mjs';

// Q版清爽版 skin pieces (ui-assets.mjs) -> the CSS variables styles.css reads.
const UI_VARS = {
  '--ui-panel': 'panel', '--ui-banner': 'banner', '--ui-btn-primary': 'btnPrimary', '--ui-btn-secondary': 'btnSecondary',
  '--ui-pause': 'pause', '--ui-tile': 'tile', '--ui-tile-sel': 'tileSel', '--ui-bar-empty': 'barEmpty',
  '--ui-bar-full': 'barFull', '--ui-card': 'cardFrame', '--ui-card-ready': 'cardFrameReady',
  '--ui-star-off': 'starOff', '--ui-star-on': 'starOn',
};
// 暖木 skin (warm-assets.mjs): Q版 portraits replace the older ones by id.
const PORTRAITS = Object.assign({}, BASE_PORTRAITS, Q_PORTRAITS);
// General cards: one size for every card, as if the rail held CARD_SLOTS (unscaled px cap).
const CARD_SLOTS = 3;
const CARD_W_MAX = 110;
const SVGNS = 'http://www.w3.org/2000/svg';
const HEART_PATH = 'M20 34 C9 26 4 20 4 13 C4 8 8 5 12 5 C16 5 18 7 20 10 C22 7 24 5 28 5 C32 5 36 8 36 13 C36 20 31 26 20 34 Z';
const STAR_PATH = 'M20 3 L25 15 L38 15 L27.5 23 L31.5 36 L20 28 L8.5 36 L12.5 23 L2 15 L15 15 Z';
const MODE_NAMES = { press: '压阵', food: '粮草', boss: '斗将' };
const LINK_DRAW_MS = 150;
// Gravity press: one fall animation, whatever the distance (styles.css @keyframes fall).
const FALL_MS = 200;
// Stage size used for the catalog, before any chapter is bound.
const CATALOG_GRID = { rows: 8, cols: 5 };
// Card hint after a tap that cannot fire, and the skill result banner (ms).
const HINT_SHOW_MS = 1400;
const RESULT_SHOW_MS = 1100;
// Press countdown warning (ms left) and food warning (food left).
const PRESS_WARN_MS = 3000;
const FOOD_WARN = 3;

function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

function svgIcon(path, attrs) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 40 40');
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', path);
  for (const k of Object.keys(attrs || {})) p.setAttribute(k, attrs[k]);
  s.appendChild(p);
  return s;
}

function useIcon(id, cls) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 40 40');
  if (cls) s.setAttribute('class', cls);
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#' + id);
  s.appendChild(u);
  return s;
}

function generalName(id) {
  return GENERAL_NAMES[id] || id;
}

/** Most buried-card edges drawn under a tile; deeper stacks still say +k on the badge. */
export const STACK_EDGES_MAX = 3;

/**
 * How a tile shows the cards buried under it (board-link depth; 2026-10-30 user
 * feedback: the 「叠」 seal was too big). One thin card edge per buried card
 * peeks out below-right (class `stack` + `edges-1..3`, at most STACK_EDGES_MAX),
 * and a small vermilion "+k" badge sits on the top-right corner. Nothing when
 * the cell holds no buried card.
 * @param {number} depth board.depthAt(r, c): cards buried under the top one
 * @returns {{stack: boolean, edges: number, badge: string}}
 */
export function stackDecor(depth) {
  const k = depth > 0 ? Math.floor(depth) : 0;
  if (!k) return { stack: false, edges: 0, badge: '' };
  return { stack: true, edges: Math.min(k, STACK_EDGES_MAX), badge: fill(UI_TEXT.stackBadge, { n: k }) };
}

/**
 * Size of the "+k" badge in px for a board cell pitch: about 0.23 x 0.2 of the
 * cell, so 14 x 12 at the 60 px pitch and 12 x 11 at the smallest 52 px pitch
 * (about 30% of the old 「叠」 seal's area). The digits stay 10 px either way.
 * @param {number} cell layout cell pitch in px
 * @returns {{w: number, h: number}}
 */
export function stackBadgeSize(cell) {
  return { w: Math.round(cell * 0.233), h: Math.round(cell * 0.205) };
}

/**
 * Words a general-skills hint code (general-skills rule 7) for the card.
 * @param {(Object|null)} hint `{reason, ...}` from skills.cards() / cardHint
 * @returns {string} '' when the card can fire
 */
export function hintText(hint) {
  if (!hint) return '';
  if (hint.reason === 'sealed') return fill(HINT_TEXT.sealed, { left: hint.left });
  if (hint.reason === 'standby') return HINT_TEXT.standby;
  if (hint.reason === 'uncharged') return fill(HINT_TEXT.uncharged, { short: hint.short, kind: KIND_NAMES[hint.kind] || '' });
  if (hint.reason === 'noEffect') return HINT_TEXT.noEffect[hint.why] || '';
  return '';
}

/**
 * Words a skillResult event (general-skills rules 14, 14a).
 * @param {Object} e the event
 * @param {Object<string, string>} specialNames special id -> display name
 * @returns {string}
 */
export function resultText(e, specialNames) {
  if (e.general === 'zhuge_liang') {
    const v = { pairs: e.pairs || 0, kind: KIND_NAMES[e.kind] || '', special: e.special ? specialNames[e.special] || e.special : '' };
    return fill(e.special ? RESULT_TEXT.zhugeBreak : RESULT_TEXT.zhuge, v);
  }
  if (e.general === 'liu_bei') {
    const parts = [];
    if (e.healed > 0) parts.push(fill(RESULT_TEXT.liuHeal, { n: e.healed }));
    if (e.food > 0) parts.push(fill(RESULT_TEXT.liuFood, { n: e.food }));
    if (e.gifted > 0) parts.push(fill(RESULT_TEXT.liuGift, { n: e.gifted }));
    return parts.length ? parts.join(RESULT_TEXT.join) : RESULT_TEXT.liuNone;
  }
  return '';
}

/**
 * The pressure HUD line and warning tier for one hud() snapshot (battle-pressure rule 26).
 * @param {Object} h pressure.hud()
 * @returns {{label: string, tier: number, fill: (number|null)}} `fill` 0..1 for the
 *   press countdown / food bar, null in boss mode (the step pips show instead)
 */
export function hudLine(h) {
  if (h.mode === 'press') {
    let label = fill(h.gravity ? HUD_TEXT.pressFall : HUD_TEXT.press, { s: Math.ceil(h.msToNextPush / 1000), wave: h.wave, waves: h.waves });
    let tier = h.msToNextPush <= PRESS_WARN_MS ? 2 : 1;
    if (h.wave >= h.waves) { label = HUD_TEXT.pressLast; tier = 1; }
    if (h.scareArmed) label = HUD_TEXT.pressScared;
    else if ((h.danger !== undefined ? h.danger : h.bottomOccupied) && h.wave < h.waves) {
      label = h.gravity ? HUD_TEXT.pressDangerTop : HUD_TEXT.pressDanger;
      tier = 3;
    }
    const left = h.interval > 0 ? Math.min(1, Math.max(0, h.msToNextPush / h.interval)) : 0;
    return { label, tier, fill: h.wave >= h.waves ? 0 : 1 - left };
  }
  if (h.mode === 'food') {
    const tier = h.food <= 1 ? 3 : (h.food <= FOOD_WARN ? 2 : 1);
    const label = fill(tier > 1 ? HUD_TEXT.foodLow : HUD_TEXT.food, { n: h.food, max: h.food0 });
    return { label, tier, fill: h.food0 > 0 ? Math.min(1, Math.max(0, h.food / h.food0)) : 0 };
  }
  let label = h.stun > 0 ? fill(HUD_TEXT.bossStun, { n: h.stun }) : fill(HUD_TEXT.bossSteps, { n: h.stepsLeft });
  if (h.forecast && h.forecast.name) label = fill(h.forecast.broken ? HUD_TEXT.forecastBroken : HUD_TEXT.forecast, { name: h.forecast.name });
  if (h.shield) label = HUD_TEXT.shield + ' · ' + label;
  return { label, tier: h.tier || 1, fill: null };
}

/**
 * Creates the page view. It follows the screen controller each frame: the
 * catalog card while no round runs, the round's board, HUD and cards otherwise.
 * @param {HTMLElement} root mount point
 * @param {{texts: Object, chapters: Array<Object>, screen: function(): string,
 *   round: function(): (Object|null), chapter: function(): (Object|null),
 *   catalog: function(): Array<Object>,
 *   enemies?: Object}} deps `texts` is chapter-loader's texts; `catalog` is
 *   progress.catalog() (unlocked, bestStars per chapter)
 * @returns {{stage: HTMLElement, frame: HTMLElement, pauseEl: HTMLElement, cardsEl: HTMLElement,
 *   overlayCards: Object, render: function(number, Array<Object>): void,
 *   applyLayout: function(number, number): void, layout: function(): Object}}
 */
export function createView(root, deps) {
  const texts = deps.texts || {};
  const enemies = deps.enemies || {};
  root.insertAdjacentHTML('beforeend', spriteMarkup());
  for (const name of Object.keys(UI_VARS)) {
    const art = UI_ART[UI_VARS[name]];
    if (art) document.documentElement.style.setProperty(name, 'url("' + art.src + '")');
  }
  for (const key of Object.keys(WARM_UI)) document.documentElement.style.setProperty('--warm-' + key, 'url("' + WARM_UI[key].src + '")');
  for (const k of Object.keys(TILE_BASE)) document.documentElement.style.setProperty('--tb-' + k, 'url("' + TILE_BASE[k] + '")');
  // Scene behind everything: the catalog's 说书场, or the bound chapter's own scene.
  const backdrop = el('div', '', root);
  backdrop.id = 'backdrop';
  let backdropKey = '';
  const stage = el('div', '', root);
  stage.id = 'stage';
  const errorEl = el('div', '', root, UI_TEXT.error);
  errorEl.id = 'error';

  // Static structure: built once; afterwards only text, classes and transforms change (rule 32).
  const top = el('div', '', stage); top.id = 'top';
  const titleEl = el('div', '', top); titleEl.id = 'title';
  const pauseEl = el('div', '', top); pauseEl.id = 'pause-stamp'; el('i', '', pauseEl); el('i', '', pauseEl);
  const plaque = el('div', '', top); plaque.id = 'plaque';
  const pairsEl = el('div', '', top); pairsEl.id = 'pairs';
  const banner = el('div', '', top); banner.id = 'banner';
  const hud = el('div', '', top); hud.id = 'hud';
  const heartsEl = el('div', '', hud); heartsEl.id = 'hearts';
  const chargeBox = el('div', '', hud); chargeBox.id = 'charge-box';
  el('i', '', chargeBox).id = 'hourglass';
  const chargeLabel = el('div', '', chargeBox); chargeLabel.id = 'charge-label';
  const track = el('div', '', chargeBox); track.id = 'charge-track';
  const foe = el('div', '', hud); foe.id = 'foe';
  const foeName = el('div', 'name', foe);
  const foeFace = el('div', 'face', foe);
  const foeHp = el('div', 'hp', foe);
  const foeBar = el('i', '', el('div', 'hpbar', foe));

  const frame = el('div', '', stage); frame.id = 'board-frame';
  const boardEl = el('div', '', frame); boardEl.id = 'board';
  const links = document.createElementNS(SVGNS, 'svg'); links.id = 'links'; frame.appendChild(links);
  const fxLayer = el('div', '', frame); fxLayer.style.position = 'absolute'; fxLayer.style.left = '0'; fxLayer.style.top = '0';
  const dead = el('div', '', stage); dead.id = 'deadzone';
  const cardsEl = el('div', '', stage); cardsEl.id = 'cards';
  const mask = el('div', '', stage); mask.id = 'mask';
  const hero = el('div', '', stage); hero.id = 'hero';
  el('div', 'blot', hero);
  const heroWho = el('div', 'who', hero);

  const cards = {};
  function overlayCard(id) {
    const c = el('div', 'card', stage);
    c.id = 'card-' + id;
    cards[id] = c;
    return c;
  }
  function buttonRow(card, list) {
    const row = el('div', 'btns', card);
    for (const b of list) {
      const btn = el('button', b.primary ? 'primary' : '', row, b.text);
      btn.setAttribute('data-button', b.id);
      if (b.chapter) btn.setAttribute('data-chapter', b.chapter);
      if (b.disabled) btn.disabled = true;
    }
    return row;
  }

  const catalogCard = overlayCard('catalog');
  const openCard = overlayCard('open');
  const winCard = overlayCard('win');
  const loseCard = overlayCard('lose');
  const resumeCard = overlayCard('resume');
  el('p', '', resumeCard, UI_TEXT.resumeLine);
  buttonRow(resumeCard, [{ id: 'resume', text: UI_TEXT.buttons.resume, primary: true }]);
  const pauseCard = overlayCard('pause');
  el('h2', '', pauseCard, UI_TEXT.pause);
  buttonRow(pauseCard, [
    { id: 'resume', text: UI_TEXT.buttons.resume, primary: true },
    { id: 'catalog', text: UI_TEXT.buttons.catalog },
  ]);
  const landCard = overlayCard('landscape');
  el('h2', '', landCard, UI_TEXT.landscape);

  // Per-round state.
  let round = null;
  let board = null;
  let effects = null;
  let pressure = null;
  let chapter = null;
  let layout = null;
  let tiles = [];
  // Gravity press falls from this frame's events, played after the tiles take their new kinds.
  const falls = [];
  let gcards = {};
  let gcardsBuilt = false;
  let selKey = '';
  let selAge = 0;
  let timers = [];
  let banners = 0;
  let tokenShout = null;
  let shout = null;
  let endingLeft = -1;
  let shownOverlay = '';
  let lastHud = {};
  let highlighted = [];
  let screenShown = '';
  let catalogKey = '';
  let viewport = { w: window.innerWidth, h: window.innerHeight };
  let pickerKey = '';
  let qingText = '';
  let attackCells = [];
  let resultLine = '';
  let trackMode = '';
  let trackFill = null;
  let lineKey = '';
  let lineTiles = [];

  function later(ms, fn) {
    timers.push({ left: ms, fn });
  }

  function runTimers(dt) {
    const due = [];
    timers = timers.filter((t) => {
      t.left -= dt;
      if (t.left <= 0) { due.push(t.fn); return false; }
      return true;
    });
    for (const fn of due) fn();
  }

  // ── layout ──
  function applyLayout(width, height) {
    viewport = { w: width, h: height };
    const grid = chapter ? { rows: chapter.rows, cols: chapter.cols } : CATALOG_GRID;
    layout = computeLayout({ width, height, rows: grid.rows, cols: grid.cols });
    const L = layout;
    stage.style.width = L.stageW + 'px';
    stage.style.height = L.stageH + 'px';
    stage.style.transform = 'translateX(-50%) scale(' + L.scale + ')';
    top.style.top = L.topY + 'px';
    top.style.height = L.top + 'px';
    const shift = L.compact ? 0 : 45;
    titleEl.classList.toggle('on', !L.compact && !!chapter);
    titleEl.textContent = chapter ? chapter.no + ' · ' + chapter.title : UI_TEXT.gameTitle;
    for (const n of [pauseEl, plaque, pairsEl]) n.style.top = shift + 'px';
    hud.style.top = 50 + shift + 'px';
    banner.style.top = shift + 'px';
    frame.style.left = L.boardX - LAYOUT.FRAME_SIDE + 'px';
    frame.style.top = L.boardY + 'px';
    frame.style.width = L.boardW + 'px';
    frame.style.height = L.boardH + 'px';
    links.setAttribute('width', L.boardW);
    links.setAttribute('height', L.boardH);
    dead.style.top = L.deadY + 'px';
    cardsEl.style.top = L.cardsY + 'px';
    cardsEl.style.height = L.cards + 'px';
    // Every card has the same size: the rail is split for CARD_SLOTS (or more cards), up to CARD_W_MAX.
    const ids = Object.keys(gcards);
    const n = Math.max(CARD_SLOTS, ids.length);
    const cardW = Math.min(CARD_W_MAX, (L.stageW - 32 - 8 * (n - 1)) / n);
    ids.forEach((id, i) => {
      const c = gcards[id];
      c.root.style.width = cardW + 'px';
      c.root.style.height = (L.cards < 96 ? 76 : 94) + 'px';
      c.root.classList.toggle('lead', i === 0);
    });
    hero.style.top = Math.max(L.topY + L.top - 20, L.boardY + L.boardH / 3 - 150) + 'px';
    placeTiles();
    shownOverlay = ''; // re-place the open card next frame
  }

  function placeTiles() {
    const L = layout;
    const badge = stackBadgeSize(L.cell);
    boardEl.style.setProperty('--badge-w', badge.w + 'px');
    boardEl.style.setProperty('--badge-h', badge.h + 'px');
    for (const t of tiles) {
      const p = pointCenter(L, t.r, t.c);
      t.el.style.left = p.x - L.cell / 2 + 3 + 'px';
      t.el.style.top = p.y - L.cell / 2 + 3 + 'px';
      t.el.style.width = L.cell - 6 + 'px';
      t.el.style.height = L.cell - 6 + 'px';
    }
  }

  // ── binding a round ──
  function bindRound(r) {
    round = r;
    const sys = r ? r.systems() : null;
    board = sys ? sys.board : null;
    effects = sys ? sys.effects : null;
    pressure = sys ? sys.pressure : null;
    chapter = r ? deps.chapter() : null;
    boardEl.textContent = '';
    links.textContent = '';
    fxLayer.textContent = '';
    cardsEl.textContent = '';
    tiles = [];
    gcards = {};
    gcardsBuilt = false;
    timers = []; banners = 0; tokenShout = null; shout = null;
    endingLeft = -1; shownOverlay = ''; lastHud = {}; selKey = ''; selAge = 0;
    highlighted = [];
    pickerKey = ''; qingText = ''; attackCells = []; resultLine = ''; trackMode = ''; trackFill = null;
    lineKey = ''; lineTiles = [];
    banner.className = ''; mask.className = ''; hero.className = '';
    if (!board) return;
    for (let rr = 1; rr <= board.rows; rr++) {
      for (let cc = 1; cc <= board.cols; cc++) {
        // div + img + badge span: 3 nodes per tile (ui-interaction rule 32)
        const n = el('div', 'tile empty', boardEl);
        const img = el('img', '', n);
        img.alt = '';
        img.draggable = false;
        const seal = el('span', 'stack-badge', n);
        tiles.push({ r: rr, c: cc, el: n, img, seal, kind: null, depth: 0 });
      }
    }
    heartsEl.textContent = '';
    track.textContent = '';
    const enemy = chapter && chapter.boss ? enemies[chapter.boss.enemy] : null;
    foeName.textContent = enemy ? enemy.name : (chapter && chapter.foe) || '';
    const face = chapter && chapter.boss ? PORTRAITS[chapter.boss.enemy] : null;
    foeFace.style.backgroundImage = face ? 'url("' + face + '")' : '';
    foeFace.textContent = face ? '' : foeName.textContent.slice(0, 1);
    syncOpenCard();
  }

  function specialNames() {
    const enemy = chapter && chapter.boss ? enemies[chapter.boss.enemy] : null;
    return Object.assign({}, SPECIAL_NAMES, enemy && enemy.specialNames);
  }

  function ruleLine() {
    const line = texts.ruleLine && texts.ruleLine[chapter.mode];
    if (!line) return '';
    const enemy = chapter.boss ? enemies[chapter.boss.enemy] : null;
    return fill(line, {
      interval: chapter.press ? Math.round(chapter.press.interval / 1000) : '',
      steps: chapter.boss ? chapter.boss.steps : '',
      hearts: chapter.boss ? chapter.boss.hearts : '',
      enemy: enemy ? enemy.name : '',
    });
  }

  // The open card with general-loadout's slot picker (rules 9-12): one line per
  // slot (0-based), 换将 / 撤下 on non-lead slots, the choice list under the open slot.
  function syncOpenCard() {
    if (!round || round.state() !== 'open') return;
    const picker = typeof deps.picker === 'function' ? deps.picker() : null;
    const slots = round.slots();
    const expanded = picker ? picker.expanded() : null;
    const key = JSON.stringify([slots, expanded]);
    if (key === pickerKey) return;
    pickerKey = key;
    const editable = !!(picker && picker.showPicker());
    openCard.textContent = '';
    el('h1', '', openCard, chapter.no);
    el('h2', '', openCard, chapter.title);
    el('p', '', openCard, ruleLine());
    const roster = el('div', 'roster', openCard);
    slots.forEach((id, i) => {
      const line = el('div', id ? 'sline' : 'sline empty', roster);
      if (id && PORTRAITS[id]) {
        const face = el('img', 'rface', line);
        face.alt = '';
        face.src = PORTRAITS[id];
      } else el('i', 'rface', line);
      el('b', '', line, id ? generalName(id) : PICKER_TEXT.empty);
      const skill = id ? skillLine(id, chapter.mode, texts) : PICKER_TEXT.emptyLine;
      el('span', 'sk', line, i === 0 ? PICKER_TEXT.lead + ' · ' + (skill || '') : (skill || ''));
      if (editable && i > 0) {
        const tools = el('span', 'stools', line);
        const open = el('button', 'mini', tools, expanded === i ? PICKER_TEXT.fold : (id ? PICKER_TEXT.change : PICKER_TEXT.pick));
        open.setAttribute('data-button', 'slot');
        open.setAttribute('data-slot', String(i));
        if (id) {
          const clr = el('button', 'mini', tools, PICKER_TEXT.clear);
          clr.setAttribute('data-button', 'clear');
          clr.setAttribute('data-slot', String(i));
        }
      }
      if (expanded === i) {
        const list = el('div', 'choices', roster);
        for (const g of picker.choices()) {
          const b = el('button', 'pick', list);
          b.setAttribute('data-button', 'pick');
          b.setAttribute('data-general', g);
          if (PORTRAITS[g]) {
            const f = el('img', '', b);
            f.alt = '';
            f.src = PORTRAITS[g];
          }
          el('span', '', b, generalName(g));
        }
        for (const gray of picker.grayCards()) {
          const b = el('button', 'pick gray', list);
          b.disabled = true;
          el('span', '', b, generalName(gray.general));
          el('small', '', b, PICKER_TEXT.locked);
        }
      }
    });
    if (chapter.newEffect && texts.effectLine) el('p', 'small', openCard, texts.effectLine[chapter.newEffect] || '');
    buttonRow(openCard, [{ id: 'start', text: UI_TEXT.buttons.start, primary: true }]);
    shownOverlay = ''; // re-centre: the card height changed
  }

  function buildCards() {
    const skills = round.systems().skills;
    if (gcardsBuilt || !skills || typeof skills.cards !== 'function') return;
    gcardsBuilt = true;
    for (const card of skills.cards()) {
      const root = el('div', 'gcard', cardsEl);
      root.setAttribute('data-general', card.general);
      if (PORTRAITS[card.general]) {
        const av = el('img', 'avatar', root);
        av.alt = generalName(card.general);
        av.draggable = false;
        av.src = PORTRAITS[card.general];
      }
      const name = el('div', 'gname', root, generalName(card.general));
      const pips = el('div', 'pips', root);
      el('div', 'token', root, '令');
      const hint = el('div', 'hint', root);
      gcards[card.general] = { root, name, pips, hint, key: '' };
    }
    applyLayout(viewport.w, viewport.h);
  }

  // ── catalog ──
  function fillCatalog() {
    const rows = deps.catalog();
    const key = JSON.stringify(rows);
    if (key === catalogKey) return;
    catalogKey = key;
    catalogCard.textContent = '';
    el('h1', '', catalogCard, UI_TEXT.gameTitle);
    el('h2', '', catalogCard, UI_TEXT.catalog);
    const list = el('div', 'catalog-list', catalogCard);
    for (const row of rows) {
      const ch = deps.chapters.find((c) => c.id === row.id);
      if (!ch) continue;
      const btn = el('button', row.unlocked ? 'chapter' : 'chapter locked', list);
      btn.setAttribute('data-button', 'open');
      btn.setAttribute('data-chapter', ch.id);
      if (!row.unlocked) btn.disabled = true;
      el('b', '', btn, ch.no);
      el('span', 'ctitle', btn, ch.title);
      const stars = el('span', 'cstars', btn);
      for (let i = 0; i < 3; i++) el('i', i < row.bestStars ? 'on' : 'off', stars); // star pieces drawn by CSS
      el('span', 'cmode', btn, MODE_NAMES[ch.mode] || '');
      if (!row.unlocked) btn.appendChild(useIcon('s-lock', 'lock'));
    }
  }

  // ── shouts (ui-interaction rule 20) ──
  function showShout(text) {
    shout = { text, left: SHOUT_MS };
  }

  function renderPlaque(dt) {
    if (shout) {
      shout.left -= dt;
      if (shout.left <= 0) shout = null;
    }
    let text = layout && !layout.compact ? '' : chapter ? chapter.no + ' ' + chapter.title : '';
    const sel = round ? round.selecting() : null;
    if (tokenShout) text = tokenShout;
    else if (sel) text = HINT_TEXT.select[sel] || '';
    else if (shout && banners === 0) text = shout.text;
    if (plaque.getAttribute('data-key') !== text) {
      plaque.setAttribute('data-key', text);
      plaque.textContent = '';
      el('span', 'read', plaque, text);
    }
  }

  function showBanner(kind, text, seal) {
    banners++;
    banner.className = 'on ' + kind;
    banner.textContent = '';
    el('span', '', banner, text);
    if (seal) el('span', 'seal', banner, seal);
  }

  function hideBanner() {
    banners = Math.max(0, banners - 1);
    if (banners === 0) banner.className = '';
  }

  // ── event feedback ──
  // The link: a paper halo under an ink (or 朱 on a combo) core, a head running along it, a spark where it lands.
  function drawLink(m) {
    if (!m.path || !m.path.length) return;
    const pts = m.path.map((p) => pointCenter(layout, p.r, p.c));
    const g = document.createElementNS(SVGNS, 'g');
    let cls = 'link';
    if (m.forced) cls += ' forced';
    else if (effects.combo() >= 2) cls += ' red';
    g.setAttribute('class', cls);
    const ptsAttr = pts.map((p) => p.x + ',' + p.y).join(' ');
    for (const part of ['halo', 'core']) {
      const pl = document.createElementNS(SVGNS, 'polyline');
      pl.setAttribute('points', ptsAttr);
      pl.setAttribute('pathLength', '1');
      pl.setAttribute('class', part);
      g.appendChild(pl);
    }
    const head = document.createElementNS(SVGNS, 'circle');
    head.setAttribute('r', '6');
    head.setAttribute('class', 'head');
    head.style.transform = 'translate(' + pts[0].x + 'px, ' + pts[0].y + 'px)';
    g.appendChild(head);
    links.appendChild(g);
    void g.getBoundingClientRect();
    g.setAttribute('class', cls + ' drawn');
    const lens = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
      lens.push(d);
      total += d;
    }
    let at = 0;
    lens.forEach((d, i) => {
      const ms = total ? (LINK_DRAW_MS * d) / total : 0;
      later(at, () => {
        head.style.transition = 'transform ' + Math.round(ms) + 'ms linear';
        head.style.transform = 'translate(' + pts[i + 1].x + 'px, ' + pts[i + 1].y + 'px)';
      });
      at += ms;
    });
    later(LINK_DRAW_MS, () => spark(pts[pts.length - 1], cls.indexOf('red') >= 0 || !!m.forced));
    later(LINK_DRAW_MS + 140, () => g.setAttribute('class', cls + ' drawn erase'));
    later(LINK_DRAW_MS + 380, () => { if (g.parentNode) g.parentNode.removeChild(g); });
  }

  function spark(c, red) {
    const sp = el('div', red ? 'spark red' : 'spark', fxLayer);
    sp.style.left = c.x + 'px';
    sp.style.top = c.y + 'px';
    for (let i = 0; i < 4; i++) el('i', '', sp).style.transform = 'rotate(' + (i * 45 + 22) + 'deg)';
    el('b', '', sp);
    void sp.offsetWidth;
    sp.classList.add('go');
    later(360, () => remove(sp));
  }

  function remove(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
  }

  function burst(p, red) {
    const L = layout;
    const c = pointCenter(L, p.r, p.c);
    for (let i = 0; i < 6; i++) {
      const d = el('div', red ? 'dot red' : 'dot', fxLayer);
      d.style.left = c.x - 4 + 'px';
      d.style.top = c.y - 4 + 'px';
      void d.offsetWidth;
      const a = (Math.PI * 2 * i) / 6 + 0.4;
      const dist = L.cell * (0.55 + (i % 2) * 0.2);
      d.style.transform = 'translate(' + Math.cos(a) * dist + 'px, ' + Math.sin(a) * dist + 'px) scale(0.3)';
      d.style.opacity = '0';
      later(340, () => remove(d));
    }
  }

  // Cleared tiles: a ghost copy pops and fades where the tile was.
  function ghosts(cells) {
    const L = layout;
    cells.slice(0, 16).forEach((p, i) => {
      const t = tileAt(p);
      if (!t || !t.img.src) return;
      const c = pointCenter(L, p.r, p.c);
      const g = el('div', 'ghost', fxLayer);
      const img = el('img', '', g);
      img.src = t.img.src;
      g.style.left = c.x - L.cell / 2 + 3 + 'px';
      g.style.top = c.y - L.cell / 2 + 3 + 'px';
      g.style.width = L.cell - 6 + 'px';
      g.style.height = L.cell - 6 + 'px';
      void g.offsetWidth;
      g.classList.add('pop');
      later(60 + Math.min(i, 12) * 18, () => {
        g.classList.add('fly');
        g.style.transform = 'translateY(' + -L.cell * 0.6 + 'px) scale(0.4)';
        g.style.opacity = '0';
      });
      later(520, () => remove(g));
    });
  }

  function showCombo(m) {
    const n = effects.combo();
    if (n < 2) return;
    const L = layout;
    const p = pointCenter(L, m.b.r, m.b.c);
    const above = m.b.r === 1 ? p.y + L.cell : p.y - L.cell;
    const x = Math.min(Math.max(p.x, 70), L.boardW - 70);
    const c = el('div', n >= COMBO_THRESHOLD ? 'combo big' : 'combo', fxLayer, comboLabel(n));
    c.style.left = x + 'px';
    c.style.top = above - 22 + 'px';
    c.style.setProperty('--grow', String(1 + Math.min(n - 2, 8) * 0.06));
    later(900, () => remove(c));
  }

  // Each moved tile slides down from where it was (transform only, ui-interaction rule 32).
  function playFalls() {
    for (const m of falls) {
      const t = tileAt(m.to);
      if (!t) continue;
      t.el.style.setProperty('--fall', -(m.to.r - m.from.r) * layout.cell + 'px');
      t.el.classList.remove('fall');
      void t.el.offsetWidth;
      t.el.classList.add('fall');
      later(FALL_MS, () => t.el.classList.remove('fall'));
    }
    falls.length = 0;
  }

  function tileAt(p) {
    for (const t of tiles) if (t.r === p.r && t.c === p.c) return t;
    return null;
  }

  function shake(p) {
    const t = tileAt(p);
    if (!t) return;
    t.el.classList.remove('shake');
    void t.el.offsetWidth;
    t.el.classList.add('shake');
    later(200, () => t.el.classList.remove('shake'));
  }

  function drawTicks(cells) {
    const L = layout;
    for (const p of cells) {
      const c = pointCenter(L, p.r, p.c);
      const d = el('div', 'tick', fxLayer);
      d.style.left = c.x - L.cell / 2 + 'px';
      d.style.top = c.y - L.cell / 2 + 'px';
      d.style.width = L.cell + 'px';
      d.style.height = L.cell + 'px';
      const s = document.createElementNS(SVGNS, 'svg');
      s.setAttribute('viewBox', '0 0 40 40');
      const u = document.createElementNS(SVGNS, 'use');
      u.setAttribute('href', '#s-tick');
      s.appendChild(u);
      d.appendChild(s);
      later(520, () => remove(d));
    }
  }

  function setHighlight(cells) {
    for (const t of highlighted) t.el.classList.remove('hl');
    highlighted = (cells || []).map(tileAt).filter(Boolean);
    for (const t of highlighted) t.el.classList.add('hl');
  }

  function quake() {
    frame.classList.remove('quake');
    void frame.offsetWidth;
    frame.classList.add('quake');
    later(500, () => frame.classList.remove('quake'));
  }

  function onTokenStart(e) {
    const d = e.detail || {};
    if (e.reason === 'effect') {
      showBanner('paper', EFFECT_NAMES[d.kind] || '');
      setHighlight(d.cells);
    } else if (e.reason === 'skill') {
      mask.className = 'skill';
      const face = d.general ? PORTRAITS[d.general] : null;
      heroWho.style.backgroundImage = face ? 'url("' + face + '")' : '';
      heroWho.textContent = face ? '' : generalName(d.general || '').slice(-1);
      hero.className = '';
      void hero.offsetWidth;
      hero.className = 'on';
      later(800, () => { hero.className = ''; if (mask.className === 'skill') mask.className = ''; });
      const line = d.general && chapter ? skillLine(d.general, chapter.mode, texts) : '';
      showBanner('ink', line || generalName(d.general || ''), generalName(d.general || ''));
      setHighlight(d.cells);
    } else if (e.reason === 'hostAttack' || e.reason === 'phase') {
      // The attack / phase event comes first and carries the words (battle-pressure rule 23).
      showBanner('qing', qingText || EVENT_TEXT.attack);
      setHighlight(attackCells);
      quake();
      vibrate(VIBRATE_MS.rage);
    } else if (e.reason === 'reshuffle') {
      tokenShout = UI_TEXT.reshuffle;
      boardEl.classList.add('out');
      later(RESHUFFLE_SHOW_MS * 0.55, () => boardEl.classList.remove('out'));
    }
  }

  function onTokenEnd(e) {
    const d = e.detail || {};
    if (e.reason === 'effect') {
      setHighlight([]);
      hideBanner();
    } else if (e.reason === 'skill') {
      setHighlight([]);
      mask.className = '';
      hero.className = '';
      if (d.cells && d.cells.length) drawTicks(d.cells);
      hideBanner();
      if (resultLine) {
        showBanner('paper', resultLine);
        resultLine = '';
        later(RESULT_SHOW_MS, hideBanner);
      }
    } else if (e.reason === 'hostAttack' || e.reason === 'phase') {
      setHighlight([]);
      qingText = '';
      attackCells = [];
      hideBanner();
    } else if (e.reason === 'reshuffle') {
      tokenShout = null;
      boardEl.classList.remove('out');
    }
  }

  // Win ending: the remaining tiles burst outward from the centre in waves of 4.
  function shatter() {
    const L = layout;
    const cx = L.boardW / 2;
    const cy = L.boardH / 2;
    const left = tiles.filter((t) => t.kind);
    left.forEach((t, i) => {
      const c = pointCenter(L, t.r, t.c);
      const dx = c.x - cx;
      const dy = c.y - cy;
      const n = Math.sqrt(dx * dx + dy * dy) || 1;
      later(Math.floor(i / 4) * 70, () => {
        t.el.classList.add('smashed');
        t.el.style.transform = 'translate(' + (dx / n) * L.cell * 1.6 + 'px, ' + (dy / n) * L.cell * 1.6 + 'px) rotate(' + (i % 2 ? 40 : -40) + 'deg) scale(0.3)';
      });
    });
    vibrate(VIBRATE_MS.shatter);
  }

  function onState(e) {
    if (e.to === 'end') {
      const res = round.result();
      const win = !!(res && res.win);
      endingLeft = win ? ENDING_WIN_MS : ENDING_LOSE_MS;
      if (win) { shatter(); fillWinCard(); } else fillLoseCard();
    }
    if (e.to === 'settle') {
      const card = round.overlay() === 'win' ? winCard : loseCard;
      const old = card.querySelector('.btns');
      if (old) remove(old);
      const list = round.exits().map((id, i) => ({ id, text: UI_TEXT.buttons[id] || id, primary: i === 0 }));
      buttonRow(card, list);
      shownOverlay = ''; // re-centre with the buttons
    }
  }

  function fillWinCard() {
    const out = round.settleOutcome() || { stars: 0 };
    const res = round.result();
    winCard.textContent = '';
    const stamp = el('div', 'stamp', winCard, UI_TEXT.win);
    const stars = el('div', 'stars', winCard);
    const starEls = [];
    for (let i = 0; i < 3; i++) {
      const span = el('span', i < out.stars ? 'on' : 'off', stars);
      span.appendChild(svgIcon(STAR_PATH, {}));
      starEls.push(span);
    }
    if (out.reasonLine) el('p', '', winCard, out.reasonLine);
    const secs = Math.round(res.gameTimeMs / 1000);
    el('p', 'small', winCard, fill(UI_TEXT.timeLine, { m: Math.floor(secs / 60), s: secs % 60, combo: res.maxCombo }));
    if (out.saved === false) el('p', 'small', winCard, UI_TEXT.notSaved);
    const next = chapter.next;
    const preview = next && texts.previewNext ? fill(texts.previewNext, { title: next.title }) : texts.previewLast;
    if (preview) el('p', 'small', winCard, preview);
    later(60, () => stamp.classList.add('go'));
    starEls.forEach((s, i) => later(420 + i * 220, () => s.classList.add('go')));
  }

  function fillLoseCard() {
    const res = round.result();
    loseCard.textContent = '';
    const stamp = el('div', 'stamp lose', loseCard, UI_TEXT.lose);
    el('h2', '', loseCard, res.reason || '');
    const hint = texts.failHint ? texts.failHint[res.reason] : '';
    const enemy = chapter.boss ? enemies[chapter.boss.enemy] : null;
    if (hint) el('p', '', loseCard, fill(hint, { COMBO_THRESHOLD, enemy: enemy ? enemy.name : '' }));
    const secs = Math.round(res.gameTimeMs / 1000);
    el('p', 'small', loseCard, fill(UI_TEXT.timeLine, { m: Math.floor(secs / 60), s: secs % 60, combo: res.maxCombo }));
    later(60, () => stamp.classList.add('go'));
  }

  function heartPulse(i, cls) {
    const s = heartsEl.children[i];
    if (!s) return;
    s.classList.remove(cls);
    void s.getBoundingClientRect();
    s.classList.add(cls);
    later(500, () => s.classList.remove(cls));
  }

  function pulse(node, cls, ms) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    later(ms, () => node.classList.remove(cls));
  }

  function handle(e) {
    switch (e.type) {
      case 'match':
        if (chapter && chapter.mode === 'boss') pulse(foe, 'hit', 260);
        drawLink(e);
        burst(e.a, e.forced || effects.combo() >= 2);
        later(LINK_DRAW_MS, () => burst(e.b, e.forced || effects.combo() >= 2));
        showCombo(e);
        break;
      case 'clear': if (e.cells) ghosts(e.cells); break;
      case 'miss': shake(e.a); shake(e.b); break;
      case 'targetGone': showShout(fill(UI_TEXT.targetGone, { kind: KIND_NAMES[e.kind] || '' })); break;
      case 'push':
        quake();
        if (e.cells) for (const p of e.cells) falls.push({ from: { r: 0, c: p.c }, to: p });
        break;
      case 'fall': for (const m of e.moves) falls.push(m); break;
      case 'hostAttack':
        if (e.kind === 'normal') { qingText = e.line || EVENT_TEXT.attack; heartPulse(e.heart, 'hit'); }
        else if (e.kind === 'special') qingText = e.name || EVENT_TEXT.attack;
        else if (e.kind === 'blocked') qingText = EVENT_TEXT.blocked;
        else if (e.kind === 'broken') qingText = fill(EVENT_TEXT.broken, { name: e.name || '' });
        attackCells = e.cells || [];
        break;
      case 'bossPhase':
        qingText = e.shout || fill(EVENT_TEXT.phase2, { name: e.name || foeName.textContent });
        attackCells = e.cells || [];
        break;
      case 'heal': heartPulse(e.heart, 'heal'); showShout(EVENT_TEXT.heal); break;
      case 'foodRefill': pulse(chargeBox, 'up', 500); showShout(fill(EVENT_TEXT.foodRefill, { n: e.amount })); break;
      case 'foodSpent': pulse(chargeBox, 'down', 300); break;
      case 'comboPushback': pulse(chargeBox, 'up', 500); showShout(fill(EVENT_TEXT.comboPushback, { n: e.cut })); break;
      case 'scared': showShout(EVENT_TEXT.scared); break;
      case 'lastWave': showShout(EVENT_TEXT.lastWave); break;
      case 'seal': flashCard(e.general, 'hit', 500); showShout(fill(EVENT_TEXT.seal, { general: generalName(e.general), left: e.left })); break;
      case 'unseal': showShout(fill(EVENT_TEXT.unseal, { general: generalName(e.general) })); break;
      case 'skillReady': flashCard(e.general, 'ping', 600); break;
      case 'skillArmed': showShout(EVENT_TEXT.armed); break;
      case 'cardHint': {
        const g = gcards[e.general];
        if (g) { g.hint.textContent = hintText(e); flashCard(e.general, 'hinting', HINT_SHOW_MS); flashCard(e.general, 'shake', 200); }
        break;
      }
      case 'gift': for (const id of e.generals || []) flashCard(id, 'ping', 600); break;
      case 'skillResult': resultLine = resultText(e, specialNames()); break;
      case 'tokenStart': onTokenStart(e); break;
      case 'tokenEnd': onTokenEnd(e); break;
      case 'state': onState(e); break;
      default: break;
    }
  }

  // ── per-frame sync from queries ──
  function syncTiles() {
    const sel = board.selection();
    const key = sel ? sel.r + ',' + sel.c : '';
    if (key !== selKey) { selKey = key; selAge = 0; }
    for (const t of tiles) {
      const k = board.get(t.r, t.c) || null;
      const depth = k ? board.depthAt(t.r, t.c) : 0;
      // A buried tile turning face up (the cell got shallower) pops in where the cleared one was.
      if (k && depth < t.depth) {
        t.el.classList.remove('reveal');
        void t.el.offsetWidth;
        t.el.classList.add('reveal');
        later(360, () => t.el.classList.remove('reveal'));
      }
      if (depth !== t.depth) {
        t.depth = depth;
        const decor = stackDecor(depth);
        t.el.classList.toggle('stack', decor.stack);
        for (let i = 1; i <= STACK_EDGES_MAX; i++) t.el.classList.toggle('edges-' + i, decor.edges === i);
        t.seal.textContent = decor.badge;
      }
      if (k !== t.kind) {
        t.kind = k;
        if (k) {
          const art = k === ROADBLOCK ? null : TILE_ART[k];
          if (art) t.img.src = art;
          t.img.style.visibility = art ? '' : 'hidden';
          t.el.setAttribute('data-ch', art ? '' : KIND_NAMES[k] || '');
          t.el.classList.remove('smashed');
          t.el.style.transform = '';
        }
        t.el.setAttribute('data-k', k || '');
        t.el.classList.toggle('empty', !k);
        t.el.classList.toggle('block', k === ROADBLOCK);
        const target = k ? EFFECT_TARGETS[k] : null;
        t.el.classList.toggle('fx', !!target);
        if (target) t.el.setAttribute('data-seal', KIND_NAMES[target]);
      }
      if (t.el.classList.contains('fx')) t.el.classList.toggle('notarget', board.count(EFFECT_TARGETS[k]) === 0);
      t.el.classList.toggle('sel', !!(sel && sel.r === t.r && sel.c === t.c));
    }
  }

  // Effect preview (ui-interaction): a selected 火/马/水 marks its targets after PREVIEW_DELAY_MS.
  function syncPreview() {
    const sel = board.selection();
    const k = sel ? board.get(sel.r, sel.c) : null;
    const target = k ? EFFECT_TARGETS[k] : null;
    const show = !!(target && selAge >= PREVIEW_DELAY_MS && !round.boardLocked());
    for (const t of tiles) t.el.classList.toggle('pv', show && t.kind === target);
  }

  function syncHud() {
    const h = pressure && typeof pressure.hud === 'function' ? pressure.hud() : null;
    hud.style.display = h ? '' : 'none';
    const pairs = board.pairsLeft();
    if (pairs !== lastHud.pairs) pairsEl.textContent = fill(UI_TEXT.pairsLeft, { n: pairs });
    if (!h) { lastHud = { pairs }; return; }
    const heartsMax = h.heartsMax || 0;
    if (heartsMax !== heartsEl.children.length) {
      heartsEl.textContent = '';
      for (let i = 0; i < heartsMax; i++) heartsEl.appendChild(svgIcon(HEART_PATH, { fill: '#b33a22', stroke: '#b33a22', 'stroke-width': '2' }));
    }
    if (h.hearts !== lastHud.hearts) Array.prototype.forEach.call(heartsEl.children, (s, i) => s.classList.toggle('lost', i >= h.hearts));
    const line = hudLine(h);
    // The track: one pip per boss step, or one bar for the press countdown / food.
    const mode = h.mode === 'boss' ? 'boss:' + h.stepsMax : 'bar';
    if (mode !== trackMode) {
      trackMode = mode;
      track.textContent = '';
      trackFill = null;
      if (h.mode === 'boss') for (let i = 0; i < h.stepsMax; i++) el('i', '', track);
      else { trackFill = el('div', '', track); trackFill.id = 'charge-fill'; }
      lastHud.steps = -1;
      lastHud.fill = -1;
      chargeBox.classList.toggle('pips', h.mode === 'boss');
      hud.classList.toggle('wide', h.mode !== 'boss');
    }
    if (h.mode === 'boss' && h.steps !== lastHud.steps) Array.prototype.forEach.call(track.children, (d, i) => d.classList.toggle('on', i < h.steps));
    if (trackFill && line.fill !== lastHud.fill) trackFill.style.transform = 'scaleX(' + line.fill + ')';
    if (line.label !== lastHud.label) chargeLabel.textContent = line.label;
    const isBoss = h.mode === 'boss';
    foe.style.display = isBoss ? '' : 'none';
    if (isBoss && (h.hp !== lastHud.hp || h.phase !== lastHud.phase)) {
      foeHp.textContent = (h.phases > 1 && h.phase > 1 ? HUD_TEXT.phase2 + ' · ' : '') + fill(HUD_TEXT.hp, { hp: h.hp, max: h.hpMax });
      foeBar.style.transform = 'scaleX(' + (h.hpMax ? h.hp / h.hpMax : 0) + ')';
    }
    const tier = line.tier;
    if (tier !== lastHud.tier) {
      chargeBox.classList.toggle('t2', tier === 2);
      chargeBox.classList.toggle('t3', tier === 3);
      foe.classList.toggle('t2', isBoss && tier === 2);
      foe.classList.toggle('t3', isBoss && tier === 3);
    }
    lastHud = { hearts: h.hearts, steps: h.steps, hp: h.hp, phase: h.phase, pairs, label: line.label, tier, fill: line.fill };
  }

  // Row / column select (round-flow rule 5a): mark every tile on a selectable line.
  function syncLines() {
    const sel = round.selecting();
    const skills = round.systems().skills;
    let key = '';
    const want = [];
    if (sel && skills) {
      for (const t of tiles) {
        const ok = sel === 'row' ? skills.rowSelectable(t.r) : skills.colSelectable(t.c);
        if (ok) want.push(t);
      }
      key = sel + want.map((t) => t.r + ',' + t.c).join(';');
    }
    if (key === lineKey) return;
    lineKey = key;
    for (const t of lineTiles) t.el.classList.remove('line');
    lineTiles = want;
    for (const t of lineTiles) t.el.classList.add('line');
  }

  function syncCards() {
    const skills = round.systems().skills;
    if (!skills || typeof skills.cards !== 'function') return;
    if (!gcardsBuilt) buildCards();
    for (const c of skills.cards()) {
      const g = gcards[c.general];
      if (!g) continue;
      const key = c.state + ':' + c.charge + ':' + (c.sealed || 0) + ':' + (c.hint ? JSON.stringify(c.hint) : '');
      if (key === g.key) continue;
      g.key = key;
      g.root.classList.toggle('ready', c.state === 'ready' || c.state === 'select');
      g.root.classList.toggle('sealed', c.state === 'sealed');
      g.root.classList.toggle('armed', c.state === 'select');
      g.root.classList.toggle('show', c.state === 'show');
      g.root.classList.toggle('standby', c.state === 'standby');
      g.root.classList.toggle('noeffect', c.state === 'ready' && !!c.hint);
      g.name.textContent = c.state === 'sealed' ? fill(HINT_TEXT.sealed, { left: c.sealed }) : generalName(c.general);
      // Charge row: the kind's icon, then gold segments; a ready card says so instead.
      g.pips.textContent = '';
      if (TILE_ART[c.kind]) {
        const icon = el('img', 'kind', g.pips);
        icon.alt = KIND_NAMES[c.kind] || '';
        icon.src = TILE_ART[c.kind];
      } else el('span', 'kind', g.pips, KIND_NAMES[c.kind] || '');
      if (c.state === 'ready') el('span', 'go', g.pips, HUD_TEXT.cardReady);
      else for (let i = 0; i < c.need; i++) el('b', i < c.charge ? 'on' : '', g.pips);
      g.hint.textContent = c.state === 'select' ? HINT_TEXT.select[round.selecting()] || '' : hintText(c.hint);
      g.root.classList.toggle('hinting', c.state === 'select' || c.state === 'standby' || c.state === 'sealed');
    }
  }

  // A brief class on one general card (cardHint, skillReady, gift).
  function flashCard(general, cls, ms) {
    const g = gcards[general];
    if (!g) return;
    g.root.classList.remove(cls);
    void g.root.offsetWidth;
    g.root.classList.add(cls);
    later(ms, () => g.root.classList.remove(cls));
  }

  function showCard(want) {
    if (want === shownOverlay) return;
    shownOverlay = want;
    for (const id of Object.keys(cards)) cards[id].classList.toggle('on', id === want);
    const shown = cards[want];
    if (shown && layout) {
      const h = shown.offsetHeight;
      shown.style.top = Math.max(8, Math.min(layout.boardY + 24, (layout.stageH - h) / 2)) + 'px';
    }
  }

  function syncOverlay() {
    const ov = round.overlay();
    const st = round.state();
    let want = ov || 'none';
    if (want === 'win' && st === 'end' && endingLeft > ENDING_WIN_MS / 2) want = 'none'; // let the tiles burst first
    showCard(want);
    if (want === 'open' || want === 'resume' || want === 'pause' || want === 'landscape') mask.className = 'dim';
    else if (want === 'win') mask.className = 'win';
    else if (want === 'lose' || (st === 'end' && !ov)) mask.className = 'lose';
    else if (mask.className === 'dim' || mask.className === 'win' || mask.className === 'lose') mask.className = '';
  }

  // Shows the catalog, a round or the error page, following the screen controller.
  function followScreen() {
    const screen = deps.screen();
    const r = screen === 'round' ? deps.round() : null;
    if (screen !== screenShown || r !== round) {
      screenShown = screen;
      errorEl.style.display = screen === 'error' ? 'flex' : 'none';
      if (r !== round) {
        bindRound(r);
        applyLayout(viewport.w, viewport.h);
      }
      const inRound = !!r;
      const sceneKey = inRound && chapter && BACKGROUNDS[chapter.id] ? chapter.id : 'catalog';
      if (sceneKey !== backdropKey) {
        backdropKey = sceneKey;
        backdrop.style.backgroundImage = 'url("' + BACKGROUNDS[sceneKey] + '")';
      }
      frame.style.visibility = inRound ? '' : 'hidden';
      top.style.visibility = inRound ? '' : 'hidden';
      cardsEl.style.visibility = inRound ? '' : 'hidden';
      if (!inRound) {
        catalogKey = '';
        mask.className = 'dim';
      }
    }
    if (screen === 'catalog') {
      fillCatalog();
      showCard('catalog');
    }
  }

  /**
   * One frame: follow the screen, play this frame's events in order, then sync from queries.
   * @param {number} dtReal real ms since the previous frame
   * @param {Array<Object>} events drained from the round this frame
   */
  function render(dtReal, events) {
    const dt = dtReal < 0 || dtReal > 1000 ? 0 : dtReal;
    if (round && round === deps.round()) for (const e of events) handle(e);
    followScreen();
    if (!round || !board) return;
    runTimers(dt);
    selAge += dt;
    syncTiles();
    playFalls();
    syncPreview();
    syncHud();
    syncLines();
    syncCards();
    syncOpenCard();
    syncOverlay();
    renderPlaque(dt);
    if (endingLeft >= 0 && round.state() === 'end') {
      endingLeft -= dt;
      if (endingLeft <= 0) {
        endingLeft = -1;
        round.endingDone();
      }
    }
  }

  applyLayout(viewport.w, viewport.h);

  return {
    stage,
    frame,
    pauseEl,
    cardsEl,
    overlayCards: cards,
    render,
    applyLayout,
    /** @returns {Object} the current layout (input maps taps through it) */
    layout() { return layout; },
  };
}
