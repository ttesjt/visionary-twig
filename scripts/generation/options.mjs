import path from 'node:path';
import { parseOptions } from '../workspace/options.mjs';
import { assertAppName, DEFAULT_APP_NAME, DEFAULT_APP_TEMPLATE } from '../templates/identities.mjs';

export function generationOptions(args, kind) {
  const repository = kind === 'repository';
  const values = repository
    ? ['--output', '--name', '--template', '--app-name']
    : ['--target', '--name', '--template'];
  const flags = [
    '--help',
    '--list',
    '--offline',
    '--no-verify',
    '--browser',
    ...(repository ? ['--bare'] : []),
  ];
  const raw = parseOptions(args, { values, flags });
  if (raw['--help'] || raw['--list']) return { help: !!raw['--help'], list: !!raw['--list'] };
  const destination = raw[repository ? '--output' : '--target'];
  if (!destination)
    throw new Error(
      repository
        ? 'Specify --output <new-directory>.'
        : 'Specify --target <existing-monorepo> and --name <app-name>.'
    );
  if (!repository && !raw['--name'])
    throw new Error(
      'Specify --name <app-name>; there is no default app name when adding a template.'
    );
  if (raw['--bare'] && (raw['--template'] || raw['--app-name'] || raw['--browser']))
    throw new Error('--bare cannot be combined with --template, --app-name or --browser.');
  if (raw['--browser'] && raw['--no-verify']) throw new Error('--browser requires verification.');
  const appName = repository ? (raw['--app-name'] ?? DEFAULT_APP_NAME) : raw['--name'];
  assertAppName(appName);
  return {
    destination: path.resolve(destination),
    ...(repository && raw['--name'] ? { name: raw['--name'] } : {}),
    appName,
    template: raw['--template'] ?? DEFAULT_APP_TEMPLATE,
    bare: !!raw['--bare'],
    offline: !!raw['--offline'],
    verify: !raw['--no-verify'],
    browser: !!raw['--browser'],
  };
}
