// ADR-0001: src/rules and src/core must not touch the page, the clock, randomness
// or storage. Scans the real source tree; skips (does not pass) while the
// directories do not exist yet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlatformAccess } from '../../helpers/purity.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SCANNED = ['src/rules', 'src/core'];

function listModules(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...listModules(path));
    else if (name.endsWith('.mjs') || name.endsWith('.js')) files.push(path);
  }
  return files;
}

for (const dir of SCANNED) {
  test(`${dir} → no platform access`, (t) => {
    // Arrange
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) {
      t.skip(`${dir} does not exist yet`);
      return;
    }
    const files = listModules(abs);
    // Act
    const violations = files.flatMap((file) =>
      findPlatformAccess(readFileSync(file, 'utf8')).map(
        (hit) => `${relative(ROOT, file)}:${hit.line} uses ${hit.label}`,
      ),
    );
    // Assert
    assert.deepEqual(violations, [], 'inject time, randomness and storage instead (ADR-0001, ADR-0002, ADR-0004)');
  });
}
