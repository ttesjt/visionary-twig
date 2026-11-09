import { parsePort } from '../../../tooling/workspace-apps.ts';
import { runnerOptions } from '../runner-options.mjs';

/** CLI > APP_DEV_PORT > PORT > workspaceApp.devPort; explicit ports are strict. */
export function devOptions(args, { defaultApp, environment = process.env } = {}) {
  const remaining = [];
  let port;
  let data;
  let targetEnvironment;
  let fallback = false;
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === '--app') {
      remaining.push(value, args[++index]);
    } else if (value === '--data-environment' && targetEnvironment === undefined) {
      targetEnvironment = args[++index];
      if (!targetEnvironment || targetEnvironment.startsWith('--'))
        throw new Error('Expected data environment.');
    } else if (value === '--data' && data === undefined) {
      data = args[++index];
      if (!data || data.startsWith('--')) throw new Error('Expected data mode.');
    } else if (value === '--port' && port === undefined) {
      port = parsePort(args[++index], '--port');
    } else if (value === '--port-fallback' && !fallback) {
      fallback = true;
    } else remaining.push(value);
  }
  if (targetEnvironment !== undefined && data === undefined)
    throw new Error('--data-environment requires --data.');
  const { app, help } = runnerOptions(remaining, { defaultApp });
  if (port === undefined) {
    const key = environment.APP_DEV_PORT ? 'APP_DEV_PORT' : 'PORT';
    if (environment[key]) port = parsePort(environment[key], key);
  }
  return {
    app,
    port,
    fallback: fallback || port === undefined,
    ...(data === undefined ? {} : { data }),
    ...(targetEnvironment === undefined ? {} : { targetEnvironment }),
    ...(help ? { help } : {}),
  };
}
