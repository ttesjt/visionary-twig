/* global fetch */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

const sourceRoot = path.resolve(import.meta.dirname, '../..');
const tsc = createRequire(import.meta.url).resolve('typescript/lib/tsc.js');

function fixture(context) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'gallery-runner-')));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  function write(file, value) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  }
  for (const file of [
    'scripts/dev.mjs',
    'scripts/run-dev-server.mjs',
    'scripts/lib/dev-server/options.mjs',
    'scripts/lib/dev-server/ports.mjs',
    'scripts/lib/dev-server/server.mjs',
    'scripts/test-e2e.mjs',
    'scripts/lib/processes.mjs',
    'scripts/lib/workspace-discovery.mjs',
    'scripts/lib/workspace-layers.mjs',
    'scripts/lib/runner-options.mjs',
    'tooling/workspace-apps.ts',
    'scripts/workspace/options.mjs',
    'scripts/workspace/targets.mjs',
    'scripts/workspace/packages.mjs',
    'scripts/workspace/hooks.mjs',
    'scripts/workspace/help.mjs',
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    copyFileSync(path.join(sourceRoot, file), path.join(root, file));
  }
  write('package.json', { type: 'module', workspaceDefaultApp: 'web' });
  write('packages/shared/sample/package.json', { name: '@fixture/sample' });
  function app(id, devPort = 3009, metadata = {}) {
    write(`apps/${id}/package.json`, {
      dependencies: { '@fixture/sample': 'workspace:*' },
      workspaceKind: 'next-app',
      workspaceApp: {
        devPort,
        testPort: 3139,
        hostname: '127.0.0.1',
        testConfig: 'playwright.config.ts',
        ...metadata,
      },
    });
    write(`apps/${id}/playwright.config.ts`, '');
  }
  write(
    'fake-pnpm.mjs',
    `
    import { appendFileSync } from 'node:fs';
    const args = process.argv.slice(2);
    appendFileSync('calls.jsonl', JSON.stringify({ args, port: process.env.PLAYWRIGHT_PORT, site: process.env.SITE_ENABLE_EXAMPLES, token: process.env.CONTENT_RUNTIME_FIXTURE_TOKEN, tracking: process.env.NEXT_PUBLIC_EVENT_TRACKING_URL, serverTracking: process.env.EVENT_TRACKING_URL }) + '\\n');
    if (process.env.FAIL_BUILD && args.includes('build') && args[1]?.startsWith('./apps/')) process.exit(7);
  `
  );
  const env = {
    ...process.env,
    CONTENT_RUNTIME_FIXTURE_TOKEN: 'fixture',
    npm_execpath: path.join(root, 'fake-pnpm.mjs'),
  };
  return {
    root,
    write,
    app,
    env,
    run: (args, extraEnv = {}) =>
      spawnSync(process.execPath, ['scripts/test-e2e.mjs', ...args], {
        cwd: root,
        env: { ...env, ...extraEnv },
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

test('E2E CLI builds only selected dependencies and applies the declared host environment', (context) => {
  const project = fixture(context);
  project.app('web');
  project.app('sandbox', 3009, { testHook: 'test-hook.mjs' });
  project.write(
    'apps/sandbox/test-hook.mjs',
    `export function environment({environment}) {const result={...environment};delete result.SITE_ENABLE_EXAMPLES;delete result.CONTENT_RUNTIME_FIXTURE_TOKEN;return result;}`
  );
  const result = project.run(['--app', 'sandbox'], {
    SITE_ENABLE_EXAMPLES: '1',
    CONTENT_RUNTIME_FIXTURE_TOKEN: 'fixture',
    PLAYWRIGHT_PORT: '3192',
  });
  assert.equal(result.status, 0, result.stderr);
  const calls = project.calls();
  assert.deepEqual(
    calls.map((call) => call.args),
    [
      ['--filter', './packages/shared/sample', '--if-present', 'build'],
      ['--filter', './apps/sandbox', 'build'],
      [
        'exec',
        'playwright',
        'test',
        '--config',
        path.join(project.root, 'apps/sandbox/playwright.config.ts'),
      ],
    ]
  );
  assert.ok(
    calls
      .slice(1)
      .every((call) => call.port === '3192' && call.site === undefined && call.token === undefined)
  );
});

test('all enumerates existing apps while invalid/missing targets and ports fail before commands', (context) => {
  const project = fixture(context);
  project.app('web');
  project.app('sandbox');
  for (const [args, env] of [
    [['--app', 'studio'], {}],
    [['--app', 'sandbox', '--production-defaults'], {}],
    [[], { PLAYWRIGHT_PORT: '0' }],
  ]) {
    assert.notEqual(project.run(args, env).status, 0);
    assert.deepEqual(project.calls(), []);
  }
  assert.equal(project.run(['--all']).status, 0);
  assert.deepEqual(
    project
      .calls()
      .filter((call) => call.args.includes('build') && call.args[1]?.startsWith('./apps/'))
      .map((call) => call.args[1]),
    ['./apps/sandbox', './apps/web']
  );
});

test('a failed app build preserves its status and never launches browser tests', (context) => {
  const project = fixture(context);
  project.app('web');
  assert.equal(project.run([], { FAIL_BUILD: '1' }).status, 7);
  assert.equal(project.calls().length, 2);
});

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (typeof address !== 'object' || !address) throw new Error('Expected an ephemeral address.');
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return port;
}

test(
  'dev CLI builds dist, runs a real TypeScript watch and updates the selected host',
  { timeout: 20_000 },
  async (context) => {
    const project = fixture(context);
    const port = await freePort();
    project.app('sandbox', port);
    project.write(
      'packages/shared/sample/src/index.ts',
      "export const message = 'before-watch-change';"
    );
    project.write('packages/shared/sample/tsconfig.json', {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        outDir: 'dist',
        types: [],
        skipLibCheck: true,
      },
      include: ['src/*.ts'],
    });
    project.write(
      'fake-pnpm.mjs',
      `
    import { spawnSync, spawn } from 'node:child_process';
    import { createServer } from 'node:http';
    import { readFileSync } from 'node:fs';
    const args = process.argv.slice(2);
    const compiler = ${JSON.stringify(tsc)};
    if (args[1] === './packages/shared/sample' && args.at(-1)==='build') {
      process.exitCode = spawnSync(process.execPath, [compiler, '-p', 'packages/shared/sample/tsconfig.json'], { stdio: 'inherit' }).status;
    } else if (args[1] === './packages/shared/sample') {
      spawn(process.execPath, [compiler, '-p', 'packages/shared/sample/tsconfig.json', '--watch'], { stdio: 'inherit' });
    } else if (args[1] === './apps/sandbox') {
      createServer((_request, response) => response.end(readFileSync('packages/shared/sample/dist/index.js'))).listen(Number(args.at(-1)), '127.0.0.1');
    } else throw new Error('Unexpected dev target.');
  `
    );
    const runner = spawn(process.execPath, ['scripts/dev.mjs', '--app', 'sandbox'], {
      cwd: project.root,
      env: project.env,
      stdio: 'pipe',
    });
    let output = '';
    runner.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    runner.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    const exited = once(runner, 'exit');
    context.after(async () => {
      if (runner.exitCode === null) {
        runner.kill('SIGTERM');
        await exited;
      }
    });
    async function waitForText(text) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (runner.exitCode !== null) assert.fail(output);
        try {
          if (
            (await (await fetch(`http://127.0.0.1:${port}`)).text()).includes(text) &&
            output.includes('Watching for file changes')
          )
            return;
        } catch (error) {
          if (error.cause?.code !== 'ECONNREFUSED') throw error;
        }
        await setTimeout(50);
      }
      assert.fail(`Host did not receive ${text}. ${output}`);
    }
    await waitForText('before-watch-change');
    project.write(
      'packages/shared/sample/src/index.ts',
      "export const message = 'after-watch-change';"
    );
    await waitForText('after-watch-change');
    runner.kill('SIGINT');
    assert.equal((await exited)[0], 130);
    await assert.rejects(fetch(`http://127.0.0.1:${port}`));
  }
);

test('E2E grep reaches Playwright as one argument without a shell', (context) => {
  const project = fixture(context);
  project.app('web');
  const pattern = 'fixed theme policy|SSR';
  assert.equal(project.run(['--grep', pattern]).status, 0);
  assert.deepEqual(project.calls().at(-1).args.slice(-2), ['--grep', pattern]);
});

test('E2E CLI pins tracking configuration for package build, app build and browser start', (context) => {
  const project = fixture(context);
  project.app('sandbox');
  const inherited = {
    NEXT_PUBLIC_EVENT_TRACKING_URL: 'https://analytics.example.com/capture',
    EVENT_TRACKING_URL: 'https://analytics.example.com/server',
    TEST_EVENT_TRACKING_URL: '',
  };
  assert.equal(project.run(['--app', 'sandbox'], inherited).status, 0);
  assert.ok(project.calls().every((call) => call.tracking === '' && call.serverTracking === ''));
  const fixtureEndpoint = 'https://events.example.test/capture';
  assert.equal(
    project.run(['--app', 'sandbox'], { ...inherited, TEST_EVENT_TRACKING_URL: fixtureEndpoint })
      .status,
    0
  );
  assert.ok(
    project
      .calls()
      .slice(-3)
      .every((call) => call.tracking === fixtureEndpoint && call.serverTracking === '')
  );
});

for (const id of ['sandbox', 'template-sample']) {
  test(
    'dev CLI fallback and strict overrides work for ' + id,
    { timeout: 20_000 },
    async (context) => {
      const project = fixture(context);
      const blocker = createServer();
      blocker.listen(0, '127.0.0.1');
      await once(blocker, 'listening');
      context.after(() => blocker.close());
      const address = blocker.address();
      assert.ok(address && typeof address !== 'string');
      const preferred = address.port;
      if (id === 'sandbox') project.app(id, preferred);
      else {
        project.write('packages/templates/sample/package.json', {
          workspaceKind: 'next-app',
          workspaceApp: {
            devPort: preferred,
            testPort: 3139,
            hostname: '127.0.0.1',
            testConfig: 'playwright.config.ts',
          },
        });
        project.write('packages/templates/sample/playwright.config.ts', '');
      }
      project.write(
        'fake-pnpm.mjs',
        `
      import {createServer} from 'node:http';
      const args=process.argv.slice(2);
      if(args.at(-1)==='build') process.exit(0);
      if(args.includes('--parallel')) setInterval(()=>{},1000);
      else {
        const port=Number(args.at(-1));
        const server=createServer((_request,response)=>response.end('selected-host'));
        server.on('error', error=>{console.error('Failed to start server');console.error(error);process.exitCode=1;});
        server.listen(port,'127.0.0.1',()=>console.log('Ready in 1ms'));
      }
    `
      );
      const strict = spawnSync(
        process.execPath,
        ['scripts/dev.mjs', '--app', id, '--port', String(preferred)],
        {
          cwd: project.root,
          env: { ...project.env, APP_DEV_PORT: '', PORT: '' },
          encoding: 'utf8',
          timeout: 10_000,
        }
      );
      assert.equal(strict.status, 1, strict.stdout + strict.stderr);
      assert.match(strict.stderr, /already in use/);
      for (const flags of [[], ['--port', String(preferred), '--port-fallback']]) {
        const runner = spawn(process.execPath, ['scripts/dev.mjs', '--app', id, ...flags], {
          cwd: project.root,
          env: { ...project.env, APP_DEV_PORT: '', PORT: '' },
          stdio: 'pipe',
        });
        let output = '';
        runner.stdout.on('data', (chunk) => {
          output += chunk.toString();
        });
        runner.stderr.on('data', (chunk) => {
          output += chunk.toString();
        });
        const closed = once(runner, 'close');
        context.after(async () => {
          if (runner.exitCode === null) {
            runner.kill('SIGTERM');
            await closed;
          }
        });
        for (let attempt = 0; attempt < 150 && !output.includes('Ready in'); attempt++) {
          if (runner.exitCode !== null) assert.fail(output);
          await setTimeout(30);
        }
        assert.match(output, /already in use; trying/);
        assert.ok(output.includes('[dev:' + id + '] checkout: ' + project.root), output);
        const url = output.match(/starting: (http:\/\/127\.0\.0\.1:(\d+))/u);
        assert.ok(url, output);
        assert.ok(Number(url[2]) > preferred && Number(url[2]) <= preferred + 10);
        assert.equal(await (await fetch(url[1])).text(), 'selected-host');
        runner.kill('SIGINT');
        assert.equal((await closed)[0], 130, output);
        await assert.rejects(fetch(url[1]));
      }
      assert.equal(
        await new Promise((resolve) => {
          const probe = createServer();
          probe.once('error', () => resolve(true));
          probe.listen(preferred, '127.0.0.1', () => probe.close(() => resolve(false)));
        }),
        true
      );
    }
  );
}
