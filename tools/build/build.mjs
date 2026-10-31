// Single-file release build (ADR-0001 section 4). Node built-ins only; dev-only, never shipped.
// Usage: node tools/build/build.mjs [--release]   ->   dist/index.html
// Modules are rewritten into function scopes; imports become reads from a module table.
// Ported from prototypes/hulao-vertical-slice/build.mjs (copied, not imported).
// --release rewrites `dev: true` to `dev: false` in src/app/build-flags.mjs.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { stripCommentsAndStrings } from '../../tests/helpers/purity.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const ENTRY = join(SRC, 'main.mjs');
const CSS_FILE = join(SRC, 'view', 'styles.css');
const OUT_DIR = join(ROOT, 'dist');
const OUT = join(OUT_DIR, 'index.html');
// Package limit in unpacked bytes: 2 MB until 2026-10-31, when the user raised it to 3 MB for the
// background music (ADR-0001 revision; the 小工具 platform itself takes a zip of up to 10 MB).
const LIMIT = 3000000;
const CODE_WARN = 160000;
const RELEASE = process.argv.indexOf('--release') !== -1;

const IMPORT_RE = /import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';/g;
const IMPORT_NS_RE = /import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from\s*'([^']+)';/g;
const EXPORT_RE = /^export\s+(function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const BANNED_FORMS = [
  [/export\s+default/, 'export default'],
  [/export\s*\*/, 'export *'],
  [/export\s*\{/, 'export { ... }'],
  [/\bimport\s*\(/, 'dynamic import()'],
];
const ES_DENY = [
  [/\?\.(?!\d)/, '?.'], [/\?\?/, '??'], [/\|\|=/, '||='], [/&&=/, '&&='], [/catch\s*\{/, 'catch {'],
  [/\.finally\(/, '.finally('], [/Promise\.allSettled/, 'Promise.allSettled'], [/Object\.fromEntries/, 'Object.fromEntries'],
  [/Object\.hasOwn\b/, 'Object.hasOwn'], [/\.flat\(/, '.flat('], [/\.flatMap\(/, '.flatMap('], [/\.findLast\(/, '.findLast('],
  [/\btrimStart\b/, 'trimStart'], [/\btrimEnd\b/, 'trimEnd'], [/\bglobalThis\b/, 'globalThis'], [/\bBigInt\b/, 'BigInt'],
  [/\bmatchAll\b/, 'matchAll'], [/\breplaceAll\b/, 'replaceAll'], [/\.at\(/, '.at('], [/for\s+await/, 'for await'],
  [/this\.#/, 'private field'], [/(?<![\w$])\d[\d_]*_\d/, 'numeric separator'], [/\(\?</, 'regex named group / lookbehind'],
];
const JS_BANNED = [/\beval\s*\(/, /new\s+Function/, /\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/];
const CSS_BANNED = [/(^|[;{\s])filter\s*:/, /backdrop-filter/, /mix-blend-mode/, /@import/, /url\(\s*['"]?https?:/];
const LAYOUT_PROPS = /\b(left|top|right|bottom|width|height|font-size|all)\b/;
const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_OK = /[\u00a9\u00ae\u2122]/g;

const failures = [];
const warnings = [];
const modules = new Map();
const order = [];
const relOf = (file) => relative(ROOT, file).split('\\').join('/');

function load(file) {
  if (modules.has(file)) return;
  modules.set(file, null); // cycle guard
  let src = readFileSync(file, 'utf8');
  const rel = relOf(file);
  if (RELEASE && rel === 'src/app/build-flags.mjs') src = src.replace(/dev:\s*true/, 'dev: false');
  for (const [re, name] of BANNED_FORMS) if (re.test(stripCommentsAndStrings(src))) failures.push(`${rel}: ${name} is not supported by the bundler`);
  const deps = [];
  const target = (spec) => {
    if (!spec.startsWith('.') || !spec.endsWith('.mjs')) failures.push(`${rel}: import path must be relative .mjs: ${spec}`);
    const t = resolve(dirname(file), spec);
    deps.push(t);
    return JSON.stringify(relOf(t));
  };
  let body = src.replace(IMPORT_NS_RE, (m, name, spec) => `const ${name} = __m[${target(spec)}];`);
  body = body.replace(IMPORT_RE, (m, names, spec) => `const {${names.replace(/\s+as\s+/g, ': ')}} = __m[${target(spec)}];`);
  const exported = [];
  body = body.replace(EXPORT_RE, (m, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  const plain = stripCommentsAndStrings(body);
  if (/\bexport\b/.test(plain)) failures.push(`${rel}: an export form the bundler does not understand`);
  if (/\bimport\b/.test(plain)) failures.push(`${rel}: an import form the bundler does not understand`);
  modules.set(file, { rel, body, exported, deps });
  for (const d of deps) load(d);
  order.push(file);
}

load(ENTRY);

let js = '"use strict";\nvar __m = {};\n';
for (const file of order) {
  const m = modules.get(file);
  js += `__m[${JSON.stringify(m.rel)}] = (function () {\n${m.body}\nreturn { ${m.exported.join(', ')} };\n})();\n`;
}

const plainJs = stripCommentsAndStrings(js);
for (const [re, name] of ES_DENY) if (re.test(plainJs)) failures.push(`beyond ES2017: ${name}`);
for (const re of JS_BANNED) if (re.test(plainJs)) failures.push(`banned JS: ${re}`);

const css = readFileSync(CSS_FILE, 'utf8');
for (const re of CSS_BANNED) if (re.test(css)) failures.push(`banned CSS: ${re}`);
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of cssNoComments.matchAll(/transition(?:-property)?\s*:\s*([^;}]*)/g)) {
  const props = m[1].split(',').map((p) => p.trim().split(/\s+/)[0]);
  for (const p of props) if (LAYOUT_PROPS.test(p) && !/^(transform|opacity)$/.test(p)) failures.push(`CSS transition on a layout property: ${p}`);
}
for (const m of cssNoComments.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\})\s*\}/g)) {
  for (const decl of m[1].matchAll(/([\w-]+)\s*:/g)) {
    if (LAYOUT_PROPS.test(decl[1]) && decl[1] !== 'transform-origin') failures.push(`CSS keyframes animate a layout property: ${decl[1]}`);
  }
}
const willChange = (css.match(/will-change/g) || []).length;
if (willChange > 6) warnings.push(`will-change declared ${willChange} times (> 6)`);

for (const file of order) {
  const text = readFileSync(file, 'utf8').replace(EMOJI_OK, '');
  if (EMOJI.test(text)) failures.push(`emoji in ${modules.get(file).rel}`);
}
if (EMOJI.test(css.replace(EMOJI_OK, ''))) failures.push('emoji in styles.css');

try {
  new vm.Script(js, { filename: 'index.bundle.js' });
} catch (err) {
  failures.push('bundle does not compile: ' + err.message);
}

const html = `<!doctype html>
<!-- Built by tools/build/build.mjs${RELEASE ? ' --release' : ''}; do not edit by hand. -->
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>三国连连看</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script>
${js}
</script>
</body>
</html>
`;

const bytes = Buffer.byteLength(html, 'utf8');
if (bytes > LIMIT) failures.push(`package ${bytes} bytes > ${LIMIT}`);
const codeBytes = Buffer.byteLength(js, 'utf8') + Buffer.byteLength(css, 'utf8');
if (codeBytes > CODE_WARN) warnings.push(`code ${codeBytes} bytes > ${CODE_WARN} (inline art included)`);

for (const w of warnings) console.warn('warning: ' + w);
if (failures.length) {
  for (const f of failures) console.error('FAIL: ' + f);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, 'utf8');
console.log(`dist/index.html written: ${bytes} bytes (code ${codeBytes}, ${order.length} modules${RELEASE ? ', release' : ''})`);
