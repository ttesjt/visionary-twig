import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { isIP } from 'node:net';
import path from 'node:path';

export interface WorkspaceApp {
  readonly id: string;
  readonly directory: string;
  readonly devPort: number;
  readonly testPort: number;
  readonly testConfig: string;
  readonly hostname: string;
  readonly devHook?: string;
  readonly testHook?: string;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const MAX_TCP_PORT = 65535;

export function parsePort(value: unknown, label: string): number {
  const raw = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  const port = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(port) || port > MAX_TCP_PORT) {
    throw new Error(`${label} must be an integer from 1 to 65535.`);
  }
  return port;
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function parseWorkspaceApp(
  root: string,
  directory: string,
  value: unknown,
  id = path.basename(directory)
): WorkspaceApp {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('Invalid workspace app ID.');
  if (!object(value)) throw new Error(`${id}: declare workspaceApp metadata.`);
  const { hostname, testConfig } = value;
  if (
    typeof hostname !== 'string' ||
    !hostname ||
    (!/^[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*$/.test(hostname) && !isIP(hostname))
  ) {
    throw new Error(`${id}: workspaceApp.hostname must be a hostname or IP address.`);
  }
  if (typeof testConfig !== 'string' || !testConfig || path.isAbsolute(testConfig)) {
    throw new Error(`${id}: workspaceApp.testConfig must be an app-relative file.`);
  }
  const resolved = path.resolve(directory, testConfig);
  if (
    !inside(root, resolved) ||
    !existsSync(resolved) ||
    !statSync(resolved).isFile() ||
    !inside(realpathSync(root), realpathSync(resolved))
  ) {
    throw new Error(`${id}: workspaceApp.testConfig must exist inside the repository.`);
  }
  const hooks: { devHook?: string; testHook?: string } = {};
  for (const key of ['devHook', 'testHook'] as const) {
    const hook = value[key];
    if (hook === undefined) continue;
    if (typeof hook !== 'string' || path.isAbsolute(hook)) throw new Error(id + ': invalid ' + key);
    const file = path.resolve(directory, hook);
    if (
      !inside(root, file) ||
      !existsSync(file) ||
      !statSync(file).isFile() ||
      !inside(realpathSync(root), realpathSync(file))
    )
      throw new Error(id + ': ' + key + ' must be a file inside the repository.');
    hooks[key] = hook;
  }
  return {
    ...hooks,
    id,
    directory,
    hostname,
    testConfig: resolved,
    devPort: parsePort(value.devPort, `${id}: workspaceApp.devPort`),
    testPort: parsePort(value.testPort, `${id}: workspaceApp.testPort`),
  };
}

function discoverAt(root: string, parent: string, prefix = ''): readonly WorkspaceApp[] {
  const directory = path.join(root, parent);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    const file = path.join(target, 'package.json');
    if (!entry.isDirectory() || !existsSync(file)) return [];
    const manifest: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return object(manifest) && manifest.workspaceKind === 'next-app'
      ? [parseWorkspaceApp(root, target, manifest.workspaceApp, prefix + entry.name)]
      : [];
  });
}
export function discoverApps(root: string): readonly WorkspaceApp[] {
  return discoverAt(root, 'apps');
}
export function discoverTemplateApps(root: string): readonly WorkspaceApp[] {
  return discoverAt(root, 'packages/templates', 'template-');
}
export function selectApp(root: string, id: string): WorkspaceApp {
  const app =
    discoverApps(root).find((entry) => entry.id === id) ??
    discoverTemplateApps(root).find((entry) => entry.id === id);
  if (!app)
    throw new Error(
      `Unknown workspace app: ${id}. Available: ${[...discoverApps(root), ...discoverTemplateApps(root)].map((entry) => entry.id).join(', ') || '(none)'}.`
    );
  return app;
}
export function appFilter(root: string, app: WorkspaceApp): string {
  return './' + path.relative(root, app.directory).split(path.sep).join('/');
}

export function appAddress(
  app: WorkspaceApp,
  override?: string
): { port: number; baseURL: string } {
  const port = parsePort(override ?? app.testPort, 'PLAYWRIGHT_PORT');
  const host = isIP(app.hostname) === 6 ? `[${app.hostname}]` : app.hostname;
  return { port, baseURL: `http://${host}:${port}` };
}

export function defaultApp(root: string): string {
  const manifest: unknown = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const apps = discoverApps(root);
  const id = object(manifest)
    ? (manifest.workspaceDefaultApp ?? (apps.length === 1 ? apps[0]?.id : undefined))
    : undefined;
  if (id === undefined)
    throw new Error(
      'Choose --app <directory-id> or declare workspaceDefaultApp. Available: ' +
        apps.map((app) => app.id).join(', ')
    );
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/u.test(id))
    throw new Error('Invalid default app ID.');
  return id;
}

/** One declaration source for lifecycle, checks, bootstrap and clone hooks. */
export const PREPARED_INPUT_CAPABILITIES = [
  {
    flag: 'workspaceTextResources',
    kind: 'text',
    configuration: 'text-resources.config.ts',
    defaults: ['content/default/text'],
  },
  {
    flag: 'workspaceContentResources',
    kind: 'content',
    configuration: 'content-resources.config.ts',
    // Namespace definitions own their paths; no conventional directory is mandatory.
    defaults: [],
  },
  {
    flag: 'workspaceAppConfig',
    kind: 'config',
    configuration: 'config.config.ts',
    // Input paths belong to the format adapter and are validated by app:check.
    defaults: [],
  },
] as const;
export function preparedInputKinds(
  manifest: unknown
): readonly (typeof PREPARED_INPUT_CAPABILITIES)[number]['kind'][] {
  if (!object(manifest)) return [];
  return PREPARED_INPUT_CAPABILITIES.filter(({ flag }) => manifest[flag] === true).map(
    ({ kind }) => kind
  );
}
export function usesPreparedInputs(manifest: unknown): boolean {
  return preparedInputKinds(manifest).length > 0;
}
