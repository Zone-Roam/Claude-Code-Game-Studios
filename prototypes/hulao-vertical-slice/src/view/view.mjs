// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// 界面与交互 (design/gdd/ui-interaction.md) per ADR-0003: reads queries, plays events, never
// changes rule state (the one exception is round.endingDone(), ADR-0002 §2).

import {
  KIND_NAMES, GENERALS, EFFECTS, SHOUT_MS, UNREADY_HINT_MS, TIER_MIN_DWELL_MS,
  ENDING_WIN_MS, ENDING_LOSE_MS, RESHUFFLE_SHOW_MS, COMBO_THRESHOLD,
} from '../core/constants.mjs';
import { computeLayout, pointCenter } from './layout.mjs';
import { spriteMarkup } from './sprite.mjs';
import { fillText } from '../rules/chapter-loader.mjs';
import { TILE_ART, PORTRAITS } from './art-assets.mjs';
import { UI_ART } from './ui-assets.mjs';

const UI_VARS = {
  '--ui-panel': 'panel', '--ui-plaque': 'plaque', '--ui-beam': 'beam', '--ui-btn-primary': 'btnPrimary',
  '--ui-btn-secondary': 'btnSecondary', '--ui-seal': 'seal', '--ui-card': 'cardFrame',
  '--ui-card-ready': 'cardFrameReady', '--ui-foe-frame': 'foeFrame',
};

const SVGNS = 'http://www.w3.org/2000/svg';
const COMBO_WORDS = ['', '', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const HEART_PATH = 'M20 34 C9 26 4 20 4 13 C4 8 8 5 12 5 C16 5 18 7 20 10 C22 7 24 5 28 5 C32 5 36 8 36 13 C36 20 31 26 20 34 Z';
// Slice experiment (user 2026-10-27): the win ending shatters the enemy portrait; the card shows after it.
const SMASH_CARD_AT = 1500;
const SHARDS = 10;
const STAR_PATH = 'M20 3 L25 15 L38 15 L27.5 23 L31.5 36 L20 28 L8.5 36 L12.5 23 L2 15 L15 15 Z';

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

/**
 * @param {HTMLElement} root mount point
 * @param {{chapter: object, texts: object}} deps
 * @returns {object} view API
 */
export function createView(root, deps) {
  const { texts } = deps;
  root.insertAdjacentHTML('beforeend', spriteMarkup());
  for (const name of Object.keys(UI_VARS)) {
    document.documentElement.style.setProperty(name, `url("${UI_ART[UI_VARS[name]].src}")`);
  }
  const stage = el('div', '', root);
  stage.id = 'stage';
  const errorEl = el('div', '', root, '戏本出错，请稍后再来');
  errorEl.id = 'error';

  // ── static structure: built once, only text, classes and transforms change afterwards (R7) ──
  const top = el('div', '', stage); top.id = 'top';
  const titleEl = el('div', '', top); titleEl.id = 'title';
  const pauseEl = el('div', '', top); pauseEl.id = 'pause-stamp'; el('i', '', pauseEl); el('i', '', pauseEl);
  const plaque = el('div', '', top); plaque.id = 'plaque';
  const pairsEl = el('div', '', top); pairsEl.id = 'pairs';
  const banner = el('div', '', top); banner.id = 'banner';
  const hud = el('div', '', top); hud.id = 'hud';
  const heartsEl = el('div', '', hud); heartsEl.id = 'hearts';
  const chargeBox = el('div', '', hud); chargeBox.id = 'charge-box';
  const chargeLabel = el('div', '', chargeBox, '吕布蓄力'); chargeLabel.id = 'charge-label';
  const track = el('div', '', chargeBox); track.id = 'charge-track';
  // slice v5: the bar is a row of step dots (built per stepsMax in syncHud)
  const slash = el('div', '', chargeBox); slash.id = 'slash';
  const shieldEl = el('div', '', hud, '盾'); shieldEl.id = 'shield';
  const foe = el('div', '', hud); foe.id = 'foe';
  const foeName = el('div', 'name', foe);
  const foeFace = el('div', 'face', foe);
  const foeHp = el('div', 'hp', foe);
  const foeBar = el('i', '', el('div', 'hpbar', foe));
  const stunEl = el('div', '', hud); stunEl.id = 'stun';

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
  // win ending: a big enemy portrait that cracks and shatters (static clip-path shards, transform/opacity only)
  const smash = el('div', '', stage); smash.id = 'smash';
  const shardEls = [];
  const crack = document.createElementNS(SVGNS, 'svg');
  crack.setAttribute('viewBox', '0 0 100 100');
  crack.setAttribute('class', 'crack');
  for (let i = 0; i < SHARDS; i++) {
    const a0 = (Math.PI * 2 * i) / SHARDS + (i % 3) * 0.12;
    const a1 = (Math.PI * 2 * (i + 1)) / SHARDS + ((i + 1) % 3) * 0.12;
    const cx = 46;
    const cy = 42;
    const p0 = [cx + Math.cos(a0) * 80, cy + Math.sin(a0) * 80];
    const p1 = [cx + Math.cos(a1) * 80, cy + Math.sin(a1) * 80];
    const sh = el('div', 'shard', smash);
    sh.style.clipPath = `polygon(${cx}% ${cy}%, ${p0[0].toFixed(1)}% ${p0[1].toFixed(1)}%, ${p1[0].toFixed(1)}% ${p1[1].toFixed(1)}%)`;
    const mid = (a0 + a1) / 2;
    shardEls.push({ el: sh, dx: Math.cos(mid), dy: Math.sin(mid), spin: (i % 2 ? 1 : -1) * (20 + (i % 4) * 12) });
    const line = document.createElementNS(SVGNS, 'polyline');
    const kink = [cx + Math.cos(a0 + 0.15) * 22, cy + Math.sin(a0 + 0.15) * 22];
    line.setAttribute('points', `${cx},${cy} ${kink[0].toFixed(1)},${kink[1].toFixed(1)} ${(cx + Math.cos(a0) * 60).toFixed(1)},${(cy + Math.sin(a0) * 60).toFixed(1)}`);
    line.setAttribute('pathLength', '1');
    crack.appendChild(line);
  }
  smash.appendChild(crack);
  const flash = el('div', '', stage); flash.id = 'flash';

  const cards = {};
  function overlayCard(id) {
    const c = el('div', 'card', stage);
    c.id = 'card-' + id;
    cards[id] = c;
    return c;
  }
  function buttons(card, list) {
    const row = el('div', 'btns', card);
    for (const b of list) {
      const btn = el('button', b.primary ? 'primary' : '', row, b.text);
      btn.setAttribute('data-button', b.id);
    }
    return row;
  }

  const openCard = overlayCard('open');
  const winCard = overlayCard('win');
  const loseCard = overlayCard('lose');
  const resumeCard = overlayCard('resume');
  el('p', '', resumeCard, '刚才切出去了，局面原样未动。');
  buttons(resumeCard, [{ id: 'resume', text: '接着讲', primary: true }]);
  const pauseCard = overlayCard('pause');
  el('h2', '', pauseCard, '暂停');
  buttons(pauseCard, [{ id: 'resume', text: '接着讲', primary: true }, { id: 'restart', text: '从头讲' }]);
  const landCard = overlayCard('landscape');
  el('h2', '', landCard, '请竖着拿手机');

  // ── per-round state ──
  let round = null;
  let board = null;
  let effects = null;
  let pressure = null;
  let skills = null;
  let chapter = null;
  let layout = null;
  let tiles = [];
  let gcards = {};
  let lastVersion = -1;
  let selKey = '';
  let selAge = 0;
  let timers = [];
  let banners = 0;
  let tokenShout = null;
  let shout = null;
  let queued = null;
  let tierShown = 1;
  let tierAge = 0;
  let endingLeft = -1;
  let shownOverlay = 'none';
  let lastHud = {};
  let highlighted = [];
  let foeFaceSrc = '';

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
    if (!chapter) return;
    layout = computeLayout({ width, height, rows: chapter.rows, cols: chapter.cols });
    const L = layout;
    stage.style.width = L.stageW + 'px';
    stage.style.height = L.stageH + 'px';
    stage.style.transform = `translateX(-50%) scale(${L.scale})`;
    top.style.top = L.topY + 'px';
    top.style.height = L.top + 'px';
    // Full top band (160) gives the 回目匾 its own row; compact (115) folds it into the shout slot.
    const shift = L.compact ? 0 : 45;
    titleEl.classList.toggle('on', !L.compact);
    titleEl.textContent = chapter.no + ' · ' + chapter.title;
    for (const n of [pauseEl, plaque, pairsEl]) n.style.top = shift + 'px';
    hud.style.top = 50 + shift + 'px';
    frame.style.left = L.boardX - 6 + 'px';
    frame.style.top = L.boardY + 'px';
    frame.style.width = L.boardW + 'px';
    frame.style.height = L.boardH + 'px';
    links.setAttribute('width', L.boardW);
    links.setAttribute('height', L.boardH);
    dead.style.top = L.deadY + 'px';
    cardsEl.style.top = L.cardsY + 'px';
    cardsEl.style.height = L.cards + 'px';
    const cardW = Math.max(72, Math.min(83, (L.stageW - 32 - 24) / 4));
    for (const id of Object.keys(gcards)) {
      gcards[id].root.style.width = cardW + 'px';
      gcards[id].root.style.height = (L.cards < 96 ? 76 : 94) + 'px';
    }
    const third = L.boardY + L.boardH / 3;
    hero.style.top = Math.max(L.topY + L.top - 20, third - 150) + 'px';
    for (const c of Object.values(cards)) c.style.top = L.boardY + 24 + 'px';
    banner.style.top = (L.compact ? 0 : 45) + 'px';
    placeTiles();
  }

  function placeTiles() {
    const L = layout;
    for (const t of tiles) {
      const p = pointCenter(L, t.r, t.c);
      t.el.style.left = p.x - L.cell / 2 + 3 + 'px';
      t.el.style.top = p.y - L.cell / 2 + 3 + 'px';
      t.el.style.width = L.cell - 6 + 'px';
      t.el.style.height = L.cell - 6 + 'px';
    }
  }

  // ── binding a round ──
  function bindRound(r, ch) {
    round = r;
    chapter = ch;
    const sys = r.systems();
    board = sys.board; effects = sys.effects; pressure = sys.pressure; skills = sys.skills;
    boardEl.textContent = '';
    links.textContent = '';
    fxLayer.textContent = '';
    tiles = [];
    for (let rr = 1; rr <= board.rows; rr++) {
      for (let cc = 1; cc <= board.cols; cc++) {
        // div + img: 2 nodes per tile (ui-interaction rule 32)
        const n = el('div', 'tile empty', boardEl);
        const img = el('img', '', n);
        img.alt = '';
        img.draggable = false;
        tiles.push({ r: rr, c: cc, el: n, img, kind: null });
      }
    }
    cardsEl.textContent = '';
    gcards = {};
    for (const card of skills.cards()) {
      const g = GENERALS.find((x) => x.id === card.id);
      const root = el('div', 'gcard', cardsEl);
      root.setAttribute('data-general', card.id);
      const av = el('img', 'avatar', root);
      av.alt = g.name;
      av.draggable = false;
      av.src = PORTRAITS[card.id];
      const name = el('div', 'gname', root, g.name);
      const pips = el('div', 'pips', root);
      el('div', 'token', root, '令');
      const hint = el('div', 'hint', root);
      gcards[card.id] = { root, name, pips, hint, g, key: '' };
    }
    heartsEl.textContent = '';
    for (let i = 0; i < chapter.boss.hearts; i++) {
      heartsEl.appendChild(svgIcon(HEART_PATH, { fill: '#b33a22', stroke: '#b33a22', 'stroke-width': '2' }));
    }
    foeName.textContent = chapter.enemyName;
    foe.classList.remove('rage');
    chargeLabel.textContent = chapter.enemyName + '蓄力';
    setFoeFace(PORTRAITS[chapter.boss.enemy]);
    fillOpenCard();
    timers = []; banners = 0; tokenShout = null; shout = null; queued = null;
    tierShown = 1; tierAge = 0; endingLeft = -1; shownOverlay = 'none'; lastHud = {}; lastVersion = -1;
    highlighted = []; selKey = '';
    banner.className = ''; mask.className = ''; hero.className = ''; smash.className = ''; flash.className = '';
    for (const c of Object.values(cards)) c.classList.remove('on');
    applyLayout(window.innerWidth, window.innerHeight);
  }

  function fillOpenCard() {
    openCard.textContent = '';
    el('h1', '', openCard, chapter.no);
    el('h2', '', openCard, chapter.title);
    el('p', '', openCard, fillText(texts.ruleLine.boss, { hearts: chapter.boss.hearts }));
    const roster = el('div', 'roster', openCard);
    for (const id of chapter.generals) {
      const g = GENERALS.find((x) => x.id === id);
      const line = el('div', '', roster);
      const face = el('img', 'rface', line);
      face.alt = '';
      face.src = PORTRAITS[id];
      el('b', '', line, g.name);
      line.appendChild(document.createTextNode(`消${KIND_NAMES[g.kind]}蓄力 · ${texts.skillLine[id].boss}`));
    }
    if (chapter.newEffect) el('p', 'small', openCard, texts.effectLine[chapter.newEffect]);
    el('p', 'small', openCard, '敌将：' + chapter.enemyName);
    buttons(openCard, [{ id: 'start', text: '开讲', primary: true }]);
  }

  // ── shouts (ui-interaction rule 20) ──
  function showShout(text, cls, tag) {
    const s = { text, cls: cls || 'read', left: SHOUT_MS, tag: tag || null };
    if (banners > 0 || tokenShout) queued = s;
    else shout = s;
  }

  function retractShout(tag) {
    if (shout && shout.tag === tag) shout = null;
    if (queued && queued.tag === tag) queued = null;
  }

  function tokenBoundStart() {
    shout = null;
  }

  function tokenBoundEnd() {
    if (banners === 0 && !tokenShout && queued) {
      shout = queued;
      shout.left = SHOUT_MS;
      queued = null;
    }
  }

  function renderPlaque(dt) {
    if (shout) {
      shout.left -= dt;
      if (shout.left <= 0) shout = null;
    }
    let text = layout && !layout.compact ? '' : chapter.no + ' ' + chapter.title;
    let cls = '';
    if (tokenShout) { text = tokenShout; cls = 'read'; }
    else if (shout) { text = shout.text; cls = shout.cls; }
    const key = cls + '|' + text;
    if (plaque.dataset.key !== key) {
      plaque.dataset.key = key;
      plaque.textContent = '';
      el('span', cls, plaque, text);
    }
  }

  function showBanner(kind, text, seal) {
    banners++;
    tokenBoundStart();
    banner.className = 'on ' + kind;
    banner.textContent = '';
    el('span', '', banner, text);
    if (seal) el('span', 'seal', banner, seal);
  }

  function hideBanner() {
    banners = Math.max(0, banners - 1);
    if (banners === 0) banner.className = '';
    tokenBoundEnd();
  }

  // ── event handling ──
  // The link: a paper halo under an ink (or 朱) core, drawn from the first tile to the second with a
  // bright head running along it, a spark where it lands, then erased from the start (≤ 6 at once, art bible §8).
  const LINK_DRAW_MS = 150;
  function drawLink(m) {
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
    head.style.transform = `translate(${pts[0].x}px, ${pts[0].y}px)`;
    g.appendChild(head);
    links.appendChild(g);
    void g.getBoundingClientRect();
    g.setAttribute('class', cls + ' drawn');
    // the head follows the corners, each leg timed by its share of the length
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
        head.style.transition = `transform ${Math.round(ms)}ms linear`;
        head.style.transform = `translate(${pts[i + 1].x}px, ${pts[i + 1].y}px)`;
      });
      at += ms;
    });
    later(LINK_DRAW_MS, () => spark(pts[pts.length - 1], cls.indexOf('red') >= 0 || !!m.forced));
    later(LINK_DRAW_MS + 140, () => g.setAttribute('class', cls + ' drawn erase'));
    later(LINK_DRAW_MS + 380, () => g.remove());
  }

  function spark(c, red) {
    const sp = el('div', red ? 'spark red' : 'spark', fxLayer);
    sp.style.left = c.x + 'px';
    sp.style.top = c.y + 'px';
    for (let i = 0; i < 4; i++) el('i', '', sp).style.transform = `rotate(${i * 45 + 22}deg)`;
    el('b', '', sp);
    void sp.offsetWidth;
    sp.classList.add('go');
    later(360, () => sp.remove());
  }

  // ── match juice: tiles pop, ink bursts, the tiles fly into the enemy, the enemy takes the hit ──
  function foeTarget() {
    const L = layout;
    const fr = frame.getBoundingClientRect();
    const r = foe.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - fr.left) / L.scale - 6, y: (r.top + r.height / 2 - fr.top) / L.scale };
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
      d.style.transform = `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist}px) scale(0.3)`;
      d.style.opacity = '0';
      later(340, () => d.remove());
    }
  }

  function flyToFoe(cells, delay) {
    const L = layout;
    const target = foeTarget();
    cells.forEach((p, i) => {
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
      later(70 + (delay || 0) + Math.min(i, 12) * 18, () => {
        g.classList.add('fly');
        g.style.transform = `translate(${target.x - c.x}px, ${target.y - c.y}px) scale(0.25) rotate(${i % 2 ? 25 : -25}deg)`;
        g.style.opacity = '0.15';
      });
      later(520 + (delay || 0) + Math.min(i, 12) * 18, () => g.remove());
    });
  }

  function hitFoe(amount, at) {
    later(at, () => {
      foe.classList.remove('hit');
      void foe.offsetWidth;
      foe.classList.add('hit');
      const d = el('div', 'dmg', top, '−' + amount);
      d.style.top = (parseFloat(hud.style.top) || 50) - 6 + 'px';
      void d.offsetWidth;
      d.classList.add('go');
      later(700, () => d.remove());
    });
  }

  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not available in this host */ }
  }

  function juiceMatch(m) {
    const red = m.forced || effects.combo() >= 2;
    burst(m.a, red);
    later(LINK_DRAW_MS, () => burst(m.b, red));
    flyToFoe([m.a, m.b], 0);
    hitFoe(1, 430);
    buzz(effects.combo() >= 3 ? 18 : 10);
  }

  function juiceClear(c) {
    if (c.source !== 'effect' && c.source !== 'skill') return;
    flyToFoe(c.cells.slice(0, 12), 40);
    hitFoe(c.pairs, 520);
    buzz(24);
  }

  function showCombo(m) {
    const n = effects.combo();
    if (n < 2) return;
    const at = m.b;
    const L = layout;
    const p = pointCenter(L, at.r, at.c);
    const above = at.r === 1 ? p.y + L.cell : p.y - L.cell;
    const x = Math.min(Math.max(p.x, 70), L.boardW - 70);
    const label = n <= 12 ? COMBO_WORDS[n] + '连斩' : '连斩不断';
    const c = el('div', n >= COMBO_THRESHOLD ? 'combo big' : 'combo', fxLayer, label);
    c.style.left = x + 'px';
    c.style.top = above - 22 + 'px';
    // grows with the combo, capped so it never covers more than a couple of tiles
    c.style.setProperty('--grow', String(1 + Math.min(n - 2, 8) * 0.06));
    later(900, () => c.remove());
  }

  function tileAt(p) {
    return tiles.find((t) => t.r === p.r && t.c === p.c) || null;
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
      later(520, () => d.remove());
    }
  }

  function setHighlight(cells) {
    for (const t of highlighted) t.el.classList.remove('hl');
    highlighted = (cells || []).map(tileAt).filter(Boolean);
    for (const t of highlighted) t.el.classList.add('hl');
  }

  function onTokenStart(e) {
    if (e.reason === 'effect') {
      showBanner('paper', e.detail.name);
      setHighlight(e.detail.cells);
    } else if (e.reason === 'skill') {
      const d = e.detail;
      mask.className = 'skill';
      heroWho.style.backgroundImage = PORTRAITS[d.general] ? `url("${PORTRAITS[d.general]}")` : '';
      heroWho.textContent = PORTRAITS[d.general] ? '' : d.name.slice(-1);
      hero.className = '';
      void hero.offsetWidth;
      hero.className = 'on';
      // art bible §7 skill timeline: the mask starts fading out at 800 ms
      later(800, () => { hero.className = ''; if (mask.className === 'skill') mask.className = ''; });
      showBanner('ink', d.line, d.skill);
      setHighlight(d.cells);
    } else if (e.reason === 'hostAttack') {
      showBanner('qing', e.detail.text);
    } else if (e.reason === 'phase') {
      // slice experiment: 吕布暴怒 — the enraged portrait over a 青 blot, the board shakes as reinforcements land
      mask.className = 'skill';
      heroWho.style.backgroundImage = foeFaceSrc ? `url("${foeFaceSrc}")` : '';
      heroWho.textContent = '';
      hero.className = 'foe';
      void hero.offsetWidth;
      hero.className = 'foe on';
      later(1100, () => { hero.className = 'foe'; if (mask.className === 'skill') mask.className = ''; });
      showBanner('qing', e.detail.text || '敌将暴怒');
      frame.classList.remove('quake');
      void frame.offsetWidth;
      frame.classList.add('quake');
      later(500, () => frame.classList.remove('quake'));
      buzz(60);
    } else if (e.reason === 'reshuffle') {
      tokenBoundStart();
      tokenShout = '重新布阵';
      boardEl.classList.add('out');
      later(RESHUFFLE_SHOW_MS * 0.55, () => boardEl.classList.remove('out'));
    }
  }

  function onTokenEnd(e) {
    if (e.reason === 'effect') {
      setHighlight([]);
      hideBanner();
    } else if (e.reason === 'skill') {
      setHighlight([]);
      mask.className = '';
      hero.className = '';
      if (e.detail.cells && e.detail.cells.length) drawTicks(e.detail.cells);
      hideBanner();
    } else if (e.reason === 'hostAttack') {
      hideBanner();
    } else if (e.reason === 'phase') {
      mask.className = '';
      hero.className = '';
      hideBanner();
    } else if (e.reason === 'reshuffle') {
      tokenShout = null;
      boardEl.classList.remove('out');
      tokenBoundEnd();
    }
  }

  function flipHint(id, text) {
    const g = gcards[id];
    if (!g) return;
    g.hint.textContent = text;
    g.root.classList.add('hinting');
    g.hintLeft = UNREADY_HINT_MS;
  }

  // slice v5: a small number pops over the step bar (+2 for a miss, 退一步 for a combo push-back)
  function bump(text, cls) {
    const b = el('div', 'bump ' + (cls || ''), chargeBox, text);
    void b.offsetWidth;
    b.classList.add('go');
    later(700, () => b.remove());
  }

  // Stage-space centre of an element (the stage is scaled by layout.scale).
  function stageCenter(node) {
    const s = stage.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - s.left) / layout.scale, y: (r.top + r.height / 2 - s.top) / layout.scale };
  }

  // slice v5: a normal attack sends a strike from the enemy to the heart it takes, and the heart cracks.
  function onHostAttack(e) {
    if (e.kind === 'normal') {
      const heart = heartsEl.children[e.heart];
      if (!heart) return;
      const from = stageCenter(foe);
      const to = stageCenter(heart);
      const s = el('div', 'strike', stage);
      s.style.left = from.x - 30 + 'px';
      s.style.top = from.y - 4 + 'px';
      void s.offsetWidth;
      s.style.transform = `translate(${to.x - from.x}px, ${to.y - from.y}px) rotate(-20deg)`;
      later(220, () => {
        s.style.opacity = '0';
        heart.classList.remove('crack');
        void heart.getBoundingClientRect();
        heart.classList.add('crack');
        buzz(40);
      });
      later(500, () => s.remove());
    } else if (e.kind === 'blocked') {
      shieldEl.classList.remove('hit');
      void shieldEl.offsetWidth;
      shieldEl.classList.add('hit');
      buzz(20);
    } else if (e.kind === 'special' && e.special === 'sweep') {
      frame.classList.remove('quake');
      void frame.offsetWidth;
      frame.classList.add('quake');
      later(500, () => frame.classList.remove('quake'));
      buzz(30);
    } else if (e.kind === 'special') {
      buzz(30);
    }
  }

  function enrage(e) {
    const rage = PORTRAITS[chapter.boss.enemy + '_rage'];
    if (rage) setFoeFace(rage);
    foe.classList.add('rage');
  }

  function setFoeFace(src) {
    foeFaceSrc = src || '';
    foeFace.style.backgroundImage = src ? `url("${src}")` : '';
    foeFace.textContent = src ? '' : chapter.enemyName.slice(0, 1);
  }

  // Win ending (slice experiment): the remaining tiles burst outward from the centre in waves of 4, the
  // enemy portrait fills the stage, cracks and shatters with a flash; the win card follows at SMASH_CARD_AT.
  function shatter() {
    const L = layout;
    const cx = L.boardW / 2;
    const cy = L.boardH / 2;
    const dist = (t) => {
      const c = pointCenter(L, t.r, t.c);
      return Math.hypot(c.x - cx, c.y - cy);
    };
    const left = tiles.filter((t) => t.kind);
    left.sort((a, b) => dist(a) - dist(b));
    left.forEach((t, i) => {
      const c = pointCenter(L, t.r, t.c);
      const dx = c.x - cx;
      const dy = c.y - cy;
      const n = Math.hypot(dx, dy) || 1;
      later(Math.floor(i / 4) * 70, () => {
        t.el.classList.add('smashed');
        t.el.style.transform = `translate(${(dx / n) * L.cell * 1.6}px, ${(dy / n) * L.cell * 1.6}px) rotate(${i % 2 ? 40 : -40}deg) scale(0.3)`;
      });
    });
    const size = Math.min(L.stageW - 60, 240);
    smash.style.width = size + 'px';
    smash.style.height = size + 'px';
    smash.style.left = (L.stageW - size) / 2 + 'px';
    smash.style.top = Math.max(20, L.boardY + (L.boardH - size) / 2) + 'px';
    for (const sh of shardEls) {
      sh.el.style.backgroundImage = foeFaceSrc ? `url("${foeFaceSrc}")` : '';
      sh.el.style.transform = '';
      sh.el.style.opacity = '';
    }
    smash.className = '';
    void smash.offsetWidth;
    later(150, () => { smash.className = 'in'; buzz(20); });
    later(650, () => { smash.className = 'in cracked quake'; buzz(30); });
    later(950, () => {
      smash.className = 'in cracked broken';
      flash.className = '';
      void flash.offsetWidth;
      flash.className = 'go';
      buzz(80);
      for (const sh of shardEls) {
        const d = size * (0.9 + Math.abs(sh.dx) * 0.3);
        sh.el.style.transform = `translate(${sh.dx * d}px, ${sh.dy * d + size * 0.25}px) rotate(${sh.spin}deg) scale(0.7)`;
        sh.el.style.opacity = '0';
      }
    });
    later(1600, () => { smash.className = ''; flash.className = ''; });
  }

  function onState(e) {
    if (e.to === 'end') {
      endingLeft = e.win ? ENDING_WIN_MS : ENDING_LOSE_MS;
      if (e.win) shatter();
      if (e.win) fillWinCard();
      else fillLoseCard();
    }
    if (e.to === 'settle') {
      const btns = winCard.querySelector('.btns');
      if (btns) btns.classList.remove('wait');
    }
  }

  function fillWinCard() {
    const out = round.settleOutcome();
    const res = round.result();
    winCard.textContent = '';
    const stamp = el('div', 'stamp', winCard, '胜');
    const stars = el('div', 'stars', winCard);
    const starEls = [];
    for (let i = 0; i < 3; i++) {
      const on = i < out.stars;
      const span = el('span', on ? 'on' : 'off', stars);
      span.appendChild(svgIcon(STAR_PATH, {}));
      starEls.push(span);
    }
    if (out.reasonLine) el('p', '', winCard, out.reasonLine);
    const secs = Math.round(res.gameTimeMs / 1000);
    el('p', 'small', winCard, `用时 ${Math.floor(secs / 60)} 分 ${secs % 60} 秒 · 最高 ${res.maxCombo} 连斩`);
    const used = GENERALS.filter((g) => res.skillsUsed[g.id] > 0).map((g) => g.name + '×' + res.skillsUsed[g.id]);
    el('p', 'small', winCard, used.length ? '出过手：' + used.join('、') : '这一回没放技能');
    el('p', 'small', winCard, texts.preview);
    const row = buttons(winCard, [{ id: 'retry', text: '再来一回', primary: true }]);
    row.classList.add('wait');
    later(60, () => stamp.classList.add('go'));
    starEls.forEach((s, i) => later(420 + i * 220, () => s.classList.add('go')));
  }

  function fillLoseCard() {
    const res = round.result();
    loseCard.textContent = '';
    el('h2', '', loseCard, res.reason);
    el('p', '', loseCard, fillText(texts.failHint[res.reason], { COMBO_THRESHOLD }));
    buttons(loseCard, [{ id: 'retry', text: '再来一回', primary: true }]);
  }

  function handle(e) {
    switch (e.type) {
      case 'match': drawLink(e); juiceMatch(e); showCombo(e); break;
      case 'clear': juiceClear(e); break;
      case 'miss': shake(e.a); shake(e.b); bump('+2', 'red'); break;
      case 'interrupt':
        slash.classList.remove('go');
        void slash.offsetWidth;
        slash.classList.add('go');
        bump('退一步', '');
        break;
      case 'hostAttack': onHostAttack(e); break;
      case 'shield': showShout('赵云护住了城门'); break;
      case 'specialBroken': showShout('吕布的下一招已被识破'); break;
      case 'seal': {
        const g = gcards[e.general];
        if (g) { g.root.classList.remove('shake'); void g.root.offsetWidth; g.root.classList.add('shake'); }
        break;
      }
      case 'targetGone': showShout(KIND_NAMES[e.kind] + '已经没了'); break;
      case 'skillReady': {
        const g = GENERALS.find((x) => x.id === e.general);
        showShout(g.name + '可以出手了');
        break;
      }
      case 'skillArmed': showShout('下一对同种兵必消', 'read', 'zhao'); break;
      case 'skillArmedSpent': retractShout('zhao'); break;
      case 'cardHint': flipHint(e.general, e.text); break;
      case 'bossPhase': enrage(e); break;
      case 'tokenStart': onTokenStart(e); break;
      case 'tokenEnd': onTokenEnd(e); break;
      case 'state': onState(e); break;
      default: break;
    }
  }

  // ── per-frame sync from queries ──
  function syncTiles() {
    const v = board.version();
    const sel = board.selection();
    const key = sel ? sel.r + ',' + sel.c : '';
    if (key !== selKey) { selKey = key; selAge = 0; }
    if (v === lastVersion) return;
    lastVersion = v;
    for (const t of tiles) {
      const k = board.kindAt(t.r, t.c);
      // slice v6: a buried tile turning face up (the cell got shallower) pops in where the cleared one was
      const depth = k ? board.depthAt(t.r, t.c) : 0;
      if (k && depth < (t.depth || 0)) {
        t.el.classList.remove('reveal');
        void t.el.offsetWidth;
        t.el.classList.add('reveal');
        later(360, () => t.el.classList.remove('reveal'));
      }
      t.depth = depth;
      t.el.classList.toggle('stack', depth > 0);
      if (k !== t.kind) {
        t.kind = k;
        if (k) {
          t.img.src = TILE_ART[k] || '';
          t.img.style.visibility = TILE_ART[k] ? '' : 'hidden';
          t.el.setAttribute('data-ch', TILE_ART[k] ? '' : KIND_NAMES[k]);
        }
        t.el.classList.toggle('empty', !k);
        t.el.classList.toggle('block', k === 'ju');
      }
      const fx = k && EFFECTS[k];
      t.el.classList.toggle('fx', !!fx);
      if (fx) {
        t.el.setAttribute('data-seal', KIND_NAMES[fx.target]);
        t.el.classList.toggle('notarget', board.count(fx.target) === 0);
      }
      t.el.classList.toggle('sel', !!(sel && sel.r === t.r && sel.c === t.c));
    }
  }

  function syncPreview() {
    const sel = board.selection();
    const k = sel ? board.kindAt(sel.r, sel.c) : null;
    const target = k ? effects.targetOf(k) : null;
    const show = !!(target && selAge >= 150 && !round.boardLocked());
    for (const t of tiles) t.el.classList.toggle('pv', show && t.kind === target);
  }

  function syncHud(dt) {
    const h = pressure.hud();
    if (h.hearts !== lastHud.hearts) {
      Array.prototype.forEach.call(heartsEl.children, (s, i) => s.classList.toggle('lost', i >= h.hearts));
    }
    if (h.stepsMax !== lastHud.stepsMax) {
      track.textContent = '';
      for (let i = 0; i < h.stepsMax; i++) el('i', '', track);
    }
    if (h.steps !== lastHud.steps || h.stepsMax !== lastHud.stepsMax) {
      Array.prototype.forEach.call(track.children, (d, i) => d.classList.toggle('on', i < h.steps));
    }
    const left = h.stepsMax - h.steps;
    let label = h.stun > 0 ? `震慑中 · ${h.stun} 步不涨` : `还有 ${left} 步出手`;
    if (h.forecast) label = h.forecast.broken ? '下招已被识破' : `下招：${h.forecast.name}`;
    if (label !== lastHud.label) {
      chargeLabel.textContent = label;
      chargeLabel.classList.toggle('warn', !!(h.forecast && !h.forecast.broken));
    }
    stunEl.textContent = h.stun > 0 ? '震' + h.stun : '';
    stunEl.classList.toggle('on', h.stun > 0);
    shieldEl.classList.toggle('on', !!h.shield);
    if (h.hp !== lastHud.hp) {
      foeHp.textContent = `血 ${h.hp}/${h.hpMax}`;
      foeBar.style.transform = `scaleX(${h.hpMax ? h.hp / h.hpMax : 0})`;
    }
    const pairs = board.pairsLeft();
    if (pairs !== lastHud.pairs) pairsEl.textContent = `剩 ${pairs} 对`;
    lastHud = { hearts: h.hearts, steps: h.steps, stepsMax: h.stepsMax, hp: h.hp, pairs, label };
    // tier with down-dwell (ui-interaction rule 12); slice v5: 2 steps left → tier 2, 1 step → tier 3
    const want = h.steps === 0 ? 1 : left <= 1 ? 3 : left <= 2 ? 2 : 1;
    tierAge += dt;
    if (want > tierShown || (want < tierShown && tierAge >= TIER_MIN_DWELL_MS)) {
      tierShown = want;
      tierAge = 0;
      chargeBox.className = tierShown > 1 ? 't' + tierShown : '';
      foe.classList.toggle('t2', tierShown === 2);
      foe.classList.toggle('t3', tierShown === 3);
    }
  }

  function syncCards(dt) {
    for (const c of skills.cards()) {
      const g = gcards[c.id];
      const key = c.state + c.charge + ':' + (c.sealed || 0);
      if (key !== g.key) {
        g.key = key;
        g.root.classList.toggle('ready', c.state === 'ready');
        g.root.classList.toggle('sealed', c.state === 'sealed');
        g.name.textContent = c.state === 'ready' ? c.skill : c.state === 'sealed' ? '镇' + c.sealed + '步' : c.name;
        g.pips.textContent = KIND_NAMES[c.kind];
        for (let i = 0; i < c.need; i++) el('b', i < c.charge ? 'on' : '', g.pips);
      }
      if (g.hintLeft > 0) {
        g.hintLeft -= dt;
        if (g.hintLeft <= 0) g.root.classList.remove('hinting');
      }
    }
  }

  function syncOverlay() {
    const ov = round.overlay();
    const st = round.state();
    let want = ov || 'none';
    // hold the win card back while the enemy shatters
    if (want === 'win' && endingLeft > ENDING_WIN_MS - SMASH_CARD_AT) want = 'smash';
    if (want === shownOverlay) return;
    shownOverlay = want;
    for (const id of Object.keys(cards)) cards[id].classList.toggle('on', id === want);
    const shown = cards[want];
    if (shown && layout) {
      // centre the card on the stage, but never below the board's top edge
      const h = shown.offsetHeight;
      shown.style.top = Math.max(8, Math.min(layout.boardY + 24, (layout.stageH - h) / 2)) + 'px';
    }
    if (want === 'open' || want === 'resume' || want === 'pause' || want === 'landscape') mask.className = 'dim';
    else if (want === 'win') mask.className = 'win';
    else if (want === 'smash') mask.className = 'smash';
    else if (want === 'lose' || (st === 'end' && !ov)) mask.className = 'lose';
    else if (mask.className === 'dim') mask.className = '';
  }

  /**
   * One frame: play this frame's events in order, then sync everything from queries.
   * @param {number} dtReal real ms since the previous frame
   * @param {Array<object>} events drained from the round
   */
  function render(dtReal, events) {
    if (!round) return;
    const dt = dtReal < 0 || dtReal > 1000 ? 0 : dtReal;
    for (const e of events) handle(e);
    runTimers(dt);
    selAge += dt;
    syncTiles();
    syncPreview();
    syncHud(dt);
    syncCards(dt);
    syncOverlay();
    if (round.state() === 'end' && !round.overlay() && mask.className !== 'lose') mask.className = 'lose';
    renderPlaque(dt);
    if (endingLeft >= 0 && round.state() === 'end') {
      endingLeft -= dt;
      if (endingLeft <= 0) {
        endingLeft = -1;
        round.endingDone();
      }
    }
  }

  return {
    stage,
    frame,
    pauseEl,
    cardsEl,
    overlayCards: cards,
    bindRound,
    render,
    applyLayout,
    layout() { return layout; },
    showError() { errorEl.style.display = 'flex'; },
  };
}
