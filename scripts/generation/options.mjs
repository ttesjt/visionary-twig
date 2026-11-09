import path from 'node:path';
import { parseOptions } from '../workspace/options.mjs';
import {
  assertAppName,
  DEFAULT_APP_NAME,
  DEFAULT_APP_TEMPLATE,
  DEFAULT_LIBRARY_TEMPLATE,
} from '../templates/identities.mjs';

export function generationOptions(args, kind) {
  const library = kind === 'library';
  const repository = kind === 'repository' || library;
  const values = library
    ? ['--output', '--name', '--template']
    : repository
      ? ['--output', '--name', '--template', '--app-name']
      : ['--target', '--name', '--template'];
  const flags = [
    '--help',
    '--list',
    '--offline',
    '--no-verify',
    ...(!library ? ['--browser'] : []),
    ...(repository && !library ? ['--bare'] : []),
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
  if (!library) assertAppName(appName);
  return {
    destination: path.resolve(destination),
    ...(repository && raw['--name'] ? { name: raw['--name'] } : {}),
    ...(!library ? { appName } : {}),
    template: raw['--template'] ?? (library ? DEFAULT_LIBRARY_TEMPLATE : DEFAULT_APP_TEMPLATE),
    ...(library ? { kind: 'library' } : {}),
    bare: !!raw['--bare'],
    offline: !!raw['--offline'],
    verify: !raw['--no-verify'],
    browser: !!raw['--browser'],
  };
}
