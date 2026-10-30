// Detector for ADR-0001's rules-layer purity rule: src/rules and src/core must not
// touch the page, the clock, randomness or storage (they are injected instead).
// Dev-only test helper; never shipped.

/** Platform names the rules layer must not reference, with a readable label each. */
export const FORBIDDEN = [
  { label: 'document', re: /\bdocument\b/ },
  { label: 'window', re: /\bwindow\b/ },
  { label: 'localStorage', re: /\blocalStorage\b/ },
  { label: 'sessionStorage', re: /\bsessionStorage\b/ },
  { label: 'indexedDB', re: /\bindexedDB\b/ },
  { label: 'navigator', re: /\bnavigator\b/ },
  { label: 'Date.now()', re: /\bDate\s*\.\s*now\s*\(/ },
  { label: 'new Date()', re: /\bnew\s+Date\s*\(/ },
  { label: 'performance.now()', re: /\bperformance\s*\.\s*now\s*\(/ },
  { label: 'Math.random()', re: /\bMath\s*\.\s*random\s*\(/ },
  { label: 'requestAnimationFrame', re: /\brequestAnimationFrame\b/ },
  { label: 'setTimeout', re: /\bsetTimeout\b/ },
  { label: 'setInterval', re: /\bsetInterval\b/ },
];

/**
 * Blanks out comments and string literals, keeping line breaks so line numbers
 * survive. Template literals are blanked whole, including any ${...} inside.
 * @param {string} source JavaScript source text
 * @returns {string} source of the same length with comments and strings blanked
 */
export function stripCommentsAndStrings(source) {
  let out = '';
  let i = 0;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += blank(source.slice(i, stop));
      i = stop;
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') j++;
        if (ch !== '`' && source[j] === '\n') break;
        j++;
      }
      const stop = Math.min(j + 1, source.length);
      out += blank(source.slice(i, stop));
      i = stop;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/**
 * Lists every forbidden platform reference in a rules-layer source file.
 * @param {string} source JavaScript source text
 * @returns {{label: string, line: number}[]} one entry per hit, in line order
 */
export function findPlatformAccess(source) {
  const lines = stripCommentsAndStrings(source).split('\n');
  const hits = [];
  lines.forEach((text, index) => {
    for (const { label, re } of FORBIDDEN) {
      if (re.test(text)) hits.push({ label, line: index + 1 });
    }
  });
  return hits;
}
