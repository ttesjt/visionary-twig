import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { discoverApps, discoverTemplateApps } from '../../tooling/workspace-apps.ts';

const root = path.resolve(import.meta.dirname, '../..');
const json = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

test('source repository has templates without consuming apps or in-place creation', () => {
  assert.deepEqual(discoverApps(root), []);
  assert.equal(json('package.json').workspaceDefaultApp, undefined);
  assert.equal(json('package.json').scripts['app:create'], undefined);
  assert.deepEqual(
    discoverTemplateApps(root)
      .map((app) => app.id)
      .sort(),
    ['template-plain-next', 'template-studio']
  );
  for (const file of [
    'playwright.config.ts',
    'test/e2e',
    'scripts/create-app.mjs',
    'scripts/templates/create.mjs',
    'scripts/templates/verify-create.mjs',
    'scripts/migrate-profile.mjs',
  ])
    assert.equal(existsSync(path.join(root, file)), false, file);
});

test('template planning treats provenance as metadata and works without Git on PATH', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { planProject } from './scripts/templates/plan.mjs';
    const plan = await planProject(process.cwd());
    console.log(JSON.stringify(plan.templates.map(({id, origin}) => ({id, origin}))));
  `,
    ],
    { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: '' } }
  );
  assert.equal(result.status, 0, result.stderr);
  const entries = JSON.parse(result.stdout);
  assert.deepEqual(
    entries.map(({ id }) => id),
    ['plain-next', 'studio']
  );
  for (const { id, origin } of entries) {
    assert.equal(origin.path, 'packages/templates/' + id);
    assert.match(origin.commit, /^[a-f0-9]{40}$/u);
    assert.equal(existsSync(path.join(root, origin.path, 'package.json')), true);
  }
});
