import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { cloneRepository } from '../generation/create.mjs';
import { appendTemplate } from '../generation/append.mjs';
import { generationOptions } from '../generation/options.mjs';
import { git } from '../generation/git.mjs';
import { lockTarget } from '../generation/transaction.mjs';

const source = path.resolve(import.meta.dirname, '../..');
const root = mkdtempSync(path.join(tmpdir(), 'generation-transactions-'));
const base = path.join(root, 'base');
// Command execution is injected here to exercise real filesystem/Git transactions cheaply.
// Public CLI qualification separately runs real pnpm install, prepare, validate and build.
const noCommands = async () => {};
before(async () => {
  await cloneRepository(
    source,
    base,
    { bare: true, name: '@transactions/project' },
    { run: noCommands }
  );
});
after(() => rmSync(root, { recursive: true, force: true }));
function target(context) {
  const folder = path.join(root, 'case-' + Math.random().toString(36).slice(2));
  git(base, ['clone', '--quiet', '--no-local', '--', base, folder]);
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}
const head = (folder) => git(folder, ['rev-parse', 'HEAD']).trim();
const clean = (folder) => assert.equal(git(folder, ['status', '--porcelain=v1']), '');

test('CLI separates repository identity, required app name and default template', () => {
  const options = generationOptions(['--output', '/tmp/new'], 'repository');
  assert.equal(options.appName, 'web');
  assert.equal(options.template, 'plain-next');
  assert.equal(generationOptions(['--output', '/tmp/library'], 'library').template, 'node-library');
  assert.throws(
    () => generationOptions(['--output', '/tmp/library', '--app-name', 'ignored'], 'library'),
    /Unknown option/
  );
  assert.throws(
    () => generationOptions(['--target', '/tmp/new'], 'template'),
    /no default app name/
  );
  assert.throws(() => generationOptions(['--output', '/tmp/new'], 'template'), /Unknown option/);
  assert.throws(
    () =>
      generationOptions(['--output', '/tmp/new', '--bare', '--template', 'studio'], 'repository'),
    /cannot be combined/
  );
  assert.throws(
    () => generationOptions(['--target', '/tmp/new', '--name', 'a', '--name', 'b'], 'template'),
    /Repeated/
  );
});
test('bare clone has exactly one independent commit with no remotes', () => {
  assert.equal(git(base, ['rev-list', '--count', 'HEAD']).trim(), '1');
  assert.equal(
    git(base, ['log', '-1', '--format=%s']).trim(),
    'chore(workspace): initialize frontend monorepo'
  );
  assert.equal(git(base, ['remote']), '');
  clean(base);
});
test('app addition creates one own commit and preserves ignored data, README and license choice', async (context) => {
  const folder = target(context);
  const custom = path.join(folder, '.local/personal.json');
  mkdirSync(path.dirname(custom));
  writeFileSync(custom, 'private fixture');
  const readme = readFileSync(path.join(folder, 'README.md'));
  const licenseFile = path.join(folder, 'LICENSE');
  const manifestFile = path.join(folder, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const license = 'Copyright (c) Example Project. All rights reserved.\n';
  writeFileSync(licenseFile, license);
  writeFileSync(
    manifestFile,
    JSON.stringify({ ...manifest, license: 'UNLICENSED' }, null, 2) + '\n'
  );
  git(folder, ['add', 'LICENSE', 'package.json']);
  git(folder, ['commit', '-m', 'chore: set project license']);
  const before = head(folder);
  await appendTemplate(source, folder, { appName: 'web' }, { run: noCommands });
  assert.equal(git(folder, ['rev-list', '--count', before + '..HEAD']).trim(), '1');
  assert.equal(
    git(folder, ['log', '-1', '--format=%s']).trim(),
    'feat(web): initialize from plain-next'
  );
  assert.equal(readFileSync(custom, 'utf8'), 'private fixture');
  assert.deepEqual(readFileSync(path.join(folder, 'README.md')), readme);
  assert.equal(readFileSync(licenseFile, 'utf8'), license);
  assert.equal(JSON.parse(readFileSync(manifestFile, 'utf8')).license, 'UNLICENSED');
  const changed = git(folder, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'])
    .trim()
    .split('\n');
  assert.ok(
    changed.every(
      (file) =>
        file.startsWith('apps/web/') ||
        [
          'package.json',
          'pnpm-workspace.yaml',
          'pnpm-lock.yaml',
          '.workspace-template.json',
        ].includes(file)
    )
  );
  assert.ok(!changed.some((file) => file.startsWith('packages/shared/')));
  clean(folder);
});
test('dirty target and active generation lock fail before writing an app', async (context) => {
  const folder = target(context);
  writeFileSync(path.join(folder, 'README.md'), 'user edit');
  await assert.rejects(
    appendTemplate(source, folder, { appName: 'web' }, { run: noCommands }),
    /must be clean/
  );
  git(folder, ['restore', 'README.md']);
  const release = lockTarget(folder);
  try {
    await assert.rejects(
      appendTemplate(source, folder, { appName: 'web' }, { run: noCommands }),
      /Another generation/
    );
  } finally {
    release();
  }
  assert.equal(existsSync(path.join(folder, 'apps/web')), false);
  clean(folder);
});
test('qualification failure leaves target HEAD, manifests and custom bytes untouched', async (context) => {
  const folder = target(context);
  const before = head(folder);
  const manifest = readFileSync(path.join(folder, 'package.json'));
  await assert.rejects(
    appendTemplate(
      source,
      folder,
      { appName: 'web' },
      {
        run: async () => {
          throw new Error('fixture install failed');
        },
      }
    ),
    /fixture install failed/
  );
  assert.equal(head(folder), before);
  assert.deepEqual(readFileSync(path.join(folder, 'package.json')), manifest);
  assert.equal(existsSync(path.join(folder, 'apps/web')), false);
  clean(folder);
});
test('target bootstrap failure rolls back only this task and creates no commit', async (context) => {
  const folder = target(context);
  const before = head(folder);
  await assert.rejects(
    appendTemplate(
      source,
      folder,
      { appName: 'web' },
      {
        run: async (cwd, args) => {
          if (cwd === folder && args[0] === 'bootstrap')
            throw new Error('fixture bootstrap failed');
        },
      }
    ),
    /fixture bootstrap failed/
  );
  assert.equal(head(folder), before);
  assert.equal(existsSync(path.join(folder, 'apps/web')), false);
  clean(folder);
});
test('concurrent ignored app contents are never treated as a failed generator-owned directory', async (context) => {
  const folder = target(context);
  const custom = path.join(folder, 'apps/web/.local/content.json');
  await assert.rejects(
    appendTemplate(
      source,
      folder,
      { appName: 'web' },
      {
        run: async () => {
          if (!existsSync(custom)) {
            mkdirSync(path.dirname(custom), { recursive: true });
            writeFileSync(custom, 'owned by user');
          }
        },
      }
    ),
    /already exists/
  );
  assert.equal(readFileSync(custom, 'utf8'), 'owned by user');
  assert.equal(existsSync(path.join(folder, 'apps/web/package.json')), false);
  clean(folder);
});
test('pre-commit hooks remain active; rejection restores tracked files and index', async (context) => {
  const folder = target(context);
  const hook = git(folder, [
    'rev-parse',
    '--path-format=absolute',
    '--git-path',
    'hooks/pre-commit',
  ]).trim();
  writeFileSync(hook, '#!/bin/sh\nexit 1\n');
  chmodSync(hook, 0o755);
  const before = head(folder);
  await assert.rejects(appendTemplate(source, folder, { appName: 'web' }, { run: noCommands }));
  assert.equal(head(folder), before);
  assert.equal(existsSync(path.join(folder, 'apps/web')), false);
  clean(folder);
});

test('library-only creation uses the same baseline and remains a valid target for later apps', async (context) => {
  const folder = path.join(root, 'library-project');
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  await cloneRepository(
    source,
    folder,
    { name: '@library/project', kind: 'library', template: 'node-library' },
    { run: noCommands }
  );
  assert.equal(git(folder, ['rev-list', '--count', 'HEAD']).trim(), '2');
  assert.ok(existsSync(path.join(folder, 'packages/shared/example-library/package.json')));
  assert.equal(existsSync(path.join(folder, 'apps/web')), false);
  await appendTemplate(source, folder, { appName: 'web' }, { run: noCommands });
  assert.equal(git(folder, ['rev-list', '--count', 'HEAD']).trim(), '3');
  clean(folder);
});
