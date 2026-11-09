import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { cloneRepository } from '../generation/create.mjs';
import { appendTemplate } from '../generation/append.mjs';
import { git } from '../generation/git.mjs';
import { copySource } from '../templates/files.mjs';
import { checkDeliveredDocumentation } from '../templates/documentation.mjs';
import { checkDocumentationLinks } from '../lib/documentation-links.mjs';

const source = path.resolve(import.meta.dirname, '../..');
// Filesystem/Git acceptance here; public CLI acceptance runs real pnpm commands separately.
const noCommands = async () => {};
const scenarios = [
  { id: 'bare', options: { bare: true }, apps: [] },
  { id: 'default', options: {}, apps: ['web'] },
  { id: 'plain-next', options: { bare: true }, add: { appName: 'welcome' }, apps: ['welcome'] },
  { id: 'node-library', options: { kind: 'library', template: 'node-library' }, apps: [] },
  { id: 'renamed-studio', options: { template: 'studio', appName: 'editor' }, apps: ['editor'] },
];

for (const scenario of scenarios) {
  test(`${scenario.id} keeps scaffold ownership and closes delivered file and fragment links`, async (context) => {
    const parent = mkdtempSync(path.join(tmpdir(), 'template-documentation-'));
    context.after(() => rmSync(parent, { recursive: true, force: true }));
    const destination = path.join(parent, 'project');
    await cloneRepository(
      source,
      destination,
      { name: '@docs-test/project', ...scenario.options },
      { run: noCommands }
    );
    const baselineReadme = git(destination, [
      'show',
      'HEAD~' + (scenario.options.bare ? '0' : '1') + ':README.md',
    ]);
    if (scenario.add) await appendTemplate(source, destination, scenario.add, { run: noCommands });
    assert.equal(readFileSync(path.join(destination, 'README.md'), 'utf8'), baselineReadme);
    assert.deepEqual(checkDocumentationLinks(destination), []);
    for (const absent of [
      'packages/templates',
      'scaffolds',
      'docs/common',
      'docs/template-repository',
      'docs/provider-inventory.md',
      'scripts/generation',
      'scripts/templates',
    ])
      assert.equal(existsSync(path.join(destination, absent)), false, absent);
    for (const guide of [
      'resource-model',
      'app-config',
      'providers',
      'content-runtime',
      'commands',
    ])
      assert.ok(existsSync(path.join(destination, 'docs', guide + '.md')), guide);
    for (const app of scenario.apps)
      assert.ok(existsSync(path.join(destination, 'apps', app, 'README.md')), app);
    const readme = readFileSync(
      path.join(destination, 'packages/shared/puck-adapter/README.md'),
      'utf8'
    );
    assert.doesNotMatch(readme, /templates\/studio|apps\/studio|docs\/common\//);
    assert.match(readme, /\]\(\.\.\/\.\.\/\.\.\/docs\/content-runtime.md\)/);
    writeFileSync(path.join(destination, 'docs/broken.md'), '[regression](missing.md)');
    assert.throws(
      () => checkDeliveredDocumentation(destination),
      /docs\/broken.md:1: Missing local destination: missing.md/
    );
  });
}

test('app addition checks incoming guides without validating or rewriting preexisting user docs', async (context) => {
  const parent = mkdtempSync(path.join(tmpdir(), 'owned-documentation-'));
  context.after(() => rmSync(parent, { recursive: true, force: true }));
  const destination = path.join(parent, 'project');
  await cloneRepository(source, destination, { bare: true }, { run: noCommands });
  const owned = path.join(destination, 'docs/user-guide.md');
  const contents = '# User-owned guide\n[unfinished](not-written-yet.md)\n';
  writeFileSync(owned, contents);
  git(destination, ['add', 'docs/user-guide.md']);
  git(destination, ['commit', '-m', 'docs: draft user guide']);
  await appendTemplate(
    source,
    destination,
    { appName: 'editor', template: 'studio' },
    { run: noCommands }
  );
  assert.equal(readFileSync(owned, 'utf8'), contents);
  assert.ok(existsSync(path.join(destination, 'apps/editor/README.md')));
  assert.equal(checkDocumentationLinks(destination).length, 1);
});

test('invalid foundation documentation fails before publishing an output and preserves source inputs', async (context) => {
  const parent = mkdtempSync(path.join(tmpdir(), 'broken-template-documentation-'));
  context.after(() => rmSync(parent, { recursive: true, force: true }));
  const fixture = path.join(parent, 'source');
  copySource(source, fixture, ['packages/site', 'packages/adapters']);
  git(fixture, ['init', '--quiet', '--initial-branch=main']);
  git(fixture, ['add', 'package.json']);
  git(fixture, ['commit', '-m', 'test: initialize source fixture']);
  const guide = path.join(fixture, 'scaffolds/monorepo/docs/commands.md');
  const broken = readFileSync(guide, 'utf8') + '\n[missing](not-delivered.md)\n';
  writeFileSync(guide, broken);
  const destination = path.join(parent, 'output');
  await assert.rejects(
    cloneRepository(fixture, destination, { bare: true }, { run: noCommands }),
    /docs\/commands.md:\d+: Missing local destination: not-delivered.md/
  );
  assert.equal(existsSync(destination), false);
  assert.equal(readFileSync(guide, 'utf8'), broken);
});
