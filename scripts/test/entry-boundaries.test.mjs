import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkEntryBoundaries } from '../lib/entry-boundaries.mjs';
function fixture(context, source, bridge = 'export const value = 1;') {
  const root = mkdtempSync(path.join(tmpdir(), 'entry-boundaries-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const a = {
    directory: path.join(root, 'a'),
    manifest: {
      name: '@example/a',
      exports: { '.': { import: './dist/index.js' }, './react': { import: './dist/react.js' } },
      workspaceEntrypoints: { '.': 'pure', './react': 'client' },
    },
  };
  const b = {
    directory: path.join(root, 'b'),
    manifest: {
      name: '@example/b',
      exports: { '.': { import: './dist/index.js' }, './node': { import: './dist/node.js' } },
      workspaceEntrypoints: { '.': 'pure', './node': 'node' },
    },
  };
  for (const owner of [a, b]) mkdirSync(path.join(owner.directory, 'src'), { recursive: true });
  writeFileSync(path.join(a.directory, 'src/index.ts'), source);
  writeFileSync(
    path.join(a.directory, 'src/react.ts'),
    "'use client'; export { value } from '@example/b';"
  );
  writeFileSync(path.join(b.directory, 'src/index.ts'), bridge);
  writeFileSync(path.join(b.directory, 'src/node.ts'), 'export const value = 1;');
  return {
    a,
    b,
    check: () =>
      checkEntryBoundaries(
        [a, b],
        new Map([
          [a.manifest.name, a],
          [b.manifest.name, b],
        ])
      ),
  };
}
test('pure roots cannot transitively expose React or Node, and client entries cannot reach Node wrappers', (context) => {
  let f = fixture(
    context,
    "export {value} from '@example/b';",
    "import fs from 'node:fs'; export const value=fs;"
  );
  assert.ok(f.check().some((error) => error.includes('reaches Node')));
  f = fixture(
    context,
    "export {value} from '@example/b';",
    "import React from 'react'; export const value=React;"
  );
  assert.ok(f.check().some((error) => error.includes('reaches React')));
  f = fixture(context, 'export const value=1;');
  writeFileSync(
    path.join(f.a.directory, 'src/react.ts'),
    "'use client'; export {value} from '@example/b/node';"
  );
  assert.ok(f.check().some((error) => error.includes('Node entry')));
});
test('type-only Node references are allowed; a missing leading client directive is rejected', (context) => {
  const f = fixture(
    context,
    "import type {value} from '@example/b/node'; export const label='Text';"
  );
  assert.deepEqual(f.check(), []);
  writeFileSync(
    path.join(f.a.directory, 'src/react.ts'),
    "import {value} from '@example/b'; 'use client'; export {value};"
  );
  assert.ok(f.check().some((error) => error.includes('leading use client')));
});

test('root string exports cannot hide a transitive Node dependency', (context) => {
  const f = fixture(
    context,
    "export { value } from '@example/b';",
    "import fs from 'node:fs'; export const value=fs;"
  );
  f.b.manifest.exports = './dist/index.js';
  delete f.b.manifest.workspaceEntrypoints;
  assert.ok(f.check().some((error) => error.includes('reaches Node')));
});

test('a leading client directive cannot silently turn a pure root into a client entry', (context) => {
  const f = fixture(context, "'use client'; export const value=1;");
  assert.ok(f.check().some((error) => error.includes('pure entry reaches a client module')));
});

for (const exports of [['./dist/index.js'], { types: './dist/index.d.ts' }]) {
  test(
    'source checks follow array/type-only public exports before dist exists: ' +
      JSON.stringify(exports),
    (context) => {
      const f = fixture(
        context,
        "export { value } from '@example/b';",
        "import fs from 'node:fs'; export const value=fs;"
      );
      f.b.manifest.exports = exports;
      delete f.b.manifest.workspaceEntrypoints;
      assert.ok(f.check().some((error) => error.includes('reaches Node')));
    }
  );
}

test('wildcard public exports and mjs source identities do not hide transitive Node modules', (context) => {
  const f = fixture(context, "export { value } from '@example/b/bridge';");
  f.b.manifest.exports = { './*': './dist/*.mjs' };
  delete f.b.manifest.workspaceEntrypoints;
  writeFileSync(path.join(f.b.directory, 'src/bridge.ts'), 'export const value=1;');
  writeFileSync(
    path.join(f.b.directory, 'src/bridge.mts'),
    "import fs from 'node:fs'; export const value=fs;"
  );
  assert.ok(f.check().some((error) => error.includes('reaches Node')));
});
