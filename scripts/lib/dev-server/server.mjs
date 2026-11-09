import { stripVTControlCharacters } from 'node:util';
import { appAddress, appFilter, MAX_TCP_PORT } from '../../../tooling/workspace-apps.ts';
import { pnpmCommand, runProcesses } from '../processes.mjs';
import { MAX_DEV_PORT_RETRIES, portAvailable } from './ports.mjs';

const MAX_STARTUP_LOG_CHARACTERS = 16_384;

function bindConflict(output, port) {
  return (
    output.includes('Failed to start server') &&
    /\bEADDRINUSE\b/u.test(output) &&
    new RegExp('\\bport:\\s*' + port + '\\b', 'u').test(output)
  );
}

/** Retry only startup address conflicts, never compile/copy/runtime failures. */
export async function runDevServer(
  root,
  app,
  options,
  { available = portAvailable, run = runProcesses, log = console.log } = {}
) {
  const preferred = options.port ?? app.devPort;
  const last = Math.min(MAX_TCP_PORT, preferred + (options.fallback ? MAX_DEV_PORT_RETRIES : 0));
  const prefix = '[dev:' + app.id + ']';
  log(prefix + ' checkout: ' + root);
  for (let port = preferred; port <= last; port++) {
    let reason = 'already in use';
    if (await available(app.hostname, port)) {
      const { baseURL } = appAddress(app, String(port));
      log(prefix + ' starting: ' + baseURL);
      let output = '';
      let ready = false;
      const code = await run(
        [
          pnpmCommand([
            '--filter',
            appFilter(root, app),
            'dev',
            '--hostname',
            app.hostname,
            '--port',
            String(port),
          ]),
        ],
        {
          cwd: root,
          onOutput(chunk) {
            if (ready) return;
            output = (output + stripVTControlCharacters(chunk)).slice(-MAX_STARTUP_LOG_CHARACTERS);
            // Next's CLI has no public structured readiness channel. Fail closed once ready.
            ready = /\bReady in\b/u.test(output);
          },
        }
      );
      if (code === 0 || code === 130 || code === 143 || ready || !bindConflict(output, port))
        return code;
      if (!options.fallback) return code;
      reason = 'claimed by another process during startup (EADDRINUSE)';
    } else if (!options.fallback) {
      throw new Error(
        'Port ' + port + ' is already in use. Use --port-fallback to allow another port.'
      );
    }
    if (port < last)
      log(
        prefix +
          ' port ' +
          port +
          ' ' +
          reason +
          '; trying ' +
          (port + 1) +
          ' (' +
          (port - preferred + 1) +
          '/' +
          MAX_DEV_PORT_RETRIES +
          ').'
      );
  }
  throw new Error('No available development port in ' + preferred + '–' + last + '.');
}
