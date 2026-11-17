import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { URL } from 'node:url';

const FOUNDATION = 'packages/shared/foundation';
const FEATURE = 'packages/shared/feature';
const CONSUMER = 'packages/shared/consumer';
const STARTER = 'packages/templates/starter';
const TEST_MODULE = new URL('../ci/standard.mjs', import.meta.url).href;

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'standard-validation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content));
  };
  const git = (...args) =>
    execFileSync(
      'git',
      ['-c', 'user.name=Verification', '-c', 'user.email=verification@example.test', ...args],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
  const commit = (message) => {
    git('add', '--all');
    git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };

  git('init', '-q', '-b', 'main');
  for (const directory of [FOUNDATION, FEATURE, CONSUMER, STARTER]) {
    const name = path.basename(directory);
    const upstream = directory === FEATURE ? 'foundation' : 'feature';
    const host = directory === STARTER;
    write(directory + '/package.json', {
      name: '@fixture/' + name,
      scripts: { lint: 'fixture', test: 'fixture', build: 'fixture' },
      ...(directory === FOUNDATION
        ? {}
        : { dependencies: { ['@fixture/' + upstream]: 'workspace:*' } }),
      ...(host
        ? {
            workspaceKind: 'next-app',
            workspaceApp: {
              devPort: 3000,
              testPort: 3100,
              hostname: '127.0.0.1',
              testConfig: 'playwright.config.ts',
            },
          }
        : {}),
    });
    write(directory + '/src/example.ts', 'export const example = 1;');
  }
  write(STARTER + '/playwright.config.ts', '');
  write('packages/templates/node-library/package.json', {
    name: '@fixture/node-library',
    workspaceKind: 'node-library',
    scripts: { lint: 'fixture', test: 'fixture' },
  });
  write(
    'fake-pnpm.mjs',
    `
    import { appendFileSync } from 'node:fs';
    const args = process.argv.slice(2);
    appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
    if (args.at(-1) === process.env.FAIL_TASK) process.exit(23);
  `
  );
  const base = commit('Initial workspaces');
  return {
    base,
    git,
    write,
    commit,
    run(revision, env = {}) {
      const log = path.join(root, 'calls.jsonl');
      rmSync(log, { force: true });
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          'import { runStandard } from ' +
            JSON.stringify(TEST_MODULE) +
            '; process.exitCode = await runStandard(process.cwd(), process.argv[1]);',
          revision,
        ],
        {
          cwd: root,
          env: { ...process.env, npm_execpath: path.join(root, 'fake-pnpm.mjs'), ...env },
          encoding: 'utf8',
        }
      );
      const calls = existsSync(log)
        ? readFileSync(log, 'utf8')
            .trimEnd()
            .split('\n')
            .map((line) => JSON.parse(line))
        : [];
      return { ...result, calls };
    },
  };
}

const call = (task, ...directories) => [
  ...directories.flatMap((directory) => ['--filter', './' + directory]),
  '--if-present',
  task,
];

test('Standard checks only changed workspaces across a multi-commit push', (t) => {
  const f = fixture(t);
  f.write(FEATURE + '/src/example.ts', 'export const example = 2;');
  f.commit('Change a library');
  f.write(STARTER + '/src/example.ts', 'export const example = 2;');
  f.commit('Change an app template');
  const result = f.run(f.base);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [
    call('build', FEATURE, FOUNDATION),
    call('lint', FEATURE, STARTER),
    call('test', FEATURE, STARTER),
  ]);
});

test('Standard excludes base-branch changes from the PR merge result', (t) => {
  const f = fixture(t);
  f.git('switch', '-qc', 'proposal');
  f.write(FEATURE + '/src/example.ts', 'export const example = 2;');
  f.commit('Change the proposal');
  f.git('switch', '-q', 'main');
  f.write(CONSUMER + '/src/example.ts', 'export const example = 2;');
  const prBase = f.commit('Advance the base branch');
  f.git('merge', '--no-ff', '--no-edit', 'proposal');
  const result = f.run(prBase);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [
    call('build', FEATURE, FOUNDATION),
    call('lint', FEATURE),
    call('test', FEATURE),
  ]);
});

test('Standard checks all active workspaces for shared configuration and an unavailable range', (t) => {
  const f = fixture(t);
  const expected = [
    call('build', CONSUMER, FEATURE, FOUNDATION),
    call('lint', CONSUMER, FEATURE, FOUNDATION, STARTER),
    call('test', CONSUMER, FEATURE, FOUNDATION, STARTER),
  ];
  for (const file of ['pnpm-lock.yaml', 'vitest.config.base.ts', 'tooling/eslint-base.mjs']) {
    f.write(file, 'fixture');
    f.commit('Change ' + file);
    const result = f.run('HEAD^');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls, expected, file);
  }
  const result = f.run('unavailable-base');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, expected);
});

test('Standard skips package checks for docs and inactive scaffolds', (t) => {
  const f = fixture(t);
  f.write('docs/example.md', '# Example');
  f.write('packages/templates/node-library/src/example.ts', 'export const example = 1;');
  f.commit('Change docs and an inactive scaffold');
  const result = f.run(f.base);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, []);
});

test('Standard checks both owners of a moved file and propagates check failures', (t) => {
  const f = fixture(t);
  f.git('mv', FEATURE + '/src/example.ts', CONSUMER + '/src/moved.ts');
  f.commit('Move a source file between workspaces');
  const result = f.run(f.base, { FAIL_TASK: 'lint' });
  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(result.calls, [
    call('build', CONSUMER, FEATURE, FOUNDATION),
    call('lint', CONSUMER, FEATURE),
  ]);
});
