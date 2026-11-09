import { parseOptions, TARGET_VALUES, TARGET_FLAGS } from '../workspace/options.mjs';
export function runnerOptions(args, { e2e = false, defaultApp } = {}) {
  const options = parseOptions(args, {
    values: [...TARGET_VALUES, ...(e2e ? ['--grep'] : [])],
    flags: e2e ? [...TARGET_FLAGS, '--production-defaults'] : ['--help'],
  });
  const all = !!options['--all'],
    includeTemplates = !!options['--include-templates'];
  const help = !!options['--help'];
  const app =
    options['--app'] ??
    (!all && !includeTemplates && !help
      ? typeof defaultApp === 'function'
        ? defaultApp()
        : defaultApp
      : undefined);
  if (app !== undefined && !/^[a-z][a-z0-9-]*$/.test(app))
    throw new Error('Expected an app ID after --app.');
  if (!app && !all && !includeTemplates && !help) throw new Error('Select --app <directory-id>.');
  const productionDefaults = !!options['--production-defaults'];
  if (productionDefaults && (all || includeTemplates))
    throw new Error('--production-defaults selects one app.');
  const grep = options['--grep'];
  if (grep !== undefined) new RegExp(grep);
  return {
    app,
    all,
    includeTemplates,
    help,
    productionDefaults,
    ...(grep === undefined ? {} : { grep }),
  };
}
// Defined empty values outrank framework .env files; test runners never inherit real tracking URLs.
export function trackingTestEnvironment(source) {
  return {
    ...source,
    NEXT_PUBLIC_EVENT_TRACKING_URL: source.TEST_EVENT_TRACKING_URL ?? '',
    EVENT_TRACKING_URL: '',
  };
}
export function browserEnvironment(source) {
  return trackingTestEnvironment(source);
}
