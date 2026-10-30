// Ported from prototypes/hulao-vertical-slice (2026-10-30); copied, not imported.

// Inline <symbol> sprite (art bible §3 "兵：只靠形状分种", §4 器物色). Placeholder-quality
// drawings that follow the shape rules: one object per kind, ink outline, flat fill, no faces.

const INK = '#2a2018';
const PAPER = '#fffaf0';
const OCHRE = '#b58553';
const IRON = '#9a9286';
const JADE = '#7fa08a';
const ZHU = '#b33a22';
const S = `stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;

const SYMBOLS = {
  // 营：尖·横 — wide tent with a door slit
  ying: `<path d="M3 31 L20 9 L37 31 Z" fill="${OCHRE}" ${S}/><path d="M20 17 L20 31" fill="none" ${S}/>`,
  // 火：尖·竖 — single flame drop, paper core (the only solid 朱 icon)
  huo: `<path d="M20 4 C28 13 32 20 29 28 C27 34 13 34 11 28 C8 21 15 15 20 4 Z" fill="${ZHU}" ${S}/><path d="M20 19 C23 23 24 26 22 29 C20 31 17 30 17 27 C17 24 19 22 20 19 Z" fill="${PAPER}" stroke="none"/>`,
  // 鼓：圆·横 — side view drum with a row of studs
  gu: `<rect x="5" y="12" width="30" height="17" rx="7" fill="${OCHRE}" ${S}/><path d="M8 16 L32 16" fill="none" ${S}/><circle cx="12" cy="20.5" r="1.4" fill="${INK}"/><circle cx="17" cy="20.5" r="1.4" fill="${INK}"/><circle cx="23" cy="20.5" r="1.4" fill="${INK}"/><circle cx="28" cy="20.5" r="1.4" fill="${INK}"/>`,
  // 盾：圆·正 — round rattan shield with a centre boss
  dun: `<circle cx="20" cy="20" r="14" fill="${IRON}" ${S}/><circle cx="20" cy="20" r="4.5" fill="${PAPER}" ${S}/>`,
  // 酒：圆·竖 — round-bellied jar with a cloth knot
  jiu: `<path d="M15 7 L25 7 L25 11 C33 14 35 21 34 27 C33 33 27 35 20 35 C13 35 7 33 6 27 C5 21 7 14 15 11 Z" fill="${JADE}" ${S}/><path d="M14 11 L26 11 M20 7 L23 3" fill="none" ${S}/>`,
  // 刀：条·斜 — single-edged curved blade at 45°
  dao: `<path d="M12 29 C19 25 27 17 33 6 C33 16 27 26 16 33 Z" fill="${IRON}" ${S}/><path d="M6 35 L13 28" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  // 书：方·横 — open bamboo slips with vertical strokes
  shu: `<rect x="5" y="11" width="30" height="19" rx="2" fill="${JADE}" ${S}/><path d="M11 13 V28 M16.5 13 V28 M22 13 V28 M27.5 13 V28" fill="none" ${S}/>`,
  // 旗：条·竖 — upright pole with a side-hung square flag
  qi: `<path d="M11 5 L11 36" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M12 7 L31 7 L31 21 L12 21 Z" fill="${JADE}" ${S}/>`,
};

const EXTRA = {
  heart: `<path d="M20 34 C9 26 4 20 4 13 C4 8 8 5 12 5 C16 5 18 7 20 10 C22 7 24 5 28 5 C32 5 36 8 36 13 C36 20 31 26 20 34 Z" fill="${ZHU}" stroke="${ZHU}" stroke-width="2"/>`,
  star: `<path d="M20 3 L25 15 L38 15 L27.5 23 L31.5 36 L20 28 L8.5 36 L12.5 23 L2 15 L15 15 Z"/>`,
  // padlock for locked catalog rows (Q版清爽版 catalog)
  lock: `<rect x="9" y="18" width="22" height="17" rx="4" fill="#8a7f72" stroke="#4a433b" stroke-width="2.2"/><path d="M14 18 V13 C14 6 26 6 26 13 V18" fill="none" stroke="#4a433b" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="26" r="2.6" fill="#fffaf0"/>`,
  tick: `<path d="M8 21 L17 30 L33 9" fill="none" stroke="${ZHU}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/**
 * The whole sprite as one hidden <svg> string to insert once into the page.
 * @returns {string}
 */
export function spriteMarkup() {
  const all = Object.assign({}, SYMBOLS, EXTRA);
  const parts = Object.keys(all).map((id) => `<symbol id="s-${id}" viewBox="0 0 40 40">${all[id]}</symbol>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">${parts.join('')}</svg>`;
}

/** @returns {boolean} whether a kind has a drawn symbol (others fall back to their character). */
export function hasSymbol(kind) {
  return Object.prototype.hasOwnProperty.call(SYMBOLS, kind);
}
