import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const source = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);

test('canonical browser config discovers feature-owned tests and permits module removal without configuration edits', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'browser-discovery-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'apps/website');
  const write = (file, text) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  write('package.json', JSON.stringify({ name: '@discovery/workspace', type: 'module' }));
  write(
    'apps/website/package.json',
    JSON.stringify({
      name: '@discovery/website',
      workspaceKind: 'next-app',
      workspaceApp: {
        devPort: 3000,
        testPort: 3100,
        hostname: '127.0.0.1',
        testConfig: 'playwright.config.ts',
      },
    })
  );
  write(
    'apps/website/playwright.config.ts',
    `import { appPlaywrightConfig } from ${JSON.stringify(path.join(source, 'tooling/playwright-app.ts'))}; export default appPlaywrightConfig(${JSON.stringify(root)}, 'website');`
  );
  const testImport = JSON.stringify(require.resolve('@playwright/test'));
  for (const [file, title] of [
    ['test/e2e/core.spec.ts', 'core case'],
    ['test/e2e/tsx.spec.tsx', 'tsx case'],
    ['test/e2e/module.test.mjs', 'module case'],
    ['src/features/items/test/e2e/items.spec.ts', 'feature case'],
    ['src/demo/appearance/test/e2e/preview.spec.ts', 'preview case'],
    ['src/unit.spec.ts', 'unit case'],
    ['.next/test/e2e/stale.spec.ts', 'stale build case'],
  ])
    write(
      'apps/website/' + file,
      `import playwright from ${testImport}; const { test } = playwright; test(${JSON.stringify(title)}, () => {});`
    );
  const list = () =>
    spawnSync(
      process.execPath,
      [
        require.resolve('@playwright/test/cli'),
        'test',
        '--config',
        path.join(app, 'playwright.config.ts'),
        '--list',
      ],
      { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '' } }
    );
  const before = list();
  assert.equal(before.status, 0, before.stderr);
  for (const title of ['core case', 'tsx case', 'module case', 'feature case', 'preview case'])
    assert.ok(before.stdout.includes(title), before.stdout);
  assert.doesNotMatch(before.stdout, /unit case|stale build case/);
  rmSync(path.join(app, 'src/demo/appearance'), { recursive: true });
  const after = list();
  assert.equal(after.status, 0, after.stderr);
  assert.ok(
    after.stdout.includes('core case') && after.stdout.includes('feature case'),
    after.stdout
  );
  assert.doesNotMatch(after.stdout, /preview case/);
});
