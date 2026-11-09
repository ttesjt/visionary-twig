import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { discoverApps } from '../../tooling/workspace-apps.ts';
import { withVerificationInputs } from './verification-inputs.mjs';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';

/** Inject env files only in the newly generated, disposable verification project. */
export async function verifyTrackingIsolation(root, environment) {
  const ownedFiles = [];
  let requests = 0;
  const server = createServer((request, response) => {
    requests++;
    request.resume();
    response
      .writeHead(202, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      .end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const endpoint = 'http://127.0.0.1:' + address.port + '/unexpected-tracking';
  try {
    for (const app of discoverApps(root)) {
      for (const filename of ['.env.local', '.env.production.local']) {
        const target = path.join(app.directory, filename);
        // Never overwrite existing app configuration, even in a disposable clone.
        writeFileSync(
          target,
          'NEXT_PUBLIC_EVENT_TRACKING_URL=' + endpoint + '\nEVENT_TRACKING_URL=' + endpoint + '\n',
          { flag: 'wx' }
        );
        ownedFiles.push(target);
      }
    }
    const code = await runProcesses(
      [pnpmCommand(['test:e2e', '--all', '--grep', 'tracking|real SSR preview'])],
      {
        cwd: root,
        env: {
          ...environment,
          // Exercise both inherited process configuration and Next env-file loading.
          NEXT_PUBLIC_EVENT_TRACKING_URL: endpoint,
          EVENT_TRACKING_URL: endpoint,
          TEST_EVENT_TRACKING_URL: '',
        },
      }
    );
    assert.equal(code, 0, 'Tracking isolation browser regression failed.');
    assert.equal(requests, 0, 'Verification delivered tracking to an env-file endpoint.');
    console.log(
      'Tracking isolation verified: local env files cannot enable browser or Node delivery.'
    );
  } finally {
    for (const filename of ownedFiles) rmSync(filename);
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

/** Enable delivery only in a disposable clone; the browser intercepts the test endpoint. */
export async function verifyConfiguredTracking(root, appId, env) {
  const host = discoverApps(root).find((app) => app.id === appId);
  assert.ok(host, 'Missing tracking verification host: ' + appId);
  assert.ok(env.TEST_EVENT_TRACKING_URL, 'Tracking verification needs a test endpoint.');
  await withVerificationInputs([host.directory], async (inputs) => {
    inputs.createCustom(host.directory, { tracking: { enabled: true } });
    const run = async (args) => {
      const code = await runProcesses([pnpmCommand(args)], { cwd: root, env });
      assert.equal(code, 0, args.join(' '));
    };
    await run(['config:prepare', '--app', appId, '--source', 'custom']);
    const prepared = JSON.parse(
      readFileSync(path.join(host.directory, '.generated/config/app.json'), 'utf8')
    );
    assert.equal(
      prepared.tracking.enabled,
      true,
      'Delivery tests require an enabled site setting.'
    );
    await run(['test:e2e', '--app', appId, '--grep', 'tracking']);
  });
}
