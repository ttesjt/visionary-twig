import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { discoverApps, selectApp, appAddress } from '../../tooling/workspace-apps.ts';
import { checkWorkspace } from '../lib/workspace-policy.mjs';
import { runnerOptions, browserEnvironment } from '../lib/runner-options.mjs';

function fixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'workspace-app-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@sample/workspace' }));
  function app(id, metadata = {}) {
    const directory = path.join(root, 'apps', id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'playwright.config.ts'), '');
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        name: `@sample/${id}`,
        workspaceKind: 'next-app',
        workspaceApp: {
          devPort: 3009,
          testPort: 3139,
          hostname: '127.0.0.1',
          testConfig: 'playwright.config.ts',
          ...metadata,
        },
      })
    );
  }
  return { root, app };
}

test('discovers actual applications without depending on a particular app set', (context) => {
  const project = fixture(context);
  project.app('sandbox');
  assert.deepEqual(
    discoverApps(project.root).map((app) => app.id),
    ['sandbox']
  );
  assert.equal(appAddress(selectApp(project.root, 'sandbox')).baseURL, 'http://127.0.0.1:3139');
  assert.deepEqual(appAddress(selectApp(project.root, 'sandbox'), '3157'), {
    port: 3157,
    baseURL: 'http://127.0.0.1:3157',
  });
  assert.throws(() => selectApp(project.root, 'studio'), /Unknown workspace app/);
});

for (const metadata of [
  { devPort: 0 },
  { testPort: '3139;echo' },
  { testPort: 65536 },
  { hostname: '127.0.0.1;echo' },
  { hostname: '-localhost' },
  { testConfig: '../../../escape.ts' },
  { testConfig: '/tmp/config.ts' },
  { testConfig: 'missing.ts' },
]) {
  test(`rejects malformed metadata in discovery and source policy: ${JSON.stringify(metadata)}`, (context) => {
    const project = fixture(context);
    project.app('sandbox', metadata);
    assert.throws(() => discoverApps(project.root), /workspaceApp/);
    assert.ok(
      checkWorkspace(project.root, { checkExports: false }).some((error) =>
        error.includes('workspaceApp')
      )
    );
  });
}

test('rejects a configuration symlink escaping the repository', (context) => {
  const project = fixture(context);
  project.app('sandbox', { testConfig: 'outside.ts' });
  symlinkSync(import.meta.filename, path.join(project.root, 'apps/sandbox/outside.ts'));
  assert.throws(() => discoverApps(project.root), /inside the repository/);
});

test('runner uses declared defaults and never hardcodes an app ID', () => {
  assert.throws(() => runnerOptions([]), /Select --app/);
  assert.equal(runnerOptions([], { defaultApp: 'sandbox' }).app, 'sandbox');
  assert.equal(runnerOptions(['--app', 'editor']).app, 'editor');
  assert.equal(
    runnerOptions(['--all'], {
      e2e: true,
      defaultApp: () => {
        throw new Error('not used');
      },
    }).all,
    true
  );
  assert.equal(
    runnerOptions(['--app', 'editor', '--production-defaults'], { e2e: true }).productionDefaults,
    true
  );
  for (const args of [
    ['--app'],
    ['--app', '../web'],
    ['--unknown'],
    ['--app', 'a', '--app', 'b'],
    ['--all', '--app', 'a'],
    ['--all', '--production-defaults'],
  ])
    assert.throws(() => runnerOptions(args, { e2e: true }));
});
test('generic browser environments isolate tracking without choosing app settings', () => {
  const source = { SITE_ENABLE_EXAMPLES: '1', UI_THEME_POLICY: 'dark' };
  assert.deepEqual(browserEnvironment(source), {
    ...source,
    NEXT_PUBLIC_EVENT_TRACKING_URL: '',
    EVENT_TRACKING_URL: '',
  });
});

test('E2E grep validates patterns without changing target defaults', () => {
  assert.equal(
    runnerOptions(['--grep', 'fixed theme policy'], { e2e: true, defaultApp: 'sandbox' }).grep,
    'fixed theme policy'
  );
  for (const args of [
    ['--grep'],
    ['--grep', '['],
    ['--grep', '--app'],
    ['--grep', 'a', '--grep', 'b'],
  ])
    assert.throws(() => runnerOptions(args, { e2e: true }));
  assert.throws(() => runnerOptions(['--grep', 'a']));
  assert.equal(
    browserEnvironment({ UI_THEME_POLICY: 'dark' }, 'studio', false).UI_THEME_POLICY,
    'dark'
  );
});

test('browser verification overrides inherited tracking endpoints and leaves the caller untouched', () => {
  const source = {
    NEXT_PUBLIC_EVENT_TRACKING_URL: 'https://analytics.example.com/capture',
    EVENT_TRACKING_URL: 'https://analytics.example.com/server',
  };
  for (const app of ['web', 'gallery', 'studio']) {
    const env = browserEnvironment(source, app, false);
    assert.equal(env.NEXT_PUBLIC_EVENT_TRACKING_URL, '');
    assert.equal(env.EVENT_TRACKING_URL, '');
  }
  assert.equal(source.NEXT_PUBLIC_EVENT_TRACKING_URL, 'https://analytics.example.com/capture');
  const configured = browserEnvironment(
    { ...source, TEST_EVENT_TRACKING_URL: 'https://events.example.test/capture' },
    'web',
    false
  );
  assert.equal(configured.NEXT_PUBLIC_EVENT_TRACKING_URL, 'https://events.example.test/capture');
  assert.equal(configured.EVENT_TRACKING_URL, '');
});
