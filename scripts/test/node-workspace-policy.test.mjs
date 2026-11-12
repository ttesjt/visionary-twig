import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkNodeWorkspace } from '../lib/node-workspace-policy.mjs';
import { NODE_WORKSPACE_GROUPS } from '../lib/workspace-discovery.mjs';
import { packageTaskSteps } from '../workspace/package-tasks.mjs';

function fixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'node-workspace-policy-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  function write(file, value) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  }
  function library(id, fields = {}) {
    const prefix = 'packages/' + id;
    write(prefix + '/package.json', {
      name: '@fixture/' + id,
      private: true,
      type: 'module',
      workspaceKind: 'node-library',
      exports: { '.': './dist/index.js' },
      scripts: {
        build: 'tsc --build',
        clean: 'rm -rf dist',
        dev: 'tsc --watch',
        typecheck: 'tsc --noEmit',
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        test: 'vitest run',
        'test:watch': 'vitest',
        'test:coverage': 'vitest run --coverage',
        format: 'prettier --write .',
        'format:check': 'prettier --check .',
      },
      ...fields,
    });
    for (const file of ['README.md', 'src/index.ts', 'vitest.config.ts'])
      write(prefix + '/' + file, '');
    for (const file of ['tsconfig.json', 'tsconfig.build.json']) write(prefix + '/' + file, {});
  }
  write('package.json', { name: '@fixture/project' });
  return { root, write, library };
}

test('flat Node packages may use provider SDKs and declared public workspace imports', (context) => {
  const { root, write, library } = fixture(context);
  library('vendor', { dependencies: { '@cloudflare/workers-types': '1.0.0' } });
  library('consumer', { dependencies: { '@fixture/vendor': 'workspace:*' } });
  write('packages/consumer/src/index.ts', "export * from '@fixture/vendor';");
  assert.deepEqual(checkNodeWorkspace(root, { checkExports: false }), []);
  assert.equal(
    checkNodeWorkspace(root).filter((error) => error.includes('missing public export')).length,
    2
  );
  for (const id of ['vendor', 'consumer']) write('packages/' + id + '/dist/index.js', 'export {};');
  assert.deepEqual(checkNodeWorkspace(root), []);
});

test('Node policy rejects undeclared and private imports and unsupported workspace kinds', (context) => {
  const { root, write, library } = fixture(context);
  library('vendor');
  library('consumer');
  library('ui', { workspaceKind: 'react-library' });
  write('packages/consumer/src/index.ts', "export * from '@fixture/vendor/private';");
  const errors = checkNodeWorkspace(root, { checkExports: false });
  assert.ok(
    errors.some((error) => error.includes('undeclared runtime dependency @fixture/vendor'))
  );
  assert.ok(errors.some((error) => error.includes('non-public export: @fixture/vendor/private')));
  assert.ok(errors.some((error) => error.includes('supported workspaceKind (node-library)')));
});

test('Node validation builds flat packages once before checks and tests', (context) => {
  const { root, library } = fixture(context);
  library('example');
  const steps = packageTaskSteps(root, 'validate', {}, { groups: NODE_WORKSPACE_GROUPS });
  assert.deepEqual(steps.slice(0, 3), [
    ['check:workspace', '--source'],
    ['--filter', './packages/*', '--if-present', 'build'],
    ['check:workspace'],
  ]);
  assert.deepEqual(
    steps.filter((step) => step.at(-1) === 'build'),
    [steps[1]]
  );
  assert.deepEqual(steps.slice(-2), [['test:tooling'], ['-r', '--if-present', 'test']]);
  assert.ok(!steps.some((step) => step.some((value) => value.startsWith('app:'))));
});
