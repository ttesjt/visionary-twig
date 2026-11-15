import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { createTemplateProject } from '../templates/generate.mjs';

const source = path.resolve(import.meta.dirname, '../..');
test('workspace skeleton delivers user tooling without source identity, generators or registry credentials', async (context) => {
  const folder = mkdtempSync(path.join(tmpdir(), 'workspace-delivery-'));
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  const target = path.join(folder, 'project');
  await createTemplateProject(source, target, {
    name: '@delivery/project',
    templates: ['plain-next'],
  });
  const read = (file) => readFileSync(path.join(target, file), 'utf8');
  const manifest = JSON.parse(read('package.json'));
  assert.equal(manifest.license, 'MIT-0');
  assert.equal(read('LICENSE'), readFileSync(path.join(source, 'scaffolds/LICENSE-MIT-0'), 'utf8'));
  for (const field of ['author', 'repository', 'homepage', 'bugs'])
    assert.equal(manifest[field], undefined);
  for (const command of ['template:clone', 'repo:clone', 'test:templates'])
    assert.equal(manifest.scripts[command], undefined);
  for (const file of ['scripts/clone-template.mjs', 'scripts/templates', 'packages/templates'])
    assert.equal(existsSync(path.join(target, file)), false);
  assert.doesNotMatch(read('.npmrc'), /NODE_AUTH_TOKEN|npm.pkg.github.com/);
  assert.deepEqual(parse(read('pnpm-workspace.yaml')).packages, [
    'apps/*',
    'packages/shared/*',
    'packages/site/*',
    'packages/adapters/*',
  ]);
  assert.equal(
    manifest.packageManager,
    JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8')).packageManager
  );
  assert.match(read('README.md'), /@delivery\/project/);
  assert.ok(existsSync(path.join(target, 'packages/site/README.md')));
  assert.ok(existsSync(path.join(target, 'packages/adapters/README.md')));
});
