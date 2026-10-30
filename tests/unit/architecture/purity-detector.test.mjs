// Unit tests for the rules-layer purity detector (ADR-0001). These prove the
// detector can fail; tests/integration/architecture/rules-layer-purity.test.mjs
// then runs it over the real src/rules and src/core.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORBIDDEN, findPlatformAccess } from '../../helpers/purity.mjs';

test('each forbidden reference → reported with its label', () => {
  // Arrange
  const samples = {
    'document': 'const el = document.body;',
    'window': 'window.x = 1;',
    'localStorage': 'localStorage.getItem("k");',
    'sessionStorage': 'sessionStorage.clear();',
    'indexedDB': 'indexedDB.open("db");',
    'navigator': 'const ua = navigator.userAgent;',
    'Date.now()': 'const t = Date.now();',
    'new Date()': 'const d = new Date();',
    'performance.now()': 'const t = performance.now();',
    'Math.random()': 'const r = Math.random();',
    'requestAnimationFrame': 'requestAnimationFrame(tick);',
    'setTimeout': 'setTimeout(fn, 10);',
    'setInterval': 'setInterval(fn, 10);',
  };
  assert.equal(Object.keys(samples).length, FORBIDDEN.length, 'every forbidden entry has a sample');

  for (const [label, source] of Object.entries(samples)) {
    // Act
    const hits = findPlatformAccess(source);
    // Assert
    assert.deepEqual(hits.map((h) => h.label), [label], `sample for ${label}`);
  }
});

test('hit on a later line → reports that line number', () => {
  // Arrange
  const source = 'export function f() {\n  return 1;\n}\nconst r = Math.random();\n';
  // Act
  const hits = findPlatformAccess(source);
  // Assert
  assert.deepEqual(hits, [{ label: 'Math.random()', line: 4 }]);
});

test('names inside comments and strings → not reported', () => {
  // Arrange
  const source = [
    '// window and Date.now() are injected, never read here',
    '/* localStorage lives in src/platform/storage.mjs */',
    'const msg = "document is not available";',
    "const other = 'Math.random() is banned';",
    'const tpl = `navigator ${1}`;',
  ].join('\n');
  // Act
  const hits = findPlatformAccess(source);
  // Assert
  assert.deepEqual(hits, []);
});

test('similar but allowed names → not reported', () => {
  // Arrange: injected parameters and our own names that merely contain a banned word
  const source = [
    'export function createRound({ now, rngSeed }) {',
    '  const windowMs = 3000;',
    '  const documentId = "ch01";',
    '  return { gameTime: now };',
    '}',
  ].join('\n');
  // Act
  const hits = findPlatformAccess(source);
  // Assert
  assert.deepEqual(hits, []);
});
