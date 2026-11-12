import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { git } from './generation/git.mjs';
import { addModuleTestFixtures, verifyModuleTests } from './generation/verify-module-tests.mjs';
import { readWorkspaceRecord } from './generation/record.mjs';
import { pnpmCommand, runProcesses } from './lib/processes.mjs';
import { checkDeliveredDocumentation } from './templates/documentation.mjs';
import { copySource, readJson, writeJson } from './templates/files.mjs';

const source = path.resolve(import.meta.dirname, '..');
const scratch = mkdtempSync(path.join(tmpdir(), 'node-workspace-verification-'));
console.log('Node workspace verification artifacts:', scratch);

const starter = 'packages/example-library';
const env = {
  ...process.env,
  CI: 'true',
  GIT_AUTHOR_NAME: 'Workspace verification',
  GIT_AUTHOR_EMAIL: 'verification@example.test',
  GIT_COMMITTER_NAME: 'Workspace verification',
  GIT_COMMITTER_EMAIL: 'verification@example.test',
};
delete env.NODE_PATH;
env.PATH = env.PATH?.split(path.delimiter)
  .filter((entry) => !entry.startsWith(source + path.sep))
  .join(path.delimiter);

async function run(cwd, args) {
  const result = await runProcesses([pnpmCommand(args)], { cwd, env });
  assert.equal(result, 0, 'pnpm ' + args.join(' ') + ' failed at ' + cwd);
}

function verifyArtifact(root, name) {
  const record = readWorkspaceRecord(root);
  assert.equal(record.projectName, name);
  assert.equal(record.preset, 'node');
  assert.deepEqual(record.applications, []);
  assert.equal(git(root, ['remote']), '');
  assert.equal(git(root, ['status', '--porcelain']), '');
  const commits = git(root, ['log', '--reverse', '--format=%s']).trim().split('\n');
  assert.deepEqual(commits, [
    'chore(workspace): initialize TypeScript monorepo',
    'feat(example-library): initialize from node-library',
  ]);
  const workspace = parse(readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'));
  assert.deepEqual(workspace.packages, ['packages/*']);
  const lock = parse(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'));
  assert.deepEqual(Object.keys(lock.importers).sort(), ['.', starter]);
  const frontendDependency =
    /^(?:react|react-dom|next|playwright|jsdom|happy-dom|eslint-config-next)@|^@(?:playwright|puckeditor|testing-library|next)\//u;
  assert.deepEqual(
    Object.keys(lock.packages).filter((key) => frontendDependency.test(key)),
    []
  );
  for (const absent of [
    'apps',
    'packages/shared',
    'packages/templates',
    'scaffolds',
    'tsconfig.react.json',
    'scripts/prepare-app.mjs',
    'docs/frontend-code-standards.md',
  ])
    assert.equal(existsSync(path.join(root, absent)), false, absent);
  assert.equal(
    readJson(path.join(root, starter, 'package.json')).name,
    record.scope + '/example-library'
  );
  checkDeliveredDocumentation(root);
  return record.scope;
}

async function detachedQualification(generated, scope) {
  const baseline = path.join(scratch, 'baseline');
  const consumerProject = path.join(scratch, 'independent');
  for (const [directory, revision] of [
    [baseline, 'HEAD^'],
    [consumerProject, 'HEAD'],
  ]) {
    git(source, ['clone', '--quiet', '--no-local', '--no-hardlinks', '--', generated, directory]);
    git(directory, ['checkout', '--quiet', '--detach', revision]);
    assert.equal(existsSync(path.join(directory, 'node_modules')), false);
    await run(directory, ['install', '--frozen-lockfile']);
    if (revision === 'HEAD') {
      await run(directory, ['build']);
      await run(directory, ['test']);
    }
    await run(directory, ['validate']);
    assert.equal(git(directory, ['status', '--porcelain']), '');
  }
  await verifyLocalConsumer(consumerProject, scope);
}

async function verifyLocalConsumer(project, scope) {
  const directory = path.join(project, 'packages/consumer');
  const libraryName = scope + '/example-library';
  const consumerName = scope + '/consumer';
  copySource(path.join(project, starter), directory);
  const manifestPath = path.join(directory, 'package.json');
  const manifest = readJson(manifestPath);
  writeJson(manifestPath, {
    ...manifest,
    name: consumerName,
    dependencies: { [libraryName]: 'workspace:*' },
  });

  const index = path.join(directory, 'src/index.ts');
  const validSource =
    "import { greet } from '" +
    libraryName +
    "';\n\nexport const message = greet({ name: 'consumer' });\n";
  writeFileSync(index, validSource);
  writeFileSync(
    path.join(directory, 'test/public-api.test.ts'),
    "import { expect, it } from 'vitest';\nimport { message } from '../src/index.js';\n\nit('consumes the built library', () => {\n  expect(message).toBe('Hello from consumer!');\n});\n"
  );

  addModuleTestFixtures(directory);
  await run(project, ['install', '--no-frozen-lockfile']);
  await run(project, ['install', '--frozen-lockfile']);
  await run(project, ['format']);
  await run(project, ['clean']);
  await run(project, ['validate']);
  await verifyModuleTests(project, directory, consumerName, scratch, run);

  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      'console.log((await import(' + JSON.stringify(consumerName) + ')).message);',
    ],
    { cwd: directory, env, encoding: 'utf8' }
  );
  assert.equal(output.trim(), 'Hello from consumer!');

  writeJson(manifestPath, { ...manifest, name: consumerName });
  writeFileSync(index, validSource.replace(libraryName, libraryName + '/src/lib/index.js'));
  const result = spawnSync(process.execPath, ['scripts/check-workspace.mjs', '--source'], {
    cwd: project,
    env,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /undeclared runtime dependency/u);
  assert.match(result.stderr, /non-public export/u);
  writeJson(manifestPath, {
    ...manifest,
    name: consumerName,
    dependencies: { [libraryName]: 'workspace:*' },
  });
  writeFileSync(index, validSource);
}

const generated = path.join(scratch, 'node-project');
await run(source, [
  'repo:clone',
  '--preset',
  'node',
  '--output',
  generated,
  '--name',
  '@node-check/workspace',
]);
await detachedQualification(generated, verifyArtifact(generated, '@node-check/workspace'));
const defaults = path.join(scratch, 'defaults');
await run(source, ['repo:clone', '--preset', 'node', '--output', defaults]);
verifyArtifact(defaults, '@workspace/starter');
console.log('Node workspace clone, standalone lifecycle and public package consumption passed.');
