import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
const source = path.resolve(import.meta.dirname, '../..');
function fixture(t) {
  mkdirSync(path.join(source, 'test-results'), { recursive: true });
  const root = mkdtempSync(path.join(source, 'test-results/bootstrap-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (relative, value) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  for (const file of [
    'scripts/bootstrap.mjs',
    'scripts/prepare-app.mjs',
    'scripts/workspace',
    'scripts/lib/preparation-options.mjs',
    'scripts/lib/processes.mjs',
    'scripts/lib/workspace-layers.mjs',
    'tooling/workspace-apps.ts',
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(source, file), path.join(root, file), { recursive: true });
  }
  symlinkSync(path.join(source, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  write('package.json', { type: 'module' });
  write(
    'fake-pnpm.mjs',
    "import {appendFileSync} from 'node:fs';appendFileSync('installs.jsonl',JSON.stringify(process.argv.slice(2))+'\\n');if(process.env.FAIL_INSTALL)process.exit(17);"
  );
  const app = (id) => {
    write('apps/' + id + '/package.json', {
      workspaceKind: 'next-app',
      workspaceApp: {
        hostname: '127.0.0.1',
        devPort: 3000,
        testPort: 3100,
        testConfig: 'playwright.config.ts',
      },
    });
    write('apps/' + id + '/playwright.config.ts', '');
    write(
      'apps/' + id + '/text-resources.config.ts',
      "export default { version: 1, contentVersion: 'v1', locales: ['en', 'zh'], namespaces: ['main'] };"
    );
    write(
      'apps/' + id + '/config.config.ts',
      "import {z} from 'zod';export default {version:1,schema:z.strictObject({enabled:z.boolean()})};"
    );
    for (const locale of ['en', 'zh'])
      write('apps/' + id + '/content/default/text/' + locale + '/main.json', {
        label: locale + ' default',
      });
    write('apps/' + id + '/config/default/app.json', { enabled: true });
  };
  const run = (file, args = [], environment = {}) =>
    spawnSync(process.execPath, ['scripts/' + file, ...args], {
      cwd: root,
      env: { ...process.env, npm_execpath: path.join(root, 'fake-pnpm.mjs'), ...environment },
      encoding: 'utf8',
    });
  return { root, write, app, run };
}
test('bootstrap installs with no apps, provides guidance and rejects unknown targets before install', (t) => {
  const f = fixture(t);
  const bad = f.run('bootstrap.mjs', ['--app', 'missing']);
  assert.notEqual(bad.status, 0);
  assert.equal(existsSync(path.join(f.root, 'installs.jsonl')), false);
  const good = f.run('bootstrap.mjs', ['--offline']);
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /template:clone/);
  assert.deepEqual(JSON.parse(readFileSync(path.join(f.root, 'installs.jsonl'), 'utf8')), [
    'install',
    '--frozen-lockfile',
    '--offline',
  ]);
  assert.equal(existsSync(path.join(f.root, 'apps')), false);
});
test('bootstrap defaults to all apps, merges one locale override, is repeatable and never changes local inputs', (t) => {
  const f = fixture(t);
  f.app('first');
  f.app('second');
  f.write('apps/first/.local/content/text/zh/main.json', { label: 'Custom Chinese' });
  const custom = readFileSync(path.join(f.root, 'apps/first/.local/content/text/zh/main.json'));
  for (let index = 0; index < 2; index++) {
    const result = f.run('bootstrap.mjs');
    assert.equal(result.status, 0, result.stderr);
  }
  const label = (locale) =>
    JSON.parse(
      readFileSync(path.join(f.root, 'apps/first/.generated/text', locale, 'main.json'), 'utf8')
    ).label;
  assert.equal(label('en'), 'en default');
  assert.equal(label('zh'), 'Custom Chinese');
  assert.equal(existsSync(path.join(f.root, 'apps/second/.generated/config/app.json')), true);
  assert.deepEqual(
    readFileSync(path.join(f.root, 'apps/first/.local/content/text/zh/main.json')),
    custom
  );
  const checked = f.run('prepare-app.mjs', ['--check']);
  assert.equal(checked.status, 0, checked.stderr);
});
test('batch preparation validates all targets before commits and explicit defaults ignore invalid overrides', (t) => {
  const f = fixture(t);
  f.app('first');
  f.app('second');
  f.write('apps/second/.local/config/app.json', { unknown: true });
  const invalid = f.run('bootstrap.mjs');
  assert.notEqual(invalid.status, 0);
  assert.equal(existsSync(path.join(f.root, 'apps/first/.generated/text/en/main.json')), false);
  const defaults = f.run('bootstrap.mjs', ['--app', 'second', '--source', 'default']);
  assert.equal(defaults.status, 0, defaults.stderr);
  assert.equal(existsSync(path.join(f.root, 'apps/first/.generated')), false);
  assert.equal(
    JSON.parse(
      readFileSync(path.join(f.root, 'apps/second/.generated/config/manifest.json'), 'utf8')
    ).source,
    'default'
  );
});

test('ordinary bootstrap keeps frozen installation and never prepares after an install failure', (t) => {
  const f = fixture(t);
  f.app('first');
  const result = f.run('bootstrap.mjs', [], { FAIL_INSTALL: '1' });
  assert.equal(result.status, 17, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(path.join(f.root, 'installs.jsonl'), 'utf8')), [
    'install',
    '--frozen-lockfile',
  ]);
  assert.equal(existsSync(path.join(f.root, 'apps/first/.generated')), false);
  assert.doesNotMatch(result.stdout, /Ready\./);
});
