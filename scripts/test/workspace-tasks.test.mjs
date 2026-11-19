import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const source = path.resolve(import.meta.dirname, '../..');
function fixture(t, { hosts = true, prepared = true, templatePolicy = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'workspace-tasks-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  };
  for (const file of [
    'scripts/run-workspace.mjs',
    'scripts/workspace/package-tasks.mjs',
    'scripts/workspace/tasks.mjs',
    'scripts/workspace/options.mjs',
    'scripts/workspace/packages.mjs',
    'scripts/workspace/targets.mjs',
    'scripts/lib/workspace-discovery.mjs',
    'scripts/lib/workspace-layers.mjs',
    'scripts/lib/processes.mjs',
    'tooling/workspace-apps.ts',
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    copyFileSync(path.join(source, file), path.join(root, file));
  }
  write('package.json', {
    type: 'module',
    scripts: {
      ...(prepared ? { 'app:check': 'unused-fixture-command' } : {}),
      ...(templatePolicy ? { 'check:templates': 'source-only-fixture-command' } : {}),
    },
  });
  write('packages/shared/library/package.json', { name: '@fixture/library' });
  if (hosts)
    for (const [parent, id] of [
      ['apps', 'website'],
      ['packages/templates', 'starter'],
    ]) {
      write(parent + '/' + id + '/playwright.config.ts', '');
      write(parent + '/' + id + '/package.json', {
        name: '@fixture/' + id,
        workspaceKind: 'next-app',
        workspaceApp: {
          devPort: 3000,
          testPort: 3100,
          hostname: '127.0.0.1',
          testConfig: 'playwright.config.ts',
        },
      });
    }
  write(
    'fake-pnpm.mjs',
    `
    import { appendFileSync } from 'node:fs';
    const args = process.argv.slice(2);
    appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
    if (process.env.FAIL_CONTAINS && args.includes(process.env.FAIL_CONTAINS)) process.exit(23);
  `
  );
  return {
    run: (args, env = {}) =>
      spawnSync(process.execPath, ['scripts/run-workspace.mjs', ...args], {
        cwd: root,
        env: { ...process.env, npm_execpath: path.join(root, 'fake-pnpm.mjs'), ...env },
        encoding: 'utf8',
      }),
    calls: () =>
      existsSync(path.join(root, 'calls.jsonl'))
        ? readFileSync(path.join(root, 'calls.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line))
        : [],
  };
}
const builds = (calls) => calls.filter((args) => args.at(-1) === 'build');
test('aggregate validation builds libraries once before checks and each discovered host once after tests', (t) => {
  const f = fixture(t);
  const result = f.run(['validate']);
  assert.equal(result.status, 0, result.stderr);
  const calls = f.calls();
  const buildCalls = builds(calls);
  assert.equal(buildCalls.length, 3);
  assert.ok(buildCalls[0].includes('./packages/shared/*'));
  assert.deepEqual(buildCalls.slice(1), [
    ['--filter', './apps/website', 'build'],
    ['--filter', './packages/templates/starter', 'build'],
  ]);
  assert.deepEqual(calls[0], ['check:workspace', '--source']);
  assert.ok(calls.findIndex((args) => args[0] === 'app:check') > calls.indexOf(buildCalls[0]));
  assert.ok(calls.findIndex((args) => args[0] === 'test:tooling') < calls.indexOf(buildCalls[1]));
  for (const required of [
    'eslint',
    'tsc',
    'lint',
    'typecheck',
    'test',
    'format:check',
    'check:workspace',
  ])
    assert.ok(
      calls.some((args) => args.includes(required)),
      required
    );
  for (const forbidden of [
    'install',
    'app:prepare',
    'build:apps',
    'build:templates',
    'typecheck:all',
    'lint:root',
    'validate',
  ])
    assert.equal(
      calls.some((args) => args[0] === forbidden),
      false,
      forbidden
    );
});
test('validation fails immediately and preserves the failed stage exit status', (t) => {
  const f = fixture(t);
  const result = f.run(['validate'], { FAIL_CONTAINS: 'tsc' });
  assert.equal(result.status, 23, result.stderr);
  assert.ok(f.calls().at(-1).includes('tsc'));
  assert.equal(builds(f.calls()).length, 1);
  assert.equal(
    f.calls().some((args) => args.includes('test:tooling')),
    false
  );
});
for (const args of [['typecheck'], ['test'], ['test', '--coverage']])
  test(
    'standalone ' + args.join(' ') + ' builds its library inputs without aggregate aliases',
    (t) => {
      const f = fixture(t);
      const result = f.run(args);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(builds(f.calls()).length, 1);
      assert.equal(
        f.calls().some((call) => call[0] === 'app:prepare'),
        false
      );
      assert.ok(
        f
          .calls()
          .at(-1)
          .includes(args.includes('--coverage') ? 'test:coverage' : args[0])
      );
    }
  );
test('library-only validation has no prepared-input or application requirement', (t) => {
  const f = fixture(t, { hosts: false, prepared: false });
  const result = f.run(['validate']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(builds(f.calls()).length, 1);
  assert.equal(
    f.calls().some((args) => args[0] === 'app:check'),
    false
  );
});
test('watch remains read-only to builds and conflicting flags fail before executing commands', (t) => {
  const f = fixture(t);
  for (const args of [
    ['test', '--watch', '--coverage'],
    ['lint', '--all'],
    ['validate', '--app', 'website'],
  ]) {
    assert.notEqual(f.run(args).status, 0);
    assert.deepEqual(f.calls(), []);
  }
  assert.equal(f.run(['test', '--watch']).status, 0);
  assert.equal(builds(f.calls()).length, 0);
  assert.ok(f.calls().at(-1).includes('test:watch'));
});

test('source-template validation is opt-in and fails before ordinary checks when configured', (t) => {
  const f = fixture(t, { templatePolicy: true });
  const result = f.run(['validate'], { FAIL_CONTAINS: 'check:templates' });
  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(f.calls().at(-1), ['check:templates']);
  assert.equal(
    f.calls().some((call) => call[0] === 'app:check'),
    false
  );
});
