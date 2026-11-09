import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pruneLockfile } from '../templates/lockfile-graph.mjs';

test('resolution delivery keeps peer variants and optional platforms, excluding unrelated provider records', () => {
  const lock = {
    importers: {
      '.': { devDependencies: { tool: { version: '1.0.0(peer@2.0.0)' } } },
      'apps/web': { dependencies: { '@example/ui': { version: 'link:../../packages/shared/ui' } } },
    },
    packages: {
      'tool@1.0.0': {},
      'peer@2.0.0': {},
      'platform@1.0.0': {},
      'unselected-sdk@9.0.0': {},
    },
    snapshots: {
      'tool@1.0.0(peer@2.0.0)': {
        dependencies: { peer: '2.0.0' },
        optionalDependencies: { platform: '1.0.0' },
      },
      'peer@2.0.0': {},
      'platform@1.0.0': {},
      'unselected-sdk@9.0.0': {},
    },
  };
  const result = pruneLockfile(lock);
  assert.deepEqual(Object.keys(result.packages).sort(), [
    'peer@2.0.0',
    'platform@1.0.0',
    'tool@1.0.0',
  ]);
  assert.ok(result.snapshots['tool@1.0.0(peer@2.0.0)']);
  assert.ok(lock.packages['unselected-sdk@9.0.0'], 'The source seed is not mutated.');
});
test('an incomplete resolution graph fails instead of publishing a broken seed', () => {
  assert.throws(
    () =>
      pruneLockfile({
        importers: { '.': { dependencies: { missing: { version: '1.0.0' } } } },
        packages: {},
        snapshots: {},
      }),
    /Missing lockfile snapshot/
  );
});
