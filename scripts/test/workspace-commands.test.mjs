import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { selectTargets } from '../workspace/targets.mjs';
import { dependencyFilters } from '../workspace/packages.mjs';
import { appEnvironment } from '../workspace/hooks.mjs';
import {
  defaultApp,
  selectApp,
  discoverApps,
  discoverTemplateApps,
} from '../../tooling/workspace-apps.ts';
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'commands-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function write(file, value) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  }
  write('package.json', { name: '@test/project' });
  const app = (id, parent = 'apps', extra = {}) => {
    write(parent + '/' + id + '/playwright.config.ts', '');
    write(parent + '/' + id + '/package.json', {
      name: '@test/' + id,
      workspaceKind: 'next-app',
      workspaceApp: {
        hostname: '127.0.0.1',
        testConfig: 'playwright.config.ts',
        devPort: 3000,
        testPort: 3100,
        ...extra,
      },
      dependencies: { '@test/first': 'workspace:*' },
    });
  };
  return { root, write, app };
}
test('empty workspace, renamed app IDs and explicit template inclusion use one target contract', (t) => {
  const f = fixture(t);
  assert.deepEqual(selectTargets(f.root, {}, { defaultAll: true }), []);
  f.app('website');
  f.app('starter', 'packages/templates');
  assert.equal(defaultApp(f.root), 'website');
  assert.deepEqual(
    selectTargets(f.root, {}, { defaultAll: true }).map((app) => app.id),
    ['website']
  );
  assert.deepEqual(
    selectTargets(f.root, { all: true, includeTemplates: true }).map((app) => app.id),
    ['website', 'template-starter']
  );
  f.app('editor');
  assert.throws(() => defaultApp(f.root), /Choose --app/);
  f.write('package.json', { name: '@test/project', workspaceDefaultApp: 'editor' });
  assert.equal(defaultApp(f.root), 'editor');
  assert.throws(() => selectApp(f.root, 'missing'), /Available: editor, website/);
});
test('dependency closure includes indirect shared dependencies and excludes unrelated packages', (t) => {
  const f = fixture(t);
  f.app('website');
  f.write('packages/shared/first/package.json', {
    name: '@test/first',
    dependencies: { '@test/second': 'workspace:*' },
  });
  f.write('packages/shared/second/package.json', { name: '@test/second' });
  f.write('packages/adapters/unused/package.json', { name: '@test/unused' });
  assert.deepEqual(dependencyFilters(f.root, [selectApp(f.root, 'website')]), [
    '--filter',
    './packages/shared/first',
    '--filter',
    './packages/shared/second',
  ]);
});
test('only declared app hooks can choose data or production-test settings', async (t) => {
  const f = fixture(t);
  f.app('website');
  const plain = selectApp(f.root, 'website');
  await assert.rejects(
    appEnvironment(f.root, plain, 'dev', { data: 'cloud', environment: {} }),
    /not declared/
  );
  await assert.rejects(
    appEnvironment(f.root, plain, 'test', { productionDefaults: true, environment: {} }),
    /not declared/
  );
  f.write(
    'apps/website/hook.mjs',
    'export function environment({environment,data}) {return {...environment,TEST_MODE:data};}'
  );
  f.app('website', 'apps', { devHook: 'hook.mjs' });
  assert.deepEqual(
    await appEnvironment(f.root, selectApp(f.root, 'website'), 'dev', {
      data: 'local',
      environment: { A: 'b' },
    }),
    { A: 'b', TEST_MODE: 'local' }
  );
  f.app('website', 'apps', { devHook: '../../../outside.mjs' });
  assert.throws(() => selectApp(f.root, 'website'), /inside the repository/);
  f.app('website', 'apps', { devHook: 'link.mjs' });
  symlinkSync(import.meta.filename, path.join(f.root, 'apps/website/link.mjs'));
  assert.throws(() => selectApp(f.root, 'website'), /inside the repository/);
});

test('root command interface has no concrete app shortcuts or custom-source aliases', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const key of [
    'build:apps',
    'build:templates',
    'typecheck:all',
    'check:workspace:source',
    'lint:root',
    'app:create',
    'app:migrate-profile',
  ])
    assert.equal(manifest.scripts[key], undefined, key);
  for (const key of Object.keys(manifest.scripts)) {
    assert.equal(key.startsWith('dev:'), false, key);
    assert.equal(key.endsWith(':prepare:custom'), false, key);
  }
  for (const app of [...discoverApps(root), ...discoverTemplateApps(root)])
    assert.equal(manifest.scripts['test:e2e:' + app.id], undefined);
});
