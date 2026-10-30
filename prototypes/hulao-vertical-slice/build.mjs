// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Single-file build per ADR-0001 §4, Node built-ins only: node build.mjs → play.html
// Modules are rewritten into function scopes; imports become destructuring from a module table.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { stripCommentsAndStrings } from '../../tests/helpers/purity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const ENTRY = join(SRC, 'main.mjs');
const OUT = join(HERE, 'play.html');
const LIMIT = 2000000;
const CODE_WARN = 160000;

const IMPORT_RE = /import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';/g;
const EXPORT_RE = /^export\s+(function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const BANNED_FORMS = [
  [/export\s+default/, 'export default'],
  [/export\s*\*/, 'export *'],
  [/import\s*\*\s*as/, 'import * as'],
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
const CSS_BANNED = [/(^|[;{\s])filter\s*:/, /backdrop-filter/, /mix-blend-mode/];
const LAYOUT_PROPS = /\b(left|top|right|bottom|width|height|font-size|all)\b/;
const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_OK = /[\u00a9\u00ae\u2122]/g;

const failures = [];
const warnings = [];
const modules = new Map();
const order = [];

function load(file) {
  if (modules.has(file)) return;
  const src = readFileSync(file, 'utf8');
  const rel = relative(HERE, file).split('\\').join('/');
  for (const [re, name] of BANNED_FORMS) if (re.test(src)) failures.push(`${rel}: ${name} is not supported by the bundler`);
  const deps = [];
  let body = src.replace(IMPORT_RE, (m, names, spec) => {
    if (!spec.startsWith('.') || !spec.endsWith('.mjs')) failures.push(`${rel}: import path must be relative .mjs: ${spec}`);
    const target = resolve(dirname(file), spec);
    deps.push(target);
    return `const {${names}} = __m[${JSON.stringify(relative(HERE, target).split('\\').join('/'))}];`;
  });
  const exported = [];
  body = body.replace(EXPORT_RE, (m, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  if (/\bexport\b/.test(stripCommentsAndStrings(body))) failures.push(`${rel}: an export form the bundler does not understand`);
  if (/\bimport\b/.test(stripCommentsAndStrings(body))) failures.push(`${rel}: an import form the bundler does not understand`);
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

const css = readFileSync(join(SRC, 'view', 'styles.css'), 'utf8');
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

try {
  new vm.Script(js, { filename: 'play.bundle.js' });
} catch (err) {
  failures.push('bundle does not compile: ' + err.message);
}

const html = `<!-- VERTICAL SLICE - NOT FOR PRODUCTION -->
<!-- Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久 -->
<!-- Date: 2026-10-27 — built by build.mjs, do not edit by hand -->
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>评书连连看 · 第一回 · 垂直切片</title>
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
if (codeBytes > CODE_WARN) warnings.push(`code ${codeBytes} bytes > ${CODE_WARN}`);

for (const w of warnings) console.warn('warning: ' + w);
if (failures.length) {
  for (const f of failures) console.error('FAIL: ' + f);
  process.exit(1);
}
writeFileSync(OUT, html, 'utf8');
console.log(`play.html written: ${bytes} bytes (code ${codeBytes}, ${order.length} modules)`);
