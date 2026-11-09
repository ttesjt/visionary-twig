import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installPageErrorFixture } from '../templates/page-error-fixture.mjs';

function fixture(context) {
  const parent = mkdtempSync(path.join(tmpdir(), 'page-error-verification-'));
  const root = path.join(parent, 'project');
  context.after(() => rmSync(parent, { recursive: true, force: true }));
  const directory = path.join(root, 'apps/plain');
  const routeRoot = path.join(directory, 'src/app/[locale]');
  mkdirSync(routeRoot, { recursive: true });
  const layoutPath = path.join(routeRoot, 'layout.tsx');
  const layout = [
    '  return siteMetadata(await resourceRouteLocale(params));',
    '  const locale = await resourceRouteLocale(params);',
    '          <TrackingInitialization />',
    '',
  ].join('\n');
  writeFileSync(layoutPath, layout);
  return { parent, root, app: { directory }, routeRoot, layoutPath, layout };
}

test('page-error fault injection refuses a source Git worktree before writing', (context) => {
  const f = fixture(context);
  writeFileSync(path.join(f.root, '.git'), 'gitdir: original repository');
  assert.throws(() => installPageErrorFixture(f.root, f.app), /disposable clone/);
  assert.equal(readFileSync(f.layoutPath, 'utf8'), f.layout);
  assert.equal(existsSync(path.join(f.app.directory, '.cache')), false);
});

test('page-error fault injection preserves a preexisting route', (context) => {
  const f = fixture(context);
  const route = path.join(f.routeRoot, 'verification-root-client.tsx');
  writeFileSync(route, 'Keep existing code');
  assert.throws(() => installPageErrorFixture(f.root, f.app), /route already exists/);
  assert.equal(readFileSync(route, 'utf8'), 'Keep existing code');
  assert.equal(readFileSync(f.layoutPath, 'utf8'), f.layout);
});

test('page-error fault injection preserves an existing route directory without a page entry', (context) => {
  const f = fixture(context);
  const directory = path.join(f.routeRoot, 'verification-server-error');
  mkdirSync(directory);
  const existing = path.join(directory, 'keep.ts');
  writeFileSync(existing, 'Keep existing helper');
  assert.throws(() => installPageErrorFixture(f.root, f.app), /route already exists/);
  assert.equal(readFileSync(existing, 'utf8'), 'Keep existing helper');
  assert.equal(readFileSync(f.layoutPath, 'utf8'), f.layout);
});

test('an interrupted fault verification restores original bytes and leaves unrelated files alone', (context) => {
  const f = fixture(context);
  const local = path.join(f.app.directory, '.env.local');
  writeFileSync(local, 'Preserve local values\n');
  const owned = installPageErrorFixture(f.root, f.app);
  assert.notEqual(readFileSync(f.layoutPath, 'utf8'), f.layout);
  assert.throws(() => {
    try {
      owned.setFailure('root', true);
      throw new Error('Verification interrupted');
    } finally {
      owned.restore();
    }
  }, /Verification interrupted/);
  assert.equal(readFileSync(f.layoutPath, 'utf8'), f.layout);
  assert.equal(readFileSync(local, 'utf8'), 'Preserve local values\n');
  for (const name of [
    'verification-server-error',
    'verification-client-error',
    'verification-root-client.tsx',
  ])
    assert.equal(existsSync(path.join(f.routeRoot, name)), false);
  assert.equal(existsSync(path.join(f.app.directory, '.cache/page-error-verification')), false);
});

test('generated Git projects require their explicitly owned verification area', (context) => {
  const f = fixture(context);
  mkdirSync(path.join(f.root, '.git'));
  writeFileSync(path.join(f.root, '.workspace-template.json'), '{}');
  assert.throws(() => installPageErrorFixture(f.root, f.app), /explicit verification area/);
  const other = fixture(context);
  assert.throws(
    () => installPageErrorFixture(f.root, f.app, { verificationParent: other.parent }),
    /owned area/
  );
  const owned = installPageErrorFixture(f.root, f.app, { verificationParent: f.parent });
  owned.setFailure('page', true);
  owned.restore();
  assert.equal(readFileSync(f.layoutPath, 'utf8'), f.layout);
  assert.ok(existsSync(path.join(f.root, '.git')));
});
