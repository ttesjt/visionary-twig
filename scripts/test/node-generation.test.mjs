import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { appendTemplate } from '../generation/append.mjs';
import { cloneRepository } from '../generation/create.mjs';
import { git } from '../generation/git.mjs';
import { generationOptions } from '../generation/options.mjs';
import { readWorkspaceRecord } from '../generation/record.mjs';
import { checkDeliveredDocumentation } from '../templates/documentation.mjs';

const source = path.resolve(import.meta.dirname, '../..');
function projectPath(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'node-generation-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return path.join(root, 'project');
}

test('the Node preset rejects options that select frontend content or browsers', () => {
  const nodeOptions = ['--output', '/tmp/project', '--preset', 'node'];
  assert.equal(generationOptions(nodeOptions, 'repository').template, 'node-library');
  for (const flags of [
    ['--bare'],
    ['--template', 'plain-next'],
    ['--app-name', 'web'],
    ['--browser'],
  ])
    assert.throws(
      () => generationOptions([...nodeOptions, ...flags], 'repository'),
      /--preset node cannot be combined/
    );
  assert.throws(
    () => generationOptions(['--output', '/tmp/project', '--preset', 'unknown'], 'repository'),
    /Unknown workspace preset/
  );
});

test('Node delivery initializes two commits without frontend tools or seeded browser test peers', async (context) => {
  const target = projectPath(context);
  const commands = [];
  const result = await cloneRepository(
    source,
    target,
    { preset: 'node', name: '@node-fixture/project' },
    { run: async (_directory, args) => commands.push(args) }
  );
  const read = (file) => readFileSync(path.join(target, file), 'utf8');
  assert.equal(git(target, ['rev-list', '--count', 'HEAD']).trim(), '2');
  assert.equal(git(target, ['rev-parse', 'HEAD^']).trim(), result.baseCommit);
  assert.equal(
    git(target, ['log', '-1', '--format=%s']).trim(),
    'feat(example-library): initialize from node-library'
  );
  assert.equal(git(target, ['remote']), '');
  assert.equal(git(target, ['status', '--porcelain']), '');
  assert.equal(readWorkspaceRecord(target).preset, 'node');
  assert.equal(JSON.parse(read('package.json')).license, 'MIT-0');
  assert.equal(read('LICENSE'), readFileSync(path.join(source, 'scaffolds/LICENSE-MIT-0'), 'utf8'));
  assert.deepEqual(parse(read('pnpm-workspace.yaml')).packages, ['packages/*']);
  assert.equal(
    JSON.parse(read('packages/example-library/package.json')).name,
    '@node-fixture/example-library'
  );
  assert.equal(
    JSON.parse(read('packages/example-library/tsconfig.json')).extends,
    '../../tsconfig.node.json'
  );
  assert.match(
    read('packages/example-library/vitest.config.ts'),
    /'\.\.\/\.\.\/vitest.config.base.js'/u
  );
  assert.doesNotMatch(read('pnpm-lock.yaml'), /jsdom@|happy-dom@|react@|next@|playwright@/u);
  for (const file of [
    'apps',
    'packages/shared',
    'packages/templates',
    'tsconfig.react.json',
    'scripts/prepare-app.mjs',
    'tooling/workspace-apps.ts',
  ])
    assert.equal(existsSync(path.join(target, file)), false, file);
  assert.equal(commands.filter(([command]) => command === 'validate').length, 2);
  assert.ok(commands.every(([command]) => command === 'install' || command === 'validate'));
  assert.equal(JSON.parse(read('package.json')).scripts['app:prepare'], undefined);
  checkDeliveredDocumentation(target);
});

test('existing target and frontend addition to a Node project preserve the target', async (context) => {
  const target = projectPath(context);
  const options = { preset: 'node' };
  const run = async () => {};
  const result = await cloneRepository(source, target, options, { run });
  assert.equal(readWorkspaceRecord(target).projectName, '@workspace/starter');
  const privateFile = path.join(target, '.env');
  writeFileSync(privateFile, 'OWNED_BY_USER=1\n');
  const rejectRun = async () => assert.fail('No target command should run');
  await assert.rejects(
    cloneRepository(source, target, options, { run: rejectRun }),
    /already exists/
  );
  await assert.rejects(
    appendTemplate(source, target, { appName: 'web' }, { run: rejectRun }),
    /require a frontend workspace/
  );
  assert.equal(git(target, ['rev-parse', 'HEAD']).trim(), result.commit);
  assert.equal(git(target, ['status', '--porcelain']), '');
  assert.equal(readFileSync(privateFile, 'utf8'), 'OWNED_BY_USER=1\n');
});

test('failed Node template qualification leaves only the initialized baseline', async (context) => {
  const target = projectPath(context);
  await assert.rejects(
    cloneRepository(
      source,
      target,
      { preset: 'node' },
      {
        run: async (directory, [command]) => {
          if (
            command === 'validate' &&
            existsSync(path.join(directory, 'packages/example-library'))
          )
            throw new Error('fixture validation failure');
        },
      }
    ),
    /workspace baseline is ready .*library initialization failed.*fixture validation failure/
  );
  assert.equal(git(target, ['rev-list', '--count', 'HEAD']).trim(), '1');
  assert.equal(git(target, ['status', '--porcelain']), '');
  assert.equal(existsSync(path.join(target, 'packages/example-library')), false);
});
