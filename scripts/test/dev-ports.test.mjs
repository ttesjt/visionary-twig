import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { devOptions } from '../lib/dev-server/options.mjs';
import { MAX_DEV_PORT_RETRIES, portAvailable } from '../lib/dev-server/ports.mjs';
import { runDevServer } from '../lib/dev-server/server.mjs';
import { runnerOptions } from '../lib/runner-options.mjs';

const root = '/example/checkout';
const app = {
  id: 'sandbox',
  directory: root + '/apps/sandbox',
  hostname: '127.0.0.1',
  devPort: 3400,
};
const conflict = (port) =>
  `Failed to start server\nError: listen EADDRINUSE\ncode: 'EADDRINUSE', port: ${port}`;
const options = (args = [], environment = {}) =>
  devOptions(args, { environment, defaultApp: 'web' });

function recording(available) {
  const calls = [],
    logs = [];
  return {
    calls,
    logs,
    available: available ?? (async () => true),
    log: (line) => logs.push(line),
    run: async (commands) => {
      calls.push(commands);
      return 0;
    },
  };
}

test('development policy defaults to fallback, with strict explicit ports and CLI precedence', () => {
  assert.deepEqual(options(), { app: 'web', port: undefined, fallback: true });
  assert.deepEqual(options(['--app', 'template-plain-next']), {
    app: 'template-plain-next',
    port: undefined,
    fallback: true,
  });
  assert.deepEqual(options(['--port', '3401']), { app: 'web', port: 3401, fallback: false });
  assert.equal(options([], { APP_DEV_PORT: '3402' }).port, 3402);
  assert.equal(options([], { PORT: '3403' }).fallback, false);
  assert.equal(options([], { APP_DEV_PORT: '3402', PORT: '3403' }).port, 3402);
  assert.equal(options(['--port', '3404'], { APP_DEV_PORT: 'invalid', PORT: '3403' }).port, 3404);
  assert.equal(options(['--port', '3404', '--port-fallback']).fallback, true);
  assert.equal(options(['--port-fallback'], { APP_DEV_PORT: '3402' }).fallback, true);
  assert.equal(options([], { APP_DEV_PORT: '', PORT: '' }).fallback, true);
});

for (const args of [
  ['--port'],
  ['--port', '0'],
  ['--port', '65536'],
  ['--port', '12;echo'],
  ['--port', '3401', '--port', '3402'],
  ['--port-fallback', '--port-fallback'],
  ['--port-fallback=true'],
  ['--app', '--port', '3400', 'web'],
  ['--app', '--port-fallback', 'web'],
  ['--unknown'],
])
  test('invalid dev options fail before launch: ' + args.join(' '), () =>
    assert.throws(() => options(args))
  );

test('occupied preferred ports advance within a bounded range and log app, checkout and selected URL', async () => {
  const dependencies = recording(async (_host, port) => port >= app.devPort + 2);
  assert.equal(await runDevServer(root, app, options(), dependencies), 0);
  assert.equal(dependencies.calls.length, 1);
  assert.equal(dependencies.calls[0][0][1].at(-1), String(app.devPort + 2));
  assert.ok(dependencies.logs.some((line) => line.includes('[dev:sandbox] checkout: ' + root)));
  assert.ok(dependencies.logs.some((line) => line.includes('already in use; trying')));
  assert.ok(
    dependencies.logs.some((line) => line.endsWith('http://127.0.0.1:' + (app.devPort + 2)))
  );
});

test('an explicit occupied port fails without running the app; opt-in fallback still works', async () => {
  const dependencies = recording(async (_host, port) => port !== app.devPort);
  await assert.rejects(
    runDevServer(root, app, options(['--port', String(app.devPort)]), dependencies),
    /already in use/
  );
  assert.equal(dependencies.calls.length, 0);
  assert.equal(
    await runDevServer(
      root,
      app,
      options(['--port', String(app.devPort), '--port-fallback']),
      dependencies
    ),
    0
  );
  assert.equal(dependencies.calls[0][0][1].at(-1), String(app.devPort + 1));
});

test('fallback exhausts after ten retries and never overflows TCP port 65535', async () => {
  const seen = [];
  const dependencies = recording(async (_host, port) => {
    seen.push(port);
    return false;
  });
  await assert.rejects(
    runDevServer(root, app, options(), dependencies),
    /No available development port/
  );
  assert.equal(seen.length, MAX_DEV_PORT_RETRIES + 1);
  seen.length = 0;
  await assert.rejects(
    runDevServer(root, app, options(['--port', '65535', '--port-fallback']), dependencies),
    /65535–65535/
  );
  assert.deepEqual(seen, [65535]);
});

test('a bind race retries only the failed candidate, including chunked startup errors', async () => {
  const dependencies = recording();
  let attempts = 0;
  dependencies.run = async (commands, { onOutput }) => {
    dependencies.calls.push(commands);
    if (attempts++ === 0) {
      const text = conflict(app.devPort).replace('port:', '\u001b[33mport:\u001b[39m');
      onOutput(text.slice(0, 30));
      onOutput(text.slice(30));
      return 1;
    }
    return 0;
  };
  assert.equal(await runDevServer(root, app, options(), dependencies), 0);
  assert.deepEqual(
    dependencies.calls.map((call) => call[0][1].at(-1)),
    ['3400', '3401']
  );
  assert.ok(dependencies.logs.some((line) => line.includes('claimed by another process')));
});

for (const scenario of [
  { name: 'copy/compile error', code: 7, text: 'Copy is stale' },
  { name: 'unrelated runtime address', code: 1, text: conflict(app.devPort + 1) },
  { name: 'after Next readiness', code: 1, text: '✓ Ready in 120ms\n' + conflict(app.devPort) },
  { name: 'SIGINT', code: 130, text: conflict(app.devPort) },
  { name: 'SIGTERM', code: 143, text: conflict(app.devPort) },
])
  test('does not retry ' + scenario.name, async () => {
    const dependencies = recording();
    dependencies.run = async (commands, { onOutput }) => {
      dependencies.calls.push(commands);
      onOutput(scenario.text);
      return scenario.code;
    };
    assert.equal(await runDevServer(root, app, options(), dependencies), scenario.code);
    assert.equal(dependencies.calls.length, 1);
  });

test('explicit port remains strict even when another process wins after the probe', async () => {
  const dependencies = recording();
  dependencies.run = async (_commands, { onOutput }) => {
    onOutput(conflict(app.devPort));
    return 1;
  };
  assert.equal(await runDevServer(root, app, options(['--port', '3400']), dependencies), 1);
  assert.equal(dependencies.logs.filter((line) => line.includes('trying')).length, 0);
});

test('port probes detect real listeners and release their own temporary socket', async (context) => {
  const server = createServer();
  server.listen(0, app.hostname);
  await once(server, 'listening');
  context.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  assert.equal(await portAvailable(app.hostname, address.port), false);
  await new Promise((resolve) => server.close(resolve));
  assert.equal(await portAvailable(app.hostname, address.port), true);
  assert.equal(await portAvailable(app.hostname, address.port), true);
  await assert.rejects(portAvailable('256.256.256.256', address.port));
});

test('development-only options never enable fallback in the E2E runner', () => {
  for (const args of [['--port', '3400'], ['--port-fallback']])
    assert.throws(() => runnerOptions(args, { e2e: true }), /Unknown option/);
});
