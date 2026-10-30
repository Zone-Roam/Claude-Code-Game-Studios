// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// ADR-0001 rule: the slice's rules and core layers must not touch the page, clock, randomness or storage.
// Reuses the project's detector (a dev-only test helper, not production code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlatformAccess } from '../../../tests/helpers/purity.mjs';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

for (const dir of ['rules', 'core']) {
  test(`slice src/${dir} → no platform access`, () => {
    // Arrange
    const files = readdirSync(join(SRC, dir)).filter((n) => n.endsWith('.mjs'));
    // Act
    const hits = files.flatMap((n) =>
      findPlatformAccess(readFileSync(join(SRC, dir, n), 'utf8')).map((h) => `${dir}/${n}:${h.line} ${h.label}`));
    // Assert
    assert.ok(files.length > 0);
    assert.deepEqual(hits, []);
  });
}
